-- =====================================================================
--  ██████╗  █████╗ ██████╗ ██████╗ ███████╗██████╗   ██████╗ ██████╗  ██████╗
--  ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗  ██╔══██╗██╔══██╗██╔═══██╗
--  ██████╔╝███████║██████╔╝██████╔╝█████╗  ██████╔╝  ██████╔╝██████╔╝██║   ██║
--  ██╔══██╗██╔══██║██╔══██╗██╔══██╗██╔══╝  ██╔══██╗  ██╔═══╝ ██╔══██╗██║   ██║
--  ██████╔╝██║  ██║██║  ██║██████╔╝███████╗██║  ██║  ██║     ██║  ██║╚██████╔╝
--
--  ARQUIVO ÚNICO — RODE ESTE E ACABOU.
--
--  Como usar:
--    1. Supabase → SQL Editor → New query
--    2. Cole TUDO isto (Ctrl+A, Ctrl+C daqui; Ctrl+V lá)
--    3. Clique em RUN e espere aparecer "Success"
--
--  É seguro: não apaga nenhum dado seu e pode ser rodado quantas vezes
--  quiser. Ele junta, na ordem certa, as migrações 001 a 007:
--
--    001  agenda, clientes, barbeiros, serviços + isolamento (RLS)
--    002  trava contra "barbearia fantasma" de funcionário
--    003  financeiro: vendas, taxas, comissões, despesas, caixa, relatórios
--    004  equipe (logins) e notificações push
--    005  link público de auto-agendamento
--    006  produtos com estoque e cartão fidelidade
--    007  assinatura e painel do administrador do site
--
--  DEPOIS DE RODAR, faça você virar administrador do site (troque o e-mail):
--
--    insert into public.admin_users (user_id)
--    select id from auth.users where email = 'seu@email.com'
--    on conflict do nothing;
--
--  Gerado automaticamente a partir dos arquivos em sql/. Não edite este
--  arquivo à mão: mexa nas migrações e gere de novo.
-- =====================================================================



-- =====================================================================
-- >>> 001_base.sql
-- =====================================================================

-- =====================================================================
-- BARBER PRO — Migração 001 (base)
-- Cria: barbearias, membros, barbeiros, servicos, clientes, agendamentos
-- Segurança: RLS (Row Level Security) isolando cada barbearia
--
-- SEGURO: este script NÃO apaga dados. Pode rodar mais de uma vez.
-- Cole no Supabase → SQL Editor → New query → Run.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Quem é admin do site (eu, dono do sistema). Preenchido à mão.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.barbearias (
  id            uuid primary key default gen_random_uuid(),
  dono_user_id  uuid not null references auth.users(id) on delete restrict,
  nome          text not null,
  slug          text unique,
  telefone      text,
  endereco      text,
  cor           text not null default '#c9a227',
  logo_url      text,
  status        text not null default 'trial'
                check (status in ('trial','ativa','suspensa','cancelada')),
  expira_em     date not null default (current_date + 14),
  criada_em     timestamptz not null default now()
);

create table if not exists public.membros (
  user_id       uuid not null references auth.users(id) on delete cascade,
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  papel         text not null check (papel in ('dono','barbeiro','recepcao')),
  criado_em     timestamptz not null default now(),
  primary key (user_id, barbearia_id)
);
create index if not exists membros_barbearia_idx on public.membros(barbearia_id);

create table if not exists public.barbeiros (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null, -- login do barbeiro (opcional)
  nome          text not null,
  telefone      text,
  comissao_pct  numeric(5,2) not null default 0,
  cor           text not null default '#3b82f6',
  ativo         boolean not null default true,
  -- horário de trabalho: {"1":[["09:00","19:00"]], ...}  (0=domingo ... 6=sábado)
  horarios      jsonb not null default '{"1":[["09:00","19:00"]],"2":[["09:00","19:00"]],"3":[["09:00","19:00"]],"4":[["09:00","19:00"]],"5":[["09:00","19:00"]],"6":[["09:00","17:00"]]}'::jsonb,
  criado_em     timestamptz not null default now()
);
create index if not exists barbeiros_barbearia_idx on public.barbeiros(barbearia_id);

