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
