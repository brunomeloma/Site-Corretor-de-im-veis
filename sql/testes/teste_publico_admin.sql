-- =====================================================================
-- Testes do link público, produtos/estoque, fidelidade e painel admin.
-- Roda depois de teste_rls.sql + teste_financeiro.sql.
-- =====================================================================

\i sql/004_equipe_e_push.sql
\i sql/005_agendamento_publico.sql
\i sql/006_produtos_fidelidade.sql
\i sql/007_admin_assinatura.sql
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

\echo '--- TESTE 1: slug criado sozinho para cada barbearia ---'
select nome, slug from barbearias order by nome;

\echo '--- TESTE 2: visitante ANÔNIMO nao le nenhuma tabela (esperado: ERRO/0) ---'
do $$
declare n int;
begin
  set local role anon;
  begin
    select count(*) into n from public.clientes;
    raise notice 'anon leu clientes: % linha(s) (0 = ok, RLS bloqueou)', n;
  exception when insufficient_privilege then
    raise notice 'OK: anon nem tem permissao na tabela clientes.';
  end;
  begin
    select count(*) into n from public.barbearias;
    raise notice 'anon leu barbearias: % linha(s) (0 = ok)', n;
  exception when insufficient_privilege then
    raise notice 'OK: anon nem tem permissao na tabela barbearias.';
  end;
end $$;

\echo '--- TESTE 3: anon VE a vitrine publica pela funcao liberada ---'
do $$
declare s text; r json;
begin
  select slug into s from public.barbearias where nome = 'Barbearia A';
  set local role anon;
  select public.agenda_publica(s) into r;
  raise notice 'vitrine: nome=% servicos=% barbeiros=%',
    r->>'nome', json_array_length(r->'servicos'), json_array_length(r->'barbeiros');
  select public.agenda_publica('link-que-nao-existe') into r;
  raise notice 'link inexistente devolve: %', coalesce(r::text, 'NULL (ok)');
end $$;

\echo '--- TESTE 4: horarios livres respeitam expediente e agenda ocupada ---'
do $$
declare s text; idx uuid; ids uuid; r json; amanha date;
begin
  select b.slug, x.id into s, idx from public.barbearias b
    join public.barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';
  select id into ids from public.servicos
   where barbearia_id = (select id from public.barbearias where nome = 'Barbearia A') limit 1;

  -- garante expediente de segunda a sabado, 09:00-12:00
  update public.barbeiros set horarios =
    '{"1":[["09:00","12:00"]],"2":[["09:00","12:00"]],"3":[["09:00","12:00"]],
      "4":[["09:00","12:00"]],"5":[["09:00","12:00"]],"6":[["09:00","12:00"]]}'::jsonb
   where id = idx;

  amanha := (now() at time zone 'America/Sao_Paulo')::date + 1;
  if extract(dow from amanha) = 0 then amanha := amanha + 1; end if;  -- pula domingo

  set local role anon;
  select public.horarios_livres(s, idx, ids, amanha) into r;
  raise notice 'horarios livres amanha (%): %', amanha, r;
end $$;

\echo '--- TESTE 5: cliente marca sozinho pelo link (esperado: ok) ---'
do $$
declare s text; idx uuid; ids uuid; r json; amanha date; hora text;
begin
  select b.slug, x.id into s, idx from public.barbearias b
    join public.barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';
  select id into ids from public.servicos
   where barbearia_id = (select id from public.barbearias where nome = 'Barbearia A') limit 1;
  amanha := (now() at time zone 'America/Sao_Paulo')::date + 1;
  if extract(dow from amanha) = 0 then amanha := amanha + 1; end if;

  set local role anon;
  select (public.horarios_livres(s, idx, ids, amanha))->>0 into hora;
  select public.agendar_publico(s, idx, ids, amanha, hora, 'Cliente do Link', '(11) 98888-7777') into r;
  raise notice 'OK: agendou pelo link -> %', r;

  -- de novo no MESMO horario: tem que recusar
  begin
    select public.agendar_publico(s, idx, ids, amanha, hora, 'Outro Cliente', '(11) 97777-6666') into r;
    raise warning 'FALHOU: aceitou dois no mesmo horario pelo link!';
  exception when others then
    raise notice 'OK: horario duplicado recusado (%).', sqlerrm;
  end;

  -- telefone invalido
  begin
    select public.agendar_publico(s, idx, ids, amanha, '11:00', 'Zé', '123') into r;
    raise warning 'FALHOU: aceitou telefone invalido!';
  exception when others then
    raise notice 'OK: telefone invalido recusado (%).', sqlerrm;
  end;

  -- data no passado
  begin
    select public.agendar_publico(s, idx, ids, current_date - 1, '09:00', 'Zé', '(11) 98888-7777') into r;
    raise warning 'FALHOU: aceitou data no passado!';
  exception when others then
    raise notice 'OK: passado recusado (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 6: barbearia com auto-agendamento DESLIGADO some do link ---'