create table if not exists public.servicos (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  nome          text not null,
  duracao_min   int  not null default 30 check (duracao_min > 0 and duracao_min <= 600),
  preco         numeric(10,2) not null default 0 check (preco >= 0),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);
create index if not exists servicos_barbearia_idx on public.servicos(barbearia_id);

create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  nome          text not null,
  telefone      text,
  aniversario   date,
  observacoes   text,
  criado_em     timestamptz not null default now()
);
create index if not exists clientes_barbearia_idx on public.clientes(barbearia_id);
create index if not exists clientes_nome_idx on public.clientes(barbearia_id, lower(nome));

create table if not exists public.agendamentos (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  cliente_id    uuid references public.clientes(id) on delete set null,
  cliente_nome  text,                       -- para encaixe/walk-in sem cadastro
  barbeiro_id   uuid not null references public.barbeiros(id) on delete cascade,
  servico_id    uuid references public.servicos(id) on delete set null,
  inicio        timestamptz not null,
  fim           timestamptz not null,
  preco         numeric(10,2) not null default 0,
  status        text not null default 'agendado'
                check (status in ('agendado','confirmado','atendido','faltou','cancelado')),
  observacao    text,
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  check (fim > inicio)
);
create index if not exists agendamentos_agenda_idx on public.agendamentos(barbearia_id, inicio);
create index if not exists agendamentos_barbeiro_idx on public.agendamentos(barbeiro_id, inicio);

-- Impede DOIS agendamentos no mesmo barbeiro com horários que se cruzam.
-- Isso é garantido pelo banco: não tem como burlar pelo navegador.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_sem_conflito') then
    alter table public.agendamentos
      add constraint agendamentos_sem_conflito
      exclude using gist (
        barbeiro_id with =,
        tstzrange(inicio, fim, '[)') with &&
      ) where (status <> 'cancelado');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. FUNÇÕES DE APOIO (SECURITY DEFINER — leem sem passar pela RLS,
--    evitando recursão infinita nas policies)
-- ---------------------------------------------------------------------

create or replace function public.sou_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

create or replace function public.minhas_barbearias()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.barbearia_id from public.membros m where m.user_id = auth.uid();
$$;

