-- =====================================================================
-- BARBER PRO — Migração 003 (Financeiro)
-- Vendas, formas de pagamento com taxa, comissões, despesas, caixa
-- e relatórios.
--
-- REGRA DE OURO DOS PAPÉIS (garantida pelo banco, não pela tela):
--   DONO     → vê tudo (faturamento, comissões de todos, despesas, relatórios)
--   RECEPÇÃO → registra vendas e vê SÓ as vendas de HOJE. Nada de mês,
--              relatório, comissão ou despesa.
--   BARBEIRO → vê só as vendas/comissões DELE. Nada de faturamento geral.
--
-- SEGURO: não apaga dados. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Fuso da barbearia (para "hoje" ser o hoje do Brasil, não o de Londres)
-- ---------------------------------------------------------------------
alter table public.barbearias
  add column if not exists fuso text not null default 'America/Sao_Paulo';

-- converte um horário para a data local da barbearia
create or replace function public.data_local(b uuid, ts timestamptz)
returns date language sql stable security definer set search_path = public as $$
  select (ts at time zone coalesce(
           (select x.fuso from public.barbearias x where x.id = b), 'America/Sao_Paulo'))::date;
$$;

create or replace function public.hoje_barbearia(b uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce(
           (select x.fuso from public.barbearias x where x.id = b), 'America/Sao_Paulo'))::date;
$$;

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Taxas das maquininhas e configurações de dinheiro
create table if not exists public.config_financeiro (
  barbearia_id   uuid primary key references public.barbearias(id) on delete cascade,
  taxa_debito    numeric(5,2) not null default 1.99,
  taxa_credito   numeric(5,2) not null default 3.99,
  taxa_pix       numeric(5,2) not null default 0,
  taxa_dinheiro  numeric(5,2) not null default 0,
  atualizado_em  timestamptz not null default now()
);

