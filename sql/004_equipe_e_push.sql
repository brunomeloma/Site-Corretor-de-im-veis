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
