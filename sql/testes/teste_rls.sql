-- Simula o ambiente do Supabase (schema auth + auth.uid() + role authenticated)
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated login;
  end if;
end $$;
grant usage on schema public, auth to authenticated;

\i sql/001_base.sql
\i sql/002_trava_barbearia_fantasma.sql

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function auth.uid() to authenticated;
grant select on auth.users to authenticated;

-- três usuários: dono A, dono B, funcionário C
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'donoA@teste.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'donoB@teste.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'funcC@teste.com');

\echo '=========== A cria a barbearia A =========='
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into barbearias (dono_user_id, nome) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Barbearia A');
insert into barbeiros (barbearia_id, nome) select id, 'Barbeiro A' from barbearias where nome = 'Barbearia A';
insert into clientes (barbearia_id, nome) select id, 'Cliente A' from barbearias where nome = 'Barbearia A';
insert into agendamentos (barbearia_id, barbeiro_id, cliente_nome, inicio, fim, preco)
  select b.id, x.id, 'Encaixe A', now() + interval '1 day', now() + interval '1 day 30 min', 40
    from barbearias b join barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';
select 'A enxerga barbearias:' as t, count(*) from barbearias;
select 'A enxerga clientes:' as t, count(*) from clientes;
select 'servicos padrao criados:' as t, count(*) from servicos;

\echo '=========== B cria a barbearia B =========='
reset role;
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into barbearias (dono_user_id, nome) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Barbearia B');
insert into clientes (barbearia_id, nome) select id, 'Cliente B' from barbearias where nome = 'Barbearia B';

\echo '--- TESTE 1: B lista barbearias (esperado: SÓ a B) ---'
select nome from barbearias;
\echo '--- TESTE 2: B lista clientes (esperado: só Cliente B) ---'
select nome from clientes;
\echo '--- TESTE 3: B lista agendamentos (esperado: 0) ---'
select count(*) as agendamentos_visiveis from agendamentos;
\echo '--- TESTE 4: B tenta LER clientes da A pelo id na mao (esperado: 0) ---'
select count(*) as vazamento from clientes
 where barbearia_id in (select id from barbearias where nome = 'Barbearia A');

\echo '--- TESTE 5: B tenta GRAVAR na barbearia A (esperado: ERRO de RLS) ---'
reset role;
do $$
declare ida uuid;
begin
  select id into ida from public.barbearias where nome = 'Barbearia A';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
  begin
    insert into public.clientes (barbearia_id, nome) values (ida, 'INVASOR');
    raise warning 'FALHOU: a escrita foi aceita!';
  exception when insufficient_privilege or others then
    raise notice 'OK: escrita bloqueada (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 6: dois atendimentos no mesmo barbeiro/horario (esperado: ERRO) ---'
do $$
declare idb uuid; idx uuid;
begin
  select b.id, x.id into idb, idx from public.barbearias b
    join public.barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';
  begin
    insert into public.agendamentos (barbearia_id, barbeiro_id, cliente_nome, inicio, fim, preco)
    values (idb, idx, 'Conflito', now() + interval '1 day 15 min', now() + interval '1 day 45 min', 40);
    raise warning 'FALHOU: aceitou dois no mesmo horario!';
  exception when exclusion_violation then
    raise notice 'OK: conflito de horario bloqueado pelo banco.';
  end;
end $$;

\echo '--- TESTE 7: funcionario C tenta criar barbearia propria (esperado: ERRO) ---'
do $$
declare idb uuid;
begin
  select id into idb from public.barbearias where nome = 'Barbearia A';
  insert into public.membros (user_id, barbearia_id, papel)
  values ('cccccccc-0000-0000-0000-000000000003', idb, 'barbeiro');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
  begin
    insert into public.barbearias (dono_user_id, nome)
    values ('cccccccc-0000-0000-0000-000000000003', 'Barbearia Fantasma');
    raise warning 'FALHOU: funcionario criou barbearia!';
  exception when others then
    raise notice 'OK: funcionario nao pode criar barbearia (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 8: funcionario C ve a barbearia do patrao (esperado: Barbearia A) ---'
reset role;
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
select nome from barbearias;
select 'clientes que C ve:' as t, count(*) from clientes;

\echo '--- TESTE 9: tentar virar dono por fora (esperado: ERRO) ---'
reset role;
do $$
declare idb uuid;
begin
  select id into idb from public.barbearias where nome = 'Barbearia A';
  begin
    update public.membros set papel = 'dono'
     where user_id = 'cccccccc-0000-0000-0000-000000000003' and barbearia_id = idb;
    raise warning 'FALHOU: virou dono!';
  exception when others then
    raise notice 'OK: nao virou dono (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 10: barbearia fantasma / sem dono (esperado: 0 linhas) ---'
select count(*) as barbearias_sem_dono from barbearias b
  left join membros m on m.barbearia_id = b.id and m.user_id = b.dono_user_id and m.papel = 'dono'
 where m.user_id is null;