create or replace function public.meu_papel(b uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.papel from public.membros m
   where m.user_id = auth.uid() and m.barbearia_id = b;
$$;

create or replace function public.sou_dono(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
     where m.user_id = auth.uid() and m.barbearia_id = b and m.papel = 'dono'
  );
$$;

-- id do cadastro de barbeiro ligado ao usuário logado (usado depois em comissões)
create or replace function public.meu_barbeiro_id(b uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select x.id from public.barbeiros x
   where x.barbearia_id = b and x.user_id = auth.uid() limit 1;
$$;

grant execute on function public.sou_admin(), public.minhas_barbearias(),
  public.meu_papel(uuid), public.sou_dono(uuid), public.meu_barbeiro_id(uuid) to authenticated;

-- Ao criar uma barbearia, o criador vira 'dono' automaticamente.
create or replace function public.tg_barbearia_cria_dono()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.membros (user_id, barbearia_id, papel)
  values (new.dono_user_id, new.id, 'dono')
  on conflict (user_id, barbearia_id) do update set papel = 'dono';
  return new;
end $$;

drop trigger if exists barbearia_cria_dono on public.barbearias;
create trigger barbearia_cria_dono after insert on public.barbearias
  for each row execute function public.tg_barbearia_cria_dono();

-- ---------------------------------------------------------------------
-- 3. RLS — cada barbearia só enxerga os próprios dados
-- ---------------------------------------------------------------------

alter table public.admin_users  enable row level security;
alter table public.barbearias   enable row level security;
alter table public.membros      enable row level security;
alter table public.barbeiros    enable row level security;
alter table public.servicos     enable row level security;
alter table public.clientes     enable row level security;
alter table public.agendamentos enable row level security;

-- admin_users: ninguém lê pelo navegador (só as funções security definer).
drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- barbearias
drop policy if exists barbearias_select on public.barbearias;
create policy barbearias_select on public.barbearias
  for select to authenticated
  using (id in (select public.minhas_barbearias()) or public.sou_admin());

drop policy if exists barbearias_insert on public.barbearias;
create policy barbearias_insert on public.barbearias
  for insert to authenticated
  with check (dono_user_id = auth.uid());

drop policy if exists barbearias_update on public.barbearias;
create policy barbearias_update on public.barbearias
  for update to authenticated
  using (public.sou_dono(id) or public.sou_admin())
  with check (public.sou_dono(id) or public.sou_admin());

-- membros: leitura para quem é da casa; escrita só do dono (ou admin)
drop policy if exists membros_select on public.membros;
create policy membros_select on public.membros
  for select to authenticated
  using (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin());

drop policy if exists membros_write on public.membros;
create policy membros_write on public.membros
  for all to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());

-- Tabelas operacionais: mesma regra (é da barbearia → pode).
-- (Restrições por papel — financeiro/comissões — entram na migração 002.)
do $$
declare t text;
begin
  foreach t in array array['barbeiros','servicos','clientes','agendamentos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
        using (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin())
        with check (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin())
    $f$, t || '_tenant', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. DADOS PADRÃO ao criar barbearia (serviços de exemplo)
-- ---------------------------------------------------------------------
create or replace function public.tg_barbearia_servicos_padrao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.servicos (barbearia_id, nome, duracao_min, preco) values
    (new.id, 'Corte',        30, 40),
    (new.id, 'Barba',        20, 30),
    (new.id, 'Corte + Barba',50, 65),
    (new.id, 'Sobrancelha',  10, 15);
  return new;
end $$;

drop trigger if exists barbearia_servicos_padrao on public.barbearias;
create trigger barbearia_servicos_padrao after insert on public.barbearias
  for each row execute function public.tg_barbearia_servicos_padrao();


-- =====================================================================
-- >>> 002_trava_barbearia_fantasma.sql
-- =====================================================================

-- =====================================================================
-- BARBER PRO — Migração 002
-- Trava contra "barbearia fantasma": funcionário (barbeiro/recepção)
-- NUNCA pode criar/ter uma barbearia própria. Ele entra na barbearia do
-- dono pela tabela `membros`.
--
-- SEGURO: não apaga dados. Pode rodar mais de uma vez.
-- =====================================================================

-- 1) Confirma que NÃO existe nenhum gatilho criando barbearia no signup.
--    (Se algum dia alguém criar um, esta consulta mostra. Só leitura.)
do $$
declare achou int;
begin
  select count(*) into achou
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;
  if achou > 0 then
    raise notice 'ATENÇÃO: existem % gatilho(s) em auth.users. Verifique se algum cria barbearia.', achou;
  else
    raise notice 'OK: nenhum gatilho em auth.users — ninguém ganha barbearia automática no cadastro.';
  end if;
end $$;

-- 2) Quem já é funcionário de alguma barbearia é... funcionário.
create or replace function public.sou_funcionario()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
     where m.user_id = auth.uid() and m.papel in ('barbeiro','recepcao')
  );
$$;
grant execute on function public.sou_funcionario() to authenticated;

-- 3) A criação de barbearia passa a exigir: sou eu mesmo o dono E não sou
--    funcionário de ninguém. Assim o login da equipe não vira "dono" de uma
--    barbearia vazia nem por engano, nem forçando a mão pelo navegador.
drop policy if exists barbearias_insert on public.barbearias;
create policy barbearias_insert on public.barbearias
  for insert to authenticated
  with check (dono_user_id = auth.uid() and not public.sou_funcionario());

-- 4) O papel 'dono' de um vínculo só pode existir se bater com o dono da
--    barbearia. Impede promover alguém a dono por fora.
create or replace function public.tg_membro_valida_dono()
returns trigger language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  if new.papel = 'dono' then
    select b.dono_user_id into dono from public.barbearias b where b.id = new.barbearia_id;
    if dono is distinct from new.user_id then
      raise exception 'Só o dono cadastrado da barbearia pode ter o papel dono.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists membro_valida_dono on public.membros;
