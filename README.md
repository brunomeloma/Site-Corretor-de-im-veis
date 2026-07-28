# ✂ BARBER PRO — Sistema de Gestão para Barbearias

SaaS completo de barbearia: agenda, clientes, financeiro, comissões, produtos,
fidelidade, link público de agendamento, notificações no celular e painel do
administrador do site.

**Como funciona por baixo:** site em HTML/CSS/JavaScript puro (sem framework),
banco e login no **Supabase**, funções de servidor e publicação na **Vercel**.
Quem protege os dados é a **RLS** do banco — nem trocando ids no navegador uma
barbearia enxerga a outra.

---

## O que o sistema faz

**Agenda** — visão do dia por barbeiro, respeitando horário de trabalho e duração
do serviço · encaixe/walk-in · confirmar, atendido, faltou, cancelar · WhatsApp com
mensagem pronta · trava no banco contra dois clientes no mesmo horário.

**Clientes** — cadastro com telefone, aniversário e preferências ("máquina 2 nas
laterais") · busca · histórico de cortes · cartão fidelidade.

**Caixa** — venda com vários itens (serviços, produtos, valor avulso), desconto e
forma de pagamento · taxa da maquininha descontada sozinha · comissão automática ·
fechamento de caixa (bater a gaveta) · cobrança em um toque a partir da agenda.

**Relatórios (dono)** — faturamento, taxas, comissões, despesas e a sobra no fim ·
ranking de barbeiros · serviços mais vendidos · horários de pico.

**Produtos** — revenda com estoque que baixa na venda, aviso de estoque baixo e
comissão própria por produto.

**Equipe** — o dono cria os logins de barbeiro e recepção, troca senha e remove
acesso, tudo por uma função de servidor.

**Link público** — `seusite.com/agendar/sua-barbearia`: o cliente marca sozinho,
só nos horários realmente livres.

**Notificações** — aviso no celular/PC X minutos antes do atendimento, mesmo com
o app fechado.

**Painel do administrador do site** — todas as barbearias, inadimplentes, receita
por mês, registrar pagamento, suspender e apagar conta.

**Papéis:** dono vê tudo · barbeiro vê só a própria agenda e os próprios ganhos ·
recepção agenda e vende, mas só enxerga as vendas de hoje.

---

## Estrutura das pastas

```
index.html                 entrar / criar conta
app.html                   o sistema
agendar.html               página pública de agendamento do cliente
admin.html                 painel do administrador do site
nova-senha.html            redefinir senha
sw.js                      service worker (notificações push)
manifest.webmanifest       instalar como app no celular
vercel.json                publicação, rota /agendar/:slug e cron do push
package.json               dependências SÓ das funções de servidor

api/                       funções de servidor (Vercel)
  _lib/auth.js             valida token, descobre papel e barbearia
  equipe.js                criar / trocar senha / remover login da equipe
  push-lembretes.js        cron de 1 em 1 minuto que dispara os avisos
  admin-conta.js           apagar conta (só admin, com senha e confirmação)

sql/
  TUDO.sql                 ← RODE ESTE (junta as migrações 001 a 007)
  001..007_*.sql           as migrações separadas, em ordem
  testes/                  testes automáticos de segurança

assets/
  css/style.css            todo o visual (tokens de design, tema claro/escuro)
  vendor/supabase.js       biblioteca do Supabase (sem CDN)
  js/
    config.js              chaves do Supabase e do push
    supabase.js  ui.js  push.js  app.js  entrar.js  agendar.js  admin.js
    telas/  agenda · clientes · caixa · relatorios · ganhos ·
            servicos · produtos · barbeiros · equipe · ajustes
```

---

# GUIA DE INSTALAÇÃO (o que só você pode fazer)

São 6 passos. Reserve uns 30 minutos na primeira vez.

## Passo 1 — Criar o banco (5 min)

1. Entre em [supabase.com](https://supabase.com) e abra seu projeto.
2. Menu da esquerda → **SQL Editor** → **New query**.
3. Abra o arquivo **`sql/TUDO.sql`** deste repositório, copie **tudo** e cole lá.
4. Clique em **RUN** e espere aparecer *Success*.

> É seguro: não apaga nenhum dado e pode ser rodado de novo quantas vezes quiser.
> Aparecem várias mensagens amarelas de "does not exist, skipping" — é normal.

## Passo 2 — Você vira o administrador do site (1 min)

Primeiro **crie sua conta** no site (a mesma que você vai usar). Depois, no
**SQL Editor**, rode isto trocando o e-mail:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'seu@email.com'
on conflict do nothing;
```

A partir daí aparece o item **🛡️ Painel do site** no menu, e `/admin.html` abre.

## Passo 3 — Colocar as chaves no código (3 min)

No Supabase: **Project Settings → API**. Copie os dois valores e cole em
`assets/js/config.js`:

```js
const PADRAO = {
  url: 'https://xxxxxxxx.supabase.co',   // Project URL
  anonKey: 'eyJhbGciOiJIUzI1...',        // chave anon public
  vapidPublica: ''                       // preenchemos no passo 5
};
```

São valores **públicos** — podem ficar no código. Existe **um único projeto
Supabase** (o seu) para todas as barbearias; o cliente nunca vê tela de chave.

## Passo 4 — Login por e-mail (3 min)

Supabase → **Authentication → Providers → Email**: deixe ligado.

- **Para testar agora:** desligue "Confirm email".
- **Antes do primeiro cliente pagante:** ligue "Confirm email" e configure SMTP
  próprio em **Project Settings → Authentication → SMTP**. Sugestão (grátis até
  3.000 e-mails/mês): crie conta no [Resend](https://resend.com), gere uma API Key
  e preencha: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API
  key, remetente `nao-responda@seudominio.com`.

Em **Authentication → URL Configuration**, coloque em *Site URL* o endereço do
site publicado (ex.: `https://barberpro.vercel.app`).

## Passo 5 — Chaves das notificações (VAPID) (3 min)

No seu computador, com Node instalado, rode:

```bash
npx web-push generate-vapid-keys
```

Ele imprime duas chaves:

- **Public Key** → cole em `assets/js/config.js`, no campo `vapidPublica`.
- **Private Key** → **nunca** vai no código; ela entra na Vercel no passo 6.

## Passo 6 — Publicar na Vercel (10 min)

1. [vercel.com](https://vercel.com) → **Add New → Project** → escolha este repositório.
2. **Framework Preset:** `Other`. Sem comando de build.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre:

| Nome | Onde achar o valor |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → chave **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → chave **service_role** ⚠️ segredo |
| `VAPID_PUBLIC_KEY` | a Public Key do passo 5 |
| `VAPID_PRIVATE_KEY` | a Private Key do passo 5 ⚠️ segredo |
| `VAPID_SUBJECT` | `mailto:seu@email.com` |
| `CRON_SECRET` | invente uma senha longa (ex.: 30 letras aleatórias) |

4. **Deploy**. O cron das notificações liga sozinho (está no `vercel.json`).

**Atalho:** em vez de cadastrar as 7 variáveis na mão, rode no terminal, dentro da
pasta do projeto:

```bash
bash configurar-vercel.sh
```

Ele gera as chaves VAPID, pergunta as do Supabase, cadastra tudo na Vercel e
ainda imprime o `config.js` pronto para você colar. Os passos 5 e 6 viram um só.

> ⚠️ A `service_role` dá poder total no banco. Ela só existe na Vercel, nunca no
> código do site. Se vazar, gere outra no Supabase na hora.

---

## Depois de instalar: o que fazer dentro do sistema

1. Crie sua conta e a barbearia (14 dias de teste grátis).
2. **Barbeiros** → cadastre quem atende, com dias, horários e comissão.
3. **Serviços** → ajuste preços e durações (4 já vêm prontos).
4. **Produtos** → o que você revende, se vender.
5. **Relatórios → Taxas das maquininhas** → coloque as suas taxas reais.
6. **Equipe** → crie os logins do time (a senha aparece **uma vez**; anote e entregue).
7. **Ajustes** → ligue as notificações, copie o link de auto-agendamento e ligue a
   fidelidade se quiser.

---

## Testar antes de abrir para clientes

O roteiro completo está em **[TESTES.md](TESTES.md)** — inclusive o teste de
isolamento entre duas contas, que é o mais importante de todos.

Para rodar na sua máquina:

```bash
python3 -m http.server 8080
```

E abra `http://localhost:8080` (não funciona com duplo clique no arquivo).
Em `localhost` aparece uma telinha para colar as chaves sem editar o código.
