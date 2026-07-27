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