-- Uma venda = um pagamento (pode ter vários itens)
create table if not exists public.vendas (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references public.barbearias(id) on delete cascade,
  cliente_id      uuid references public.clientes(id) on delete set null,
  cliente_nome    text,
  barbeiro_id     uuid references public.barbeiros(id) on delete set null, -- quem atendeu (principal)
  agendamento_id  uuid references public.agendamentos(id) on delete set null,
  caixa_id        uuid,
  forma_pagamento text not null default 'dinheiro'
                  check (forma_pagamento in ('dinheiro','pix','debito','credito')),
  valor_bruto     numeric(10,2) not null default 0 check (valor_bruto >= 0),
  desconto        numeric(10,2) not null default 0 check (desconto >= 0),
  valor_taxa      numeric(10,2) not null default 0,
  valor_liquido   numeric(10,2) not null default 0,
  comissao_total  numeric(10,2) not null default 0,
  observacao      text,
  data            timestamptz not null default now(),
  criado_por      uuid references auth.users(id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index if not exists vendas_barbearia_data_idx on public.vendas(barbearia_id, data desc);
create index if not exists vendas_barbeiro_idx on public.vendas(barbeiro_id, data desc);

-- Itens da venda (serviços feitos, produtos, valores avulsos)
create table if not exists public.venda_itens (
  id            uuid primary key default gen_random_uuid(),
  venda_id      uuid not null references public.vendas(id) on delete cascade,
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  servico_id    uuid references public.servicos(id) on delete set null,
  barbeiro_id   uuid references public.barbeiros(id) on delete set null,
  descricao     text not null,
  quantidade    int not null default 1 check (quantidade > 0),
  preco_unit    numeric(10,2) not null default 0 check (preco_unit >= 0),
  comissao_pct  numeric(5,2) not null default 0,
  comissao_valor numeric(10,2) not null default 0,
  criado_em     timestamptz not null default now()
);
create index if not exists venda_itens_venda_idx on public.venda_itens(venda_id);
create index if not exists venda_itens_barbeiro_idx on public.venda_itens(barbeiro_id);

-- Contas que a barbearia paga
create table if not exists public.despesas (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  descricao     text not null,
  categoria     text not null default 'outros',
  valor         numeric(10,2) not null check (valor >= 0),
  data          date not null default current_date,
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now()
);
create index if not exists despesas_barbearia_idx on public.despesas(barbearia_id, data desc);

-- Abertura e fechamento do caixa do dia (bater caixa)
create table if not exists public.caixas (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references public.barbearias(id) on delete cascade,
  dia             date not null,
  valor_abertura  numeric(10,2) not null default 0,
  valor_contado   numeric(10,2),
  valor_esperado  numeric(10,2),
  diferenca       numeric(10,2),
  observacao      text,
  aberto_em       timestamptz not null default now(),
  fechado_em      timestamptz,
  aberto_por      uuid references auth.users(id) on delete set null,
  fechado_por     uuid references auth.users(id) on delete set null,
  unique (barbearia_id, dia)
);

-- ---------------------------------------------------------------------
-- 2. CÁLCULOS AUTOMÁTICOS (taxa da maquininha e comissão)
-- ---------------------------------------------------------------------

-- Comissão do item: usa o % do barbeiro na hora da venda (fica congelado).
create or replace function public.tg_item_calcula_comissao()
returns trigger language plpgsql security definer set search_path = public as $$
declare pct numeric(5,2);
begin
  if new.barbeiro_id is null then
    new.comissao_pct := 0; new.comissao_valor := 0;
    return new;
  end if;
  if tg_op = 'INSERT' and (new.comissao_pct is null or new.comissao_pct = 0) then
    select b.comissao_pct into pct from public.barbeiros b where b.id = new.barbeiro_id;
    new.comissao_pct := coalesce(pct, 0);
  end if;
  new.comissao_valor := round(new.preco_unit * new.quantidade * new.comissao_pct / 100, 2);
  return new;
end $$;

drop trigger if exists item_calcula_comissao on public.venda_itens;
create trigger item_calcula_comissao before insert or update on public.venda_itens
  for each row execute function public.tg_item_calcula_comissao();

-- Recalcula os totais da venda sempre que um item entra/sai/muda.
create or replace function public.tg_venda_recalcula()
returns trigger language plpgsql security definer set search_path = public as $$
declare vid uuid;
begin
  vid := coalesce(new.venda_id, old.venda_id);
  update public.vendas v
     set valor_bruto = coalesce(t.bruto, 0),
         comissao_total = coalesce(t.comissao, 0)
    from (select sum(i.preco_unit * i.quantidade) as bruto,
                 sum(i.comissao_valor) as comissao
            from public.venda_itens i where i.venda_id = vid) t
   where v.id = vid;
  return null;
end $$;

drop trigger if exists venda_recalcula on public.venda_itens;
create trigger venda_recalcula after insert or update or delete on public.venda_itens
  for each row execute function public.tg_venda_recalcula();

-- Taxa da maquininha e valor líquido da venda.
create or replace function public.tg_venda_calcula_taxa()
returns trigger language plpgsql security definer set search_path = public as $$
declare pct numeric(5,2);
begin
  select case new.forma_pagamento
           when 'debito'   then c.taxa_debito
           when 'credito'  then c.taxa_credito
           when 'pix'      then c.taxa_pix
           else c.taxa_dinheiro
         end into pct
    from public.config_financeiro c where c.barbearia_id = new.barbearia_id;

  pct := coalesce(pct, 0);
  new.valor_taxa := round(greatest(new.valor_bruto - new.desconto, 0) * pct / 100, 2);
  new.valor_liquido := round(greatest(new.valor_bruto - new.desconto, 0) - new.valor_taxa, 2);
  return new;
end $$;

drop trigger if exists venda_calcula_taxa on public.vendas;
create trigger venda_calcula_taxa before insert or update on public.vendas
  for each row execute function public.tg_venda_calcula_taxa();

-- Toda barbearia nasce com a configuração financeira padrão.
create or replace function public.tg_barbearia_config_financeiro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.config_financeiro (barbearia_id) values (new.id)
  on conflict (barbearia_id) do nothing;
  return new;
end $$;

drop trigger if exists barbearia_config_financeiro on public.barbearias;
create trigger barbearia_config_financeiro after insert on public.barbearias
  for each row execute function public.tg_barbearia_config_financeiro();

-- Preenche para quem já existia (não apaga nada).
insert into public.config_financeiro (barbearia_id)
select b.id from public.barbearias b
  left join public.config_financeiro c on c.barbearia_id = b.id
 where c.barbearia_id is null;

-- ---------------------------------------------------------------------
-- 3. RLS POR PAPEL
-- ---------------------------------------------------------------------
alter table public.config_financeiro enable row level security;
alter table public.vendas            enable row level security;
alter table public.venda_itens       enable row level security;
alter table public.despesas          enable row level security;
alter table public.caixas            enable row level security;

-- --- config financeiro: todos da casa leem (para calcular), só dono altera
drop policy if exists config_fin_select on public.config_financeiro;
create policy config_fin_select on public.config_financeiro
  for select to authenticated
  using (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin());

drop policy if exists config_fin_write on public.config_financeiro;
create policy config_fin_write on public.config_financeiro
  for all to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());

-- --- VENDAS: aqui mora a regra dos papéis
drop policy if exists vendas_select on public.vendas;
create policy vendas_select on public.vendas
  for select to authenticated
  using (
    public.sou_admin()
    or (barbearia_id in (select public.minhas_barbearias()) and (
         public.meu_papel(barbearia_id) = 'dono'
      -- recepção: SÓ o que foi vendido hoje (zera todo dia)
      or (public.meu_papel(barbearia_id) = 'recepcao'
          and public.data_local(barbearia_id, data) = public.hoje_barbearia(barbearia_id))
      -- barbeiro: só o que passou pela mão dele
      or (public.meu_papel(barbearia_id) = 'barbeiro' and (
            barbeiro_id = public.meu_barbeiro_id(barbearia_id)
            or exists (select 1 from public.venda_itens i
                        where i.venda_id = vendas.id
                          and i.barbeiro_id = public.meu_barbeiro_id(barbearia_id))))
    ))
  );

-- registrar venda: dono, recepção e barbeiro podem
drop policy if exists vendas_insert on public.vendas;
create policy vendas_insert on public.vendas
  for insert to authenticated
  with check (barbearia_id in (select public.minhas_barbearias()));

-- corrigir/apagar venda: só o dono
drop policy if exists vendas_update on public.vendas;
create policy vendas_update on public.vendas
  for update to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());