create trigger membro_valida_dono before insert or update on public.membros
  for each row execute function public.tg_membro_valida_dono();


-- =====================================================================
-- >>> 003_financeiro.sql
-- =====================================================================

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


-- =====================================================================
-- >>> 004_equipe_e_push.sql
-- =====================================================================

-- =====================================================================
-- BARBER PRO — Migração 004
-- Logins da equipe (vínculo do barbeiro com o login) + notificações push.
--
-- SEGURO: não apaga dados. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EQUIPE
-- ---------------------------------------------------------------------

-- Um mesmo login não pode estar em dois cadastros de barbeiro na mesma casa.
create unique index if not exists barbeiros_user_unico
  on public.barbeiros (barbearia_id, user_id) where user_id is not null;

-- Quem é quem, para a tela de equipe do dono (sem expor a tabela auth.users).
create or replace function public.equipe_da_barbearia(p_barbearia uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not (public.sou_dono(p_barbearia) or public.sou_admin()) then
    raise exception 'Só o dono da barbearia vê a equipe.';
  end if;
  select coalesce(json_agg(x order by x.papel, x.email), '[]'::json) into r from (
    select m.user_id, m.papel, u.email,
           coalesce(u.raw_user_meta_data->>'nome', '') as nome,
           u.last_sign_in_at, u.created_at,
           (select b.id from public.barbeiros b
             where b.barbearia_id = p_barbearia and b.user_id = m.user_id limit 1) as barbeiro_id,
           (select b.nome from public.barbeiros b
             where b.barbearia_id = p_barbearia and b.user_id = m.user_id limit 1) as barbeiro_nome
      from public.membros m
      join auth.users u on u.id = m.user_id
     where m.barbearia_id = p_barbearia) x;
  return r;
end $$;

grant execute on function public.equipe_da_barbearia(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. NOTIFICAÇÕES PUSH
-- ---------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  aparelho     text,
  criado_em    timestamptz not null default now()
);
create index if not exists push_subs_barbearia_idx on public.push_subscriptions(barbearia_id);

-- Evita mandar o mesmo aviso duas vezes.
create table if not exists public.push_enviados (
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  tipo           text not null default 'lembrete',
  enviado_em     timestamptz not null default now(),
  primary key (agendamento_id, tipo)
);

create table if not exists public.config_notificacao (
  barbearia_id   uuid primary key references public.barbearias(id) on delete cascade,
  ativo          boolean not null default true,
  minutos_antes  int not null default 30 check (minutos_antes between 5 and 240)
);

insert into public.config_notificacao (barbearia_id)
select b.id from public.barbearias b
  left join public.config_notificacao c on c.barbearia_id = b.id
 where c.barbearia_id is null;

create or replace function public.tg_barbearia_config_notificacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.config_notificacao (barbearia_id) values (new.id)
  on conflict (barbearia_id) do nothing;
  return new;
end $$;

drop trigger if exists barbearia_config_notificacao on public.barbearias;
create trigger barbearia_config_notificacao after insert on public.barbearias
  for each row execute function public.tg_barbearia_config_notificacao();

-- RLS: cada um cuida das próprias inscrições de aparelho
alter table public.push_subscriptions enable row level security;
alter table public.push_enviados      enable row level security;
alter table public.config_notificacao enable row level security;

drop policy if exists push_subs_minhas on public.push_subscriptions;
create policy push_subs_minhas on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and barbearia_id in (select public.minhas_barbearias()));

drop policy if exists push_enviados_ninguem on public.push_enviados;
create policy push_enviados_ninguem on public.push_enviados
  for select to authenticated using (false);   -- só o servidor (service role) mexe

drop policy if exists config_notif_select on public.config_notificacao;
create policy config_notif_select on public.config_notificacao
  for select to authenticated
  using (barbearia_id in (select public.minhas_barbearias()) or public.sou_admin());