do $$
declare s text; r json;
begin
  select slug into s from public.barbearias where nome = 'Barbearia A';
  update public.barbearias set agendamento_publico = false where nome = 'Barbearia A';
  set local role anon;
  select public.agenda_publica(s) into r;
  if r is null then raise notice 'OK: link desligado nao mostra nada.';
  else raise warning 'FALHOU: mostrou mesmo desligado.'; end if;
end $$;
update public.barbearias set agendamento_publico = true where nome = 'Barbearia A';

\echo '--- TESTE 7: produto baixa e devolve estoque sozinho ---'
do $$
declare idb uuid; idx uuid; idp uuid; v uuid; item uuid; e int;
begin
  select b.id, x.id into idb, idx from public.barbearias b
    join public.barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';
  insert into public.produtos (barbearia_id, nome, preco, estoque, comissao_pct)
  values (idb, 'Pomada', 40, 10, 20) returning id into idp;

  insert into public.vendas (barbearia_id, barbeiro_id, forma_pagamento) values (idb, idx, 'pix')
  returning id into v;
  insert into public.venda_itens (venda_id, barbearia_id, barbeiro_id, produto_id, descricao, quantidade, preco_unit)
  values (v, idb, idx, idp, 'Pomada', 3, 40) returning id into item;

  select estoque into e from public.produtos where id = idp;
  raise notice 'estoque apos vender 3 (esperado 7): %', e;
  raise notice 'comissao do produto 20%% de 120 (esperado 24): %',
    (select comissao_valor from public.venda_itens where id = item);

  delete from public.venda_itens where id = item;
  select estoque into e from public.produtos where id = idp;
  raise notice 'estoque apos estornar (esperado 10): %', e;
end $$;

\echo '--- TESTE 8: cartao fidelidade conta os atendimentos ---'
do $$
declare idb uuid; idc uuid; idx uuid; r json; i int;
begin
  select b.id, x.id into idb, idx from public.barbearias b
    join public.barbeiros x on x.barbearia_id = b.id where b.nome = 'Barbearia A';
  update public.barbearias set fidelidade_ativa = true, fidelidade_meta = 3 where id = idb;
  insert into public.clientes (barbearia_id, nome) values (idb, 'Fiel') returning id into idc;

  for i in 1..3 loop
    insert into public.agendamentos (barbearia_id, cliente_id, barbeiro_id, inicio, fim, status)
    values (idb, idc, idx, now() - (i || ' days')::interval, now() - (i || ' days')::interval + interval '30 min', 'atendido');
  end loop;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  select public.fidelidade_cliente(idc) into r;
  raise notice 'fidelidade (esperado premiado=true, quantidade=3): %', r;

  insert into public.fidelidade_resgates (barbearia_id, cliente_id) values (idb, idc);
  select public.fidelidade_cliente(idc) into r;
  raise notice 'apos resgatar (esperado quantidade=0): %', r;
end $$;

\echo '--- TESTE 9: painel admin so abre para o administrador do site ---'
do $$
declare r json;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  begin
    select public.admin_resumo() into r;
    raise warning 'FALHOU: dono comum abriu o painel do site!';
  exception when others then
    raise notice 'OK: painel bloqueado para dono comum (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 10: admin de verdade ve o resumo e as contas ---'
insert into public.admin_users (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')
  on conflict do nothing;
do $$
declare r json;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  select public.admin_resumo() into r;
  raise notice 'resumo do site: %', r;
  select public.admin_barbearias() into r;
  raise notice 'contas listadas: %', json_array_length(r);
end $$;

\echo '--- TESTE 11: registrar pagamento reativa e soma 30 dias ---'
do $$
declare idb uuid; r json; antes date; depois date;
begin
  select id, expira_em into idb, antes from public.barbearias where nome = 'Barbearia B';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  perform public.admin_atualizar_barbearia(idb, 'suspensa', current_date - 5, null, null);
  select public.admin_registrar_pagamento(idb, 79.90, 'Pix', 30) into r;
  select expira_em into depois from public.barbearias where id = idb;
  raise notice 'pagamento: % (vencia %, agora %)', r, antes, depois;
end $$;

\echo '--- TESTE 12: ninguem vira admin pelo navegador (esperado: ERRO) ---'
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
  begin
    insert into public.admin_users (user_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
    raise warning 'FALHOU: virou admin sozinho!';
  exception when others then
    raise notice 'OK: nao virou admin (%).', sqlerrm;
  end;
end $$;

\echo '--- TESTE 13: inscricao de push e privada de cada usuario ---'
do $$
declare idb uuid; n int;
begin
  select id into idb from public.barbearias where nome = 'Barbearia A';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
  insert into public.push_subscriptions (barbearia_id, user_id, endpoint, p256dh, auth)
  values (idb, 'cccccccc-0000-0000-0000-000000000003', 'https://push.exemplo/abc', 'k1', 'k2');

  perform set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000004', true);
  select count(*) into n from public.push_subscriptions;
  raise notice 'inscricoes que OUTRO usuario da mesma casa ve (esperado 0): %', n;
end $$;