drop policy if exists vendas_delete on public.vendas;
create policy vendas_delete on public.vendas
  for delete to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin());

-- --- ITENS: seguem a venda; barbeiro só enxerga os itens dele
drop policy if exists venda_itens_select on public.venda_itens;
create policy venda_itens_select on public.venda_itens
  for select to authenticated
  using (
    public.sou_admin()
    or (barbearia_id in (select public.minhas_barbearias()) and (
         public.meu_papel(barbearia_id) in ('dono','recepcao')
      or barbeiro_id = public.meu_barbeiro_id(barbearia_id)))
  );

drop policy if exists venda_itens_insert on public.venda_itens;
create policy venda_itens_insert on public.venda_itens
  for insert to authenticated
  with check (barbearia_id in (select public.minhas_barbearias()));

drop policy if exists venda_itens_escrita on public.venda_itens;
create policy venda_itens_escrita on public.venda_itens
  for all to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());

-- --- DESPESAS: assunto de dono
drop policy if exists despesas_dono on public.despesas;
create policy despesas_dono on public.despesas
  for all to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());

-- --- CAIXA: quem fica no balcão fecha o caixa (dono e recepção)
drop policy if exists caixas_balcao on public.caixas;
create policy caixas_balcao on public.caixas
  for all to authenticated
  using (
    public.sou_admin()
    or (barbearia_id in (select public.minhas_barbearias())
        and public.meu_papel(barbearia_id) in ('dono','recepcao'))
  )
  with check (
    public.sou_admin()
    or (barbearia_id in (select public.minhas_barbearias())
        and public.meu_papel(barbearia_id) in ('dono','recepcao'))
  );

-- ---------------------------------------------------------------------
-- 4. RELATÓRIOS (funções que já checam o papel no servidor)
-- ---------------------------------------------------------------------