drop policy if exists config_notif_write on public.config_notificacao;
create policy config_notif_write on public.config_notificacao
  for all to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin())
  with check (public.sou_dono(barbearia_id) or public.sou_admin());


-- =====================================================================
-- >>> 005_agendamento_publico.sql
-- =====================================================================

-- =====================================================================
-- BARBER PRO — Migração 005
-- Link público de auto-agendamento: barbearia.com/agendar/nome-da-barbearia
--
-- Nada é aberto na marra: o visitante (anônimo) NÃO lê nenhuma tabela.
-- Ele só consegue chamar três funções controladas, que devolvem
-- exatamente o necessário e gravam o agendamento com as travas de sempre.
--
-- SEGURO: não apaga dados. Pode rodar mais de uma vez.
-- =====================================================================

alter table public.barbearias
  add column if not exists agendamento_publico boolean not null default true;

-- ---------------------------------------------------------------------
-- 1. Endereço amigável (slug) — "Barbearia do Bruno" -> "barbearia-do-bruno"
-- ---------------------------------------------------------------------
create or replace function public.gera_slug(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
           lower(translate(txt,
             'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
             'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
           '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.tg_barbearia_slug()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; tentativa text; n int := 0;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  base := nullif(public.gera_slug(new.nome), '');
  if base is null then base := 'barbearia'; end if;
  tentativa := base;
  while exists (select 1 from public.barbearias b where b.slug = tentativa and b.id <> new.id) loop
    n := n + 1; tentativa := base || '-' || n;
  end loop;
  new.slug := tentativa;
  return new;
end $$;

drop trigger if exists barbearia_slug on public.barbearias;
create trigger barbearia_slug before insert or update of nome on public.barbearias
  for each row execute function public.tg_barbearia_slug();

-- Preenche o slug de quem já existia.
update public.barbearias set slug = null where slug = '';
do $$
declare b record; base text; tentativa text; n int;
begin
  for b in select id, nome from public.barbearias where slug is null loop
    base := coalesce(nullif(public.gera_slug(b.nome), ''), 'barbearia');
    tentativa := base; n := 0;
    while exists (select 1 from public.barbearias x where x.slug = tentativa) loop
      n := n + 1; tentativa := base || '-' || n;
    end loop;
    update public.barbearias set slug = tentativa where id = b.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. As três funções que o visitante pode chamar
-- ---------------------------------------------------------------------

-- (a) Dados da vitrine: nome, cor, barbeiros e serviços.
create or replace function public.agenda_publica(p_slug text)
returns json language plpgsql stable security definer set search_path = public as $$
declare b record; r json;
begin
  select * into b from public.barbearias
   where slug = p_slug and agendamento_publico and status in ('trial','ativa');
  if b.id is null then return null; end if;

  select json_build_object(
    'nome', b.nome, 'cor', b.cor, 'telefone', b.telefone, 'endereco', b.endereco,
    'barbeiros', (select coalesce(json_agg(json_build_object('id', x.id, 'nome', x.nome, 'cor', x.cor)), '[]'::json)
                    from public.barbeiros x where x.barbearia_id = b.id and x.ativo),
    'servicos',  (select coalesce(json_agg(json_build_object('id', s.id, 'nome', s.nome,
                                    'duracao_min', s.duracao_min, 'preco', s.preco)), '[]'::json)
                    from public.servicos s where s.barbearia_id = b.id and s.ativo)
  ) into r;
  return r;
end $$;

-- (b) Horários livres de um barbeiro num dia, já descontando a duração.
create or replace function public.horarios_livres(p_slug text, p_barbeiro uuid,
                                                  p_servico uuid, p_dia date)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  b record; barbeiro record; dur int; fuso text;
  faixas jsonb; faixa jsonb; ini int; fim int; passo int := 15;
  m int; livres int[] := '{}'; hh text; inicio_ts timestamptz; fim_ts timestamptz;
begin
  select * into b from public.barbearias
   where slug = p_slug and agendamento_publico and status in ('trial','ativa');
  if b.id is null then return '[]'::json; end if;
  if p_dia < (now() at time zone coalesce(b.fuso, 'America/Sao_Paulo'))::date then return '[]'::json; end if;

  select * into barbeiro from public.barbeiros
   where id = p_barbeiro and barbearia_id = b.id and ativo;
  if barbeiro.id is null then return '[]'::json; end if;

  select s.duracao_min into dur from public.servicos s
   where s.id = p_servico and s.barbearia_id = b.id and s.ativo;
  if dur is null then return '[]'::json; end if;

  fuso := coalesce(b.fuso, 'America/Sao_Paulo');
  -- as chaves do horário de trabalho são 0..6 (0 = domingo)
  faixas := coalesce(barbeiro.horarios -> (extract(dow from p_dia))::int::text, '[]'::jsonb);

  for faixa in select * from jsonb_array_elements(faixas) loop
    ini := (split_part(faixa->>0, ':', 1))::int * 60 + (split_part(faixa->>0, ':', 2))::int;
    fim := (split_part(faixa->>1, ':', 1))::int * 60 + (split_part(faixa->>1, ':', 2))::int;
    m := ini;
    while m + dur <= fim loop
      hh := lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0');
      inicio_ts := (p_dia::text || ' ' || hh)::timestamp at time zone fuso;
      fim_ts := inicio_ts + (dur || ' minutes')::interval;
      if inicio_ts > now()
         and not exists (select 1 from public.agendamentos a
                          where a.barbeiro_id = p_barbeiro and a.status <> 'cancelado'
                            and tstzrange(a.inicio, a.fim, '[)') && tstzrange(inicio_ts, fim_ts, '[)'))
      then
        livres := livres || m;
      end if;
      m := m + passo;
    end loop;
  end loop;

  return (select coalesce(json_agg(lpad((x / 60)::text, 2, '0') || ':' || lpad((x % 60)::text, 2, '0')), '[]'::json)
            from unnest(livres) as x);
end $$;

-- (c) Marcar o horário. Cria/reaproveita o cliente pelo telefone.
create or replace function public.agendar_publico(p_slug text, p_barbeiro uuid, p_servico uuid,
                                                  p_dia date, p_hora text,
                                                  p_nome text, p_telefone text)
returns json language plpgsql security definer set search_path = public as $$
declare
  b record; serv record; fuso text; inicio_ts timestamptz; fim_ts timestamptz;
  tel text; cli uuid; novo uuid;
begin
  select * into b from public.barbearias
   where slug = p_slug and agendamento_publico and status in ('trial','ativa');
  if b.id is null then raise exception 'Agendamento indisponível.'; end if;

  if length(coalesce(trim(p_nome), '')) < 2 then raise exception 'Informe seu nome.'; end if;
  tel := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  if length(tel) < 10 then raise exception 'Informe um telefone válido com DDD.'; end if;

  select * into serv from public.servicos where id = p_servico and barbearia_id = b.id and ativo;
  if serv.id is null then raise exception 'Serviço indisponível.'; end if;
  if not exists (select 1 from public.barbeiros where id = p_barbeiro and barbearia_id = b.id and ativo)
    then raise exception 'Barbeiro indisponível.'; end if;

  fuso := coalesce(b.fuso, 'America/Sao_Paulo');
  inicio_ts := (p_dia::text || ' ' || p_hora)::timestamp at time zone fuso;
  fim_ts := inicio_ts + (serv.duracao_min || ' minutes')::interval;
  if inicio_ts <= now() then raise exception 'Esse horário já passou.'; end if;

  -- limite simples contra abuso: 3 marcações futuras por telefone
  if (select count(*) from public.agendamentos a
        join public.clientes c on c.id = a.cliente_id
       where a.barbearia_id = b.id and a.inicio > now() and a.status <> 'cancelado'
         and regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g') = tel) >= 3 then
    raise exception 'Você já tem horários marcados. Fale com a barbearia.';
  end if;

  select id into cli from public.clientes
   where barbearia_id = b.id and regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g') = tel
   limit 1;
  if cli is null then
    insert into public.clientes (barbearia_id, nome, telefone)
    values (b.id, trim(p_nome), p_telefone) returning id into cli;
  end if;

  insert into public.agendamentos (barbearia_id, cliente_id, barbeiro_id, servico_id,
                                   inicio, fim, preco, status, observacao)
  values (b.id, cli, p_barbeiro, p_servico, inicio_ts, fim_ts, serv.preco, 'agendado',
          'Marcado pelo cliente no link público')
  returning id into novo;

  return json_build_object('ok', true, 'id', novo,
                           'quando', to_char(inicio_ts at time zone fuso, 'DD/MM/YYYY HH24:MI'));
exception when exclusion_violation then
  raise exception 'Esse horário acabou de ser ocupado. Escolha outro, por favor.';
end $$;

-- O visitante (anon) só pode chamar estas três. Nada de tabela.
grant execute on function public.agenda_publica(text) to anon, authenticated;
grant execute on function public.horarios_livres(text, uuid, uuid, date) to anon, authenticated;
grant execute on function public.agendar_publico(text, uuid, uuid, date, text, text, text) to anon, authenticated;


-- =====================================================================
-- >>> 006_produtos_fidelidade.sql
-- =====================================================================

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


-- =====================================================================
-- >>> 007_admin_assinatura.sql
-- =====================================================================

-- =====================================================================
-- BARBER PRO — Migração 007
-- Assinatura das barbearias + painel do ADMIN DO SITE (você).
--
-- Admin não é barbearia: é quem administra o sistema todo.
-- Para virar admin, rode uma vez (trocando o e-mail):
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'seu@email.com';
--
-- SEGURO: não apaga dados. Pode rodar mais de uma vez.
-- =====================================================================

alter table public.barbearias
  add column if not exists valor_mensal numeric(10,2) not null default 79.90,
  add column if not exists observacao_admin text;

-- Histórico de pagamentos da mensalidade (lançado por você, no painel).
create table if not exists public.pagamentos (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias(id) on delete cascade,
  valor         numeric(10,2) not null check (valor >= 0),
  referente_a   date not null default current_date,
  pago_em       timestamptz not null default now(),
  meio          text,
  observacao    text,
  criado_por    uuid references auth.users(id) on delete set null
);
create index if not exists pagamentos_barbearia_idx on public.pagamentos(barbearia_id, pago_em desc);

alter table public.pagamentos enable row level security;

-- O dono vê os próprios pagamentos; o admin vê e lança tudo.
drop policy if exists pagamentos_dono_le on public.pagamentos;
create policy pagamentos_dono_le on public.pagamentos
  for select to authenticated
  using (public.sou_dono(barbearia_id) or public.sou_admin());

drop policy if exists pagamentos_admin on public.pagamentos;
create policy pagamentos_admin on public.pagamentos
  for all to authenticated
  using (public.sou_admin()) with check (public.sou_admin());

-- Situação da assinatura, em português, para a tela.
create or replace function public.situacao_assinatura(p_barbearia uuid)
returns json language plpgsql stable security invoker set search_path = public as $$
declare b record; dias int;
begin
  select * into b from public.barbearias where id = p_barbearia;
  if b.id is null then raise exception 'Barbearia não encontrada.'; end if;
  dias := b.expira_em - current_date;
  return json_build_object(
    'status', b.status, 'expira_em', b.expira_em, 'dias', dias,
    'valor_mensal', b.valor_mensal,
    'bloqueado', (b.status in ('suspensa','cancelada')) or (b.status = 'trial' and dias < 0),
    'texto', case
      when b.status = 'ativa' and dias >= 0 then 'Assinatura em dia'
      when b.status = 'ativa' then 'Mensalidade vencida'
      when b.status = 'trial' and dias >= 0 then 'Teste grátis: ' || dias || ' dia(s) restantes'
      when b.status = 'trial' then 'Teste grátis encerrado'
      when b.status = 'suspensa' then 'Conta suspensa por falta de pagamento'
      else 'Conta cancelada' end
  );
end $$;

grant execute on function public.situacao_assinatura(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- PAINEL DO ADMIN
-- ---------------------------------------------------------------------

-- Lista todas as barbearias com uso e situação. Só admin.
create or replace function public.admin_barbearias()
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.sou_admin() then raise exception 'Só o administrador do site.'; end if;
  select coalesce(json_agg(x order by x.criada_em desc), '[]'::json) into r from (
    select b.id, b.nome, b.slug, b.status, b.expira_em, b.valor_mensal, b.criada_em,
           b.expira_em - current_date as dias,
           (select u.email from auth.users u where u.id = b.dono_user_id) as dono_email,
           (select count(*) from public.membros m where m.barbearia_id = b.id) as pessoas,
           (select count(*) from public.clientes c where c.barbearia_id = b.id) as clientes,
           (select count(*) from public.agendamentos a where a.barbearia_id = b.id) as agendamentos,
           (select max(a.criado_em) from public.agendamentos a where a.barbearia_id = b.id) as ultimo_uso,
           (select coalesce(sum(p.valor), 0) from public.pagamentos p where p.barbearia_id = b.id) as ja_pagou
      from public.barbearias b) x;
  return r;
end $$;

-- Números do topo do painel. Só admin.
create or replace function public.admin_resumo()
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.sou_admin() then raise exception 'Só o administrador do site.'; end if;
  select json_build_object(
    'total',        count(*),
    'ativas',       count(*) filter (where status = 'ativa' and expira_em >= current_date),
    'em_teste',     count(*) filter (where status = 'trial' and expira_em >= current_date),
    'inadimplentes',count(*) filter (where (status = 'ativa' and expira_em < current_date)
                                        or status = 'suspensa'),
    'canceladas',   count(*) filter (where status = 'cancelada'),
    'receita_mes',  coalesce(sum(valor_mensal) filter (where status = 'ativa' and expira_em >= current_date), 0),
    'receita_potencial', coalesce(sum(valor_mensal), 0)
  ) into r from public.barbearias;
  return r;
end $$;

-- Mudar situação / vencimento / valor de uma barbearia. Só admin.
create or replace function public.admin_atualizar_barbearia(
  p_barbearia uuid, p_status text default null, p_expira_em date default null,
  p_valor numeric default null, p_observacao text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_admin() then raise exception 'Só o administrador do site.'; end if;
  if p_status is not null and p_status not in ('trial','ativa','suspensa','cancelada') then
    raise exception 'Situação inválida.';
  end if;
  update public.barbearias set
    status = coalesce(p_status, status),
    expira_em = coalesce(p_expira_em, expira_em),
    valor_mensal = coalesce(p_valor, valor_mensal),
    observacao_admin = coalesce(p_observacao, observacao_admin)
  where id = p_barbearia;
  return json_build_object('ok', true);
end $$;

-- Registrar pagamento da mensalidade: soma 30 dias e reativa. Só admin.
create or replace function public.admin_registrar_pagamento(
  p_barbearia uuid, p_valor numeric, p_meio text default null, p_dias int default 30)
returns json language plpgsql security definer set search_path = public as $$
declare nova date;
begin
  if not public.sou_admin() then raise exception 'Só o administrador do site.'; end if;
  insert into public.pagamentos (barbearia_id, valor, meio, criado_por)
  values (p_barbearia, p_valor, p_meio, auth.uid());

  select greatest(expira_em, current_date) + p_dias into nova
    from public.barbearias where id = p_barbearia;

  update public.barbearias set status = 'ativa', expira_em = nova where id = p_barbearia;
  return json_build_object('ok', true, 'expira_em', nova);
end $$;

grant execute on function public.admin_barbearias(), public.admin_resumo(),
  public.admin_atualizar_barbearia(uuid, text, date, numeric, text),
  public.admin_registrar_pagamento(uuid, numeric, text, int) to authenticated;

-- Proteção extra: ninguém vira admin pelo navegador (a tabela não aceita insert).
drop policy if exists admin_users_sem_escrita on public.admin_users;
create policy admin_users_sem_escrita on public.admin_users
  for insert to authenticated with check (false);
