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