-- Vendas de hoje — permitido para dono, recepção e barbeiro (o barbeiro só vê
-- o que é dele, porque a consulta passa pela RLS).
create or replace function public.vendas_de_hoje(p_barbearia uuid)
returns json language plpgsql stable security invoker set search_path = public as $$
declare hoje date; r json;
begin
  if p_barbearia not in (select public.minhas_barbearias()) then
    raise exception 'Sem permissão.';
  end if;
  hoje := public.hoje_barbearia(p_barbearia);
  select json_build_object(
    'quantidade', count(*),
    'total', coalesce(sum(v.valor_bruto - v.desconto), 0),
    'dinheiro', coalesce(sum(case when v.forma_pagamento = 'dinheiro' then v.valor_bruto - v.desconto end), 0),
    'pix', coalesce(sum(case when v.forma_pagamento = 'pix' then v.valor_bruto - v.desconto end), 0),
    'debito', coalesce(sum(case when v.forma_pagamento = 'debito' then v.valor_bruto - v.desconto end), 0),
    'credito', coalesce(sum(case when v.forma_pagamento = 'credito' then v.valor_bruto - v.desconto end), 0)
  ) into r
  from public.vendas v
  where v.barbearia_id = p_barbearia
    and public.data_local(p_barbearia, v.data) = hoje;
  return r;
end $$;

-- Resumo do período — SÓ DONO.
create or replace function public.resumo_financeiro(p_barbearia uuid, p_de date, p_ate date)
returns json language plpgsql stable security invoker set search_path = public as $$
declare r json;
begin
  if coalesce(public.meu_papel(p_barbearia), '') <> 'dono' and not public.sou_admin() then
    raise exception 'Só o dono da barbearia vê o financeiro completo.';
  end if;
  select json_build_object(
    'bruto',     coalesce(sum(v.valor_bruto - v.desconto), 0),
    'taxas',     coalesce(sum(v.valor_taxa), 0),
    'liquido',   coalesce(sum(v.valor_liquido), 0),
    'comissoes', coalesce(sum(v.comissao_total), 0),
    'vendas',    count(*),
    'ticket',    coalesce(round(avg(v.valor_bruto - v.desconto), 2), 0),
    'despesas',  (select coalesce(sum(d.valor), 0) from public.despesas d
                   where d.barbearia_id = p_barbearia and d.data between p_de and p_ate),
    'por_pagamento', (
       select coalesce(json_agg(x), '[]'::json) from (
         select forma_pagamento as forma, sum(valor_bruto - desconto) as total, count(*) as qtd
           from public.vendas
          where barbearia_id = p_barbearia and data >= p_de and data < p_ate + 1
          group by forma_pagamento order by 2 desc) x)
  ) into r
  from public.vendas v
  where v.barbearia_id = p_barbearia and v.data >= p_de and v.data < p_ate + 1;
  return r;
end $$;

-- Ranking dos barbeiros — SÓ DONO.
create or replace function public.ranking_barbeiros(p_barbearia uuid, p_de date, p_ate date)
returns json language plpgsql stable security invoker set search_path = public as $$
declare r json;
begin
  if coalesce(public.meu_papel(p_barbearia), '') <> 'dono' and not public.sou_admin() then
    raise exception 'Só o dono da barbearia vê o ranking.';
  end if;
  select coalesce(json_agg(x order by x.total desc), '[]'::json) into r from (
    select b.nome, b.cor,
           count(distinct i.venda_id) as atendimentos,
           coalesce(sum(i.preco_unit * i.quantidade), 0) as total,
           coalesce(sum(i.comissao_valor), 0) as comissao
      from public.venda_itens i
      join public.vendas v on v.id = i.venda_id
      join public.barbeiros b on b.id = i.barbeiro_id
     where i.barbearia_id = p_barbearia and v.data >= p_de and v.data < p_ate + 1
     group by b.id, b.nome, b.cor) x;
  return r;
end $$;

-- Serviços mais vendidos — SÓ DONO.
create or replace function public.servicos_mais_vendidos(p_barbearia uuid, p_de date, p_ate date)
returns json language plpgsql stable security invoker set search_path = public as $$
declare r json;
begin
  if coalesce(public.meu_papel(p_barbearia), '') <> 'dono' and not public.sou_admin() then
    raise exception 'Só o dono da barbearia vê os relatórios.';
  end if;
  select coalesce(json_agg(x order by x.qtd desc), '[]'::json) into r from (
    select i.descricao as nome, sum(i.quantidade) as qtd,
           sum(i.preco_unit * i.quantidade) as total
      from public.venda_itens i
      join public.vendas v on v.id = i.venda_id
     where i.barbearia_id = p_barbearia and v.data >= p_de and v.data < p_ate + 1
     group by i.descricao limit 15) x;
  return r;
