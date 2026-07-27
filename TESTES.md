# Testes obrigatórios antes de publicar

São três testes. O nº 1 é o mais importante de todos: se ele falhar,
**não publique** — uma barbearia estaria vendo dados da outra.

Você vai precisar de: 2 e-mails diferentes e 2 navegadores (ou uma janela
normal + uma janela anônima).

---

## Teste 1 — Isolamento entre duas barbearias

### Preparar
1. Navegador A → crie a conta `teste-a@seuemail.com` → barbearia **"Barbearia A"**.
2. Em A: cadastre 1 barbeiro ("Barbeiro A"), 1 cliente ("Cliente A") e 1 agendamento.
3. Navegador B (anônimo) → crie a conta `teste-b@seuemail.com` → barbearia **"Barbearia B"**.
4. Em B: cadastre 1 barbeiro ("Barbeiro B") e 1 cliente ("Cliente B").

### Verificar pela tela (o básico)
- Em B, nas telas Clientes / Barbeiros / Serviços / Agenda: **nada da Barbearia A**
  pode aparecer. E vice-versa.

### Verificar "trocando ids na mão" (o que importa de verdade)
1. No **Navegador A**, com o sistema aberto, aperte `F12` → aba **Console**.
2. Cole isto e aperte Enter — ele mostra o id da Barbearia A:

```js
console.log('ID desta barbearia:', localStorage.getItem('bp_barbearia'));
```

3. **Anote o id** que apareceu (algo como `3f2b...`).
4. Vá para o **Navegador B**, `F12` → Console, e cole o bloco abaixo,
   trocando `COLE_O_ID_DA_A_AQUI` pelo id anotado:

```js
const idA = 'COLE_O_ID_DA_A_AQUI';
const { sb } = await import('/assets/js/supabase.js');

// 1) tentar LER os clientes da outra barbearia
const leitura = await sb.from('clientes').select('*').eq('barbearia_id', idA);
console.log('LEITURA — deve vir lista vazia []:', leitura.data, leitura.error);

// 2) tentar LER a agenda da outra barbearia
const agenda = await sb.from('agendamentos').select('*').eq('barbearia_id', idA);
console.log('AGENDA — deve vir lista vazia []:', agenda.data, agenda.error);

// 3) tentar GRAVAR um cliente dentro da outra barbearia
const escrita = await sb.from('clientes').insert({ barbearia_id: idA, nome: 'INVASOR' });
console.log('ESCRITA — deve dar ERRO:', escrita.error);

// 4) tentar espiar TODAS as barbearias do sistema
const todas = await sb.from('barbearias').select('id,nome');
console.log('BARBEARIAS VISÍVEIS — deve mostrar só a sua:', todas.data);
```

### Resultado esperado (tem que ser exatamente assim)
| Teste | Resultado correto |
|---|---|
| 1) leitura de clientes | `[]` (lista vazia), sem erro |
| 2) leitura da agenda | `[]` (lista vazia) |
| 3) escrita | **erro** (`new row violates row-level security policy`) |
| 4) barbearias visíveis | só a **Barbearia B** |

❌ Se qualquer linha da Barbearia A aparecer, ou se a escrita funcionar,
**pare e me avise** — tem falha de isolamento.

---

## Teste 2 — Trava de horário duplicado (no banco)

Este roda direto no Supabase, sem passar pelo site — é a prova de que a trava
é do banco e não da tela.

1. Supabase → **SQL Editor** → New query.
2. Cole e rode (troque os dois ids pelos de verdade; a primeira consulta te mostra):

```sql
-- descubra os ids
select id as barbearia_id from barbearias limit 1;
select id as barbeiro_id, barbearia_id from barbeiros limit 1;
```

3. Agora tente criar dois atendimentos que se cruzam para o MESMO barbeiro:

```sql
begin;

insert into agendamentos (barbearia_id, barbeiro_id, cliente_nome, inicio, fim, preco)
values ('COLE_BARBEARIA_ID', 'COLE_BARBEIRO_ID', 'Teste 1',
        now() + interval '1 day', now() + interval '1 day 30 minutes', 40);

-- este aqui TEM QUE FALHAR (começa 15 min depois, em cima do primeiro)
insert into agendamentos (barbearia_id, barbeiro_id, cliente_nome, inicio, fim, preco)
values ('COLE_BARBEARIA_ID', 'COLE_BARBEIRO_ID', 'Teste 2',
        now() + interval '1 day 15 minutes', now() + interval '1 day 45 minutes', 40);

rollback;  -- desfaz tudo: nada fica salvo
```

**Resultado esperado:** o segundo `insert` falha com
`conflicting key value violates exclusion constraint "agendamentos_sem_conflito"`.
O `rollback` no final garante que nada foi gravado.

Depois teste também pela tela: agende 10:00 com o mesmo barbeiro duas vezes —
a segunda tem que mostrar *"Esse barbeiro já tem um atendimento nesse horário."*

---

## Teste 3 — Nenhuma barbearia fantasma

No SQL Editor:

```sql
-- Deve retornar ZERO linhas: ninguém pode ter barbearia sem ser o dono dela.
select b.id, b.nome, b.dono_user_id
  from barbearias b
  left join membros m
    on m.barbearia_id = b.id and m.user_id = b.dono_user_id and m.papel = 'dono'
 where m.user_id is null;

-- Deve retornar ZERO linhas: nenhuma barbearia sem nenhum membro.
select b.id, b.nome from barbearias b
 where not exists (select 1 from membros m where m.barbearia_id = b.id);

-- Deve listar ZERO gatilhos criando conta automática.
select tgname from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;
```

---

## Depois dos testes: limpar

As barbearias de teste podem ficar (não atrapalham) ou você apaga com calma
depois, pelo painel do admin — que entra numa etapa mais à frente.

---

## Teste automático que EU já rodei

O arquivo `sql/testes/teste_rls.sql` sobe um Postgres limpo, roda as migrações
`001` e `002` e simula três usuários (dono A, dono B e funcionário C) para provar
o isolamento. Resultado da última execução — **10 de 10 passaram**:

| # | O que testa | Resultado |
|---|---|---|
| 1 | B lista barbearias | só a dele |
| 2 | B lista clientes | só os dele |
| 3 | B lista agendamentos da A | 0 |
| 4 | B lê clientes da A trocando o id na mão | 0 (nada vazou) |
| 5 | B grava dentro da barbearia A | bloqueado pela RLS |
| 6 | dois atendimentos no mesmo barbeiro/horário | bloqueado pelo banco |
| 7 | funcionário cria barbearia própria | bloqueado (sem barbearia fantasma) |
| 8 | funcionário enxerga a barbearia do patrão | sim, a correta |
| 9 | funcionário se promove a dono por fora | bloqueado |
| 10 | barbearia sem dono / órfã | 0 |

Isso **não substitui** o Teste 1 lá em cima: aqui o `auth.uid()` foi simulado.
No Supabase de verdade ele vem do token do login — por isso vale repetir o teste
com duas contas reais antes de publicar.
