-- =====================================================================
-- Teste automático do FINANCEIRO (migração 003).
-- Prova que: comissão e taxa são calculadas sozinhas, recepção só vê o
-- dia de hoje, barbeiro só vê o que é dele, e ninguém além do dono abre
-- relatório ou despesa.
--
-- Como rodar (Postgres limpo, fora do Supabase):
--   psql -f sql/testes/teste_rls.sql -f sql/testes/teste_financeiro.sql
-- =====================================================================

\i sql/003_financeiro.sql
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Personagens: dono A (já criou a Barbearia A no teste anterior),
-- funcionário C (barbeiro) e agora a recepcionista R.
insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-000000000004', 'recepcaoR@teste.com');

do $$
declare idb uuid;
begin
  select id into idb from public.barbearias where nome = 'Barbearia A';
  insert into public.membros (user_id, barbearia_id, papel)
  values ('dddddddd-0000-0000-0000-000000000004', idb, 'recepcao');
  -- liga o login do funcionário C ao cadastro de barbeiro
  update public.barbeiros set user_id = 'cccccccc-0000-0000-0000-000000000003',
                              comissao_pct = 50
   where barbearia_id = idb;
end $$;

\echo '=========== DONO registra uma venda de ontem e uma de hoje =========='
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
declare idb uuid; idx uuid; v1 uuid; v2 uuid;
begin
  select b.id, x.id into idb, idx from public.barbearias b
    join public.barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';

  -- venda de ONTEM, no crédito (taxa 3.99%)
  insert into public.vendas (barbearia_id, barbeiro_id, cliente_nome, forma_pagamento, data)
  values (idb, idx, 'Cliente de ontem', 'credito', now() - interval '1 day') returning id into v1;
  insert into public.venda_itens (venda_id, barbearia_id, barbeiro_id, descricao, preco_unit)
  values (v1, idb, idx, 'Corte', 100);

  -- venda de HOJE, em dinheiro (sem taxa)
  insert into public.vendas (barbearia_id, barbeiro_id, cliente_nome, forma_pagamento)
  values (idb, idx, 'Cliente de hoje', 'dinheiro') returning id into v2;
  insert into public.venda_itens (venda_id, barbearia_id, barbeiro_id, descricao, preco_unit)
  values (v2, idb, idx, 'Corte + Barba', 60);
end $$;

\echo '--- TESTE 1: comissao (50%) e taxa (3.99%) calculadas sozinhas ---'
select cliente_nome, forma_pagamento, valor_bruto, valor_taxa, valor_liquido, comissao_total
  from vendas order by data;

\echo '--- TESTE 2: DONO ve as duas vendas (esperado: 2) ---'
select count(*) as vendas_que_o_dono_ve from vendas;

\echo '--- TESTE 3: RECEPCAO ve SO a venda de hoje (esperado: 1, a de hoje) ---'
reset role; set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
select count(*) as vendas_que_a_recepcao_ve from vendas;
select cliente_nome from vendas;

\echo '--- TESTE 4: RECEPCAO tenta abrir o relatorio do mes (esperado: ERRO) ---'
do $$
declare idb uuid; r json;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000004', true);
  select id into idb from public.barbearias where nome = 'Barbearia A';
  begin
    select public.resumo_financeiro(idb, current_date - 30, current_date) into r;
    raise warning 'FALHOU: recepcao viu o faturamento! %', r;
  exception when others then
    raise notice 'OK: relatorio bloqueado para recepcao (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 5: RECEPCAO tenta ver despesas (esperado: 0 linhas) ---'
reset role; set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ declare idb uuid; begin
  select id into idb from public.barbearias where nome = 'Barbearia A';
  insert into public.despesas (barbearia_id, descricao, valor) values (idb, 'Aluguel', 1500);
end $$;
reset role; set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
select count(*) as despesas_que_a_recepcao_ve from despesas;

\echo '--- TESTE 6: BARBEIRO ve as vendas dele (esperado: 2, sao dele) ---'
reset role; set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
select count(*) as vendas_do_barbeiro from vendas;

\echo '--- TESTE 7: BARBEIRO tenta ver o ranking geral (esperado: ERRO) ---'
do $$
declare idb uuid; r json;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
  select id into idb from public.barbearias where nome = 'Barbearia A';
  begin
    select public.ranking_barbeiros(idb, current_date - 30, current_date) into r;
    raise warning 'FALHOU: barbeiro viu o ranking! %', r;
  exception when others then
    raise notice 'OK: ranking bloqueado para barbeiro (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 8: comissoes do barbeiro (esperado: 50% de 160 = 80) ---'
do $$
declare idb uuid; r json;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
  select id into idb from public.barbearias where nome = 'Barbearia A';
  select public.minhas_comissoes(idb, current_date - 30, current_date + 1) into r;
  raise notice 'comissao do barbeiro: %', r::jsonb - 'itens';
end $$;

\echo '--- TESTE 9: barbeiro pede comissao de OUTRO barbeiro (deve ignorar o id) ---'
do $$
declare idb uuid; outro uuid; r json;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
  select id into idb from public.barbearias where nome = 'Barbearia A';
  outro := gen_random_uuid();
  select public.minhas_comissoes(idb, current_date - 30, current_date + 1, outro) into r;
  if (r->>'comissao')::numeric > 0 then
    raise notice 'OK: id do navegador ignorado, devolveu os dados dele mesmo (%).', r->>'comissao';
  else
    raise warning 'ATENCAO: devolveu vazio — conferir.';
  end if;
end $$;

\echo '--- TESTE 10: vendas de hoje / esperado em caixa (dinheiro = 60) ---'
reset role; set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
do $$
declare idb uuid; begin
  select id into idb from public.barbearias where nome = 'Barbearia A';
  raise notice 'vendas de hoje: %', public.vendas_de_hoje(idb);
  raise notice 'esperado em caixa (dinheiro): %', public.esperado_em_caixa(idb, public.hoje_barbearia(idb));
end $$;

\echo '--- TESTE 11: recepcao NAO pode apagar venda (esperado: 0 apagadas) ---'
with x as (delete from vendas returning 1) select count(*) as vendas_apagadas_pela_recepcao from x;

\echo '--- TESTE 12: barbeiro da outra barbearia nao ve nada disso ---'
reset role; set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select count(*) as vendas_que_o_dono_B_ve from vendas;
select count(*) as itens_que_o_dono_B_ve from venda_itens;
