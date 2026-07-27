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
