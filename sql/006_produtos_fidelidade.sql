-- =====================================================================
-- BARBER PRO — Migração 006
-- Produtos para revenda (com baixa de estoque) e cartão fidelidade.
--
-- SEGURO: não apaga dados. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists public.produtos (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  nome          text not null,
  preco         numeric(10,2) not null default 0 check (preco >= 0),
  custo         numeric(10,2) not null default 0 check (custo >= 0),
  estoque       int not null default 0,
  estoque_min   int not null default 0,
  comissao_pct  numeric(5,2),          -- se vazio, usa a comissão do barbeiro
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);
create index if not exists produtos_barbearia_idx on public.produtos(barbearia_id);

alter table public.venda_itens
  add column if not exists produto_id uuid references public.produtos(id) on delete set null;

-- Movimentações de estoque (entrada de compra, saída de venda, ajuste)
create table if not exists public.estoque_mov (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  produto_id    uuid not null references public.produtos(id) on delete cascade,
  quantidade    int not null,                        -- positivo entra, negativo sai
  motivo        text not null default 'venda',
  venda_id      uuid references public.vendas(id) on delete set null,
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now()
);
create index if not exists estoque_mov_produto_idx on public.estoque_mov(produto_id, criado_em desc);

-- Vendeu produto? baixa o estoque. Cancelou a venda? devolve.
create or replace function public.tg_item_baixa_estoque()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.produto_id is not null then
    update public.produtos set estoque = estoque - new.quantidade where id = new.produto_id;
    insert into public.estoque_mov (barbearia_id, produto_id, quantidade, motivo, venda_id)
    values (new.barbearia_id, new.produto_id, -new.quantidade, 'venda', new.venda_id);
  elsif tg_op = 'DELETE' and old.produto_id is not null then
    update public.produtos set estoque = estoque + old.quantidade where id = old.produto_id;
    insert into public.estoque_mov (barbearia_id, produto_id, quantidade, motivo, venda_id)
    values (old.barbearia_id, old.produto_id, old.quantidade, 'estorno', old.venda_id);
  end if;
  return null;
end $$;

drop trigger if exists item_baixa_estoque on public.venda_itens;
create trigger item_baixa_estoque after insert or delete on public.venda_itens
  for each row execute function public.tg_item_baixa_estoque();

-- Comissão de produto pode ter percentual próprio.
create or replace function public.tg_item_calcula_comissao()
returns trigger language plpgsql security definer set search_path = public as $$
declare pct numeric(5,2);
begin
  if new.barbeiro_id is null then
    new.comissao_pct := 0; new.comissao_valor := 0;
    return new;
  end if;
  if tg_op = 'INSERT' and (new.comissao_pct is null or new.comissao_pct = 0) then
    if new.produto_id is not null then
      select p.comissao_pct into pct from public.produtos p where p.id = new.produto_id;
    end if;
    if pct is null then
      select b.comissao_pct into pct from public.barbeiros b where b.id = new.barbeiro_id;
    end if;
    new.comissao_pct := coalesce(pct, 0);
  end if;
  new.comissao_valor := round(new.preco_unit * new.quantidade * new.comissao_pct / 100, 2);
  return new;
end $$;

alter table public.produtos    enable row level security;
alter table public.estoque_mov enable row level security;

-- Todo mundo da casa vê os produtos (para vender); só o dono cadastra/edita.
drop policy if exists produtos_select on public.produtos;
create policy produtos_select on public.produtos
  for select to authenticated
  using (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin());

drop policy if exists produtos_dono on public.produtos;
create policy produtos_dono on public.produtos
  for all to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());

drop policy if exists estoque_mov_dono on public.estoque_mov;
create policy estoque_mov_dono on public.estoque_mov
  for select to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin());

-- ---------------------------------------------------------------------
-- 2. CARTÃO FIDELIDADE ("a cada 10 cortes, 1 grátis")
-- ---------------------------------------------------------------------
alter table public.barbearias
  add column if not exists fidelidade_ativa boolean not null default false,
  add column if not exists fidelidade_meta  int not null default 10 check (fidelidade_meta between 2 and 50);

-- Marca quando o cliente resgatou o corte grátis (zera a contagem dali pra frente).
create table if not exists public.fidelidade_resgates (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  resgatado_em  timestamptz not null default now(),
  criado_por    uuid references auth.users(id) on delete set null
);
create index if not exists fidelidade_cliente_idx on public.fidelidade_resgates(cliente_id, resgatado_em desc);

alter table public.fidelidade_resgates enable row level security;
drop policy if exists fidelidade_tenant on public.fidelidade_resgates;
create policy fidelidade_tenant on public.fidelidade_resgates
  for all to authenticated
  using (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin())
  with check (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin());

-- Quantos cortes o cliente já tem no cartão desde o último resgate.
create or replace function public.fidelidade_cliente(p_cliente uuid)
returns json language plpgsql stable security invoker set search_path = public as $$
declare bid uuid; meta int; ativa boolean; ultimo timestamptz; qtd int;
begin
  select c.barbearia_id into bid from public.clientes c where c.id = p_cliente;
  if bid is null or bid not in (select public.minhas_barbearias()) then
    raise exception 'Sem permissão.';
  end if;
  select b.fidelidade_meta, b.fidelidade_ativa into meta, ativa
    from public.barbearias b where b.id = bid;

  select max(r.resgatado_em) into ultimo
    from public.fidelidade_resgates r where r.cliente_id = p_cliente;

  select count(*) into qtd from public.agendamentos a
   where a.cliente_id = p_cliente and a.status = 'atendido'
     and (ultimo is null or a.inicio > ultimo);

  return json_build_object('ativa', ativa, 'meta', meta, 'quantidade', qtd,
                           'faltam', greatest(meta - qtd, 0),
                           'premiado', qtd >= meta, 'ultimo_resgate', ultimo);
end $$;

grant execute on function public.fidelidade_cliente(uuid) to authenticated;