end $$;

-- Horários de pico (pelos agendamentos) — SÓ DONO.
create or replace function public.horarios_pico(p_barbearia uuid, p_de date, p_ate date)
returns json language plpgsql stable security invoker set search_path = public as $$
declare r json; fuso text;
begin
  if coalesce(public.meu_papel(p_barbearia), '') <> 'dono' and not public.sou_admin() then
    raise exception 'Só o dono da barbearia vê os relatórios.';
  end if;
  select coalesce(b.fuso, 'America/Sao_Paulo') into fuso from public.barbearias b where b.id = p_barbearia;
  select coalesce(json_agg(x order by x.hora), '[]'::json) into r from (
    select extract(hour from (a.inicio at time zone fuso))::int as hora, count(*) as qtd
      from public.agendamentos a
     where a.barbearia_id = p_barbearia and a.status <> 'cancelado'
       and a.inicio >= p_de and a.inicio < p_ate + 1
     group by 1) x;
  return r;
end $$;

-- Comissões: o barbeiro vê as dele; o dono vê de quem quiser.
create or replace function public.minhas_comissoes(p_barbearia uuid, p_de date, p_ate date,
                                                   p_barbeiro uuid default null)
returns json language plpgsql stable security invoker set search_path = public as $$
declare alvo uuid; papel text; r json;
begin
  papel := public.meu_papel(p_barbearia);
  if papel is null then raise exception 'Sem permissão.'; end if;

  if papel = 'dono' then
    alvo := coalesce(p_barbeiro, public.meu_barbeiro_id(p_barbearia));
  else
    alvo := public.meu_barbeiro_id(p_barbearia);   -- ignora o que vier do navegador
    if alvo is null then raise exception 'Seu login ainda não está ligado a um barbeiro.'; end if;
  end if;

  select json_build_object(
    'atendimentos', count(distinct i.venda_id),
    'produzido',    coalesce(sum(i.preco_unit * i.quantidade), 0),
    'comissao',     coalesce(sum(i.comissao_valor), 0),
    'itens', (
      select coalesce(json_agg(y order by y.data desc), '[]'::json) from (
        select v.data, i.descricao, i.quantidade,
               i.preco_unit * i.quantidade as valor, i.comissao_valor as comissao
          from public.venda_itens i join public.vendas v on v.id = i.venda_id
         where i.barbearia_id = p_barbearia and i.barbeiro_id = alvo
           and v.data >= p_de and v.data < p_ate + 1
         order by v.data desc limit 200) y)
  ) into r
  from public.venda_itens i join public.vendas v on v.id = i.venda_id
  where i.barbearia_id = p_barbearia and i.barbeiro_id = alvo
    and v.data >= p_de and v.data < p_ate + 1;
  return r;
end $$;

-- Fechamento de caixa: quanto de dinheiro vivo deveria ter na gaveta.
create or replace function public.esperado_em_caixa(p_barbearia uuid, p_dia date)
returns numeric language plpgsql stable security invoker set search_path = public as $$
declare papel text; total numeric;
begin
  papel := public.meu_papel(p_barbearia);
  if papel not in ('dono','recepcao') then raise exception 'Sem permissão.'; end if;
  select coalesce(sum(v.valor_bruto - v.desconto), 0) into total
    from public.vendas v
   where v.barbearia_id = p_barbearia and v.forma_pagamento = 'dinheiro'
     and public.data_local(p_barbearia, v.data) = p_dia;
  return total;
end $$;

grant execute on function
  public.hoje_barbearia(uuid), public.data_local(uuid, timestamptz), public.vendas_de_hoje(uuid),
  public.resumo_financeiro(uuid, date, date), public.ranking_barbeiros(uuid, date, date),
  public.servicos_mais_vendidos(uuid, date, date), public.horarios_pico(uuid, date, date),
  public.minhas_comissoes(uuid, date, date, uuid), public.esperado_em_caixa(uuid, date)
  to authenticated;
