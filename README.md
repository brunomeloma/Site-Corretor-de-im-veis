# ✂ BARBER PRO — Sistema de Gestão para Barbearias

Sistema web (SaaS) onde cada barbearia tem sua conta isolada: agenda por barbeiro,
clientes, serviços, financeiro, comissões e lembretes.

**Como funciona por baixo:** site em HTML/CSS/JavaScript puro (sem framework),
banco de dados e login no **Supabase**, publicação na **Vercel**.
Quem protege os dados é a **RLS** do banco — mesmo que alguém mexa no navegador,
não consegue ver dados de outra barbearia.

---

## Estrutura das pastas

```
index.html              → tela de entrar / criar conta
app.html                → o sistema (agenda, clientes, etc.)
nova-senha.html         → tela de redefinir senha
manifest.webmanifest    → deixa instalar como app no celular (PWA)
vercel.json             → configuração da publicação
sql/
  001_base.sql          → cria as tabelas e a segurança no Supabase
assets/
  css/style.css         → todo o visual
  img/icone.svg         → ícone do app
  vendor/supabase.js    → biblioteca do Supabase (guardada aqui, não depende de CDN)
  js/
    config.js           → onde ficam a URL e a chave do Supabase
    supabase.js         → conexão com o banco + tradução dos erros
    ui.js               → ajudantes (escapar texto, modais, datas, dinheiro)
    entrar.js           → lógica da tela de entrada
    app.js              → o "cérebro": sessão, papel do usuário, menu, telas
    telas/
      agenda.js   clientes.js   servicos.js   barbeiros.js   ajustes.js
```

---

## O que já funciona (Etapa 1)

- Criar conta, entrar, sair e recuperar senha
- Criar a barbearia (14 dias de teste grátis) com nome, telefone e **cor da marca**
- **Agenda do dia**, uma coluna por barbeiro, respeitando o horário de trabalho
- Agendar clicando num horário livre; a duração do serviço reserva o tempo certo
- **Encaixe** (cliente sem cadastro), editar, confirmar, marcar atendido/faltou, cancelar
- Botão de **WhatsApp** com mensagem de confirmação pronta
- Clientes: cadastro, busca, aniversário, observações e histórico de cortes
- Serviços: nome, duração e preço · Barbeiros: comissão, cor e horário de trabalho
- Papéis: **dono** vê tudo; **barbeiro** vê só a própria agenda; **recepção** agenda sem ver ajustes de negócio
- Tema claro/escuro, celular, instalável como app, e **backup** em arquivo

## O que vem nas próximas etapas

Financeiro e caixa · comissões calculadas · relatórios · produtos/estoque ·
fidelidade · logins da equipe (função serverless) · notificações push ·
link público de auto-agendamento · painel do admin do site · cobrança da assinatura.

---

## Configuração (o que VOCÊ precisa fazer)

### 1. Criar as tabelas no Supabase

1. Entre no [supabase.com](https://supabase.com) e abra seu projeto.
2. Menu da esquerda → **SQL Editor** → **New query**.
3. Abra o arquivo `sql/001_base.sql` deste repositório, copie **tudo** e cole lá.
4. Clique em **Run**. Deve aparecer *Success*.

> Esse script **não apaga nada**. Pode rodar de novo sem medo.

### 2. Pegar as chaves do projeto

No Supabase: **Project Settings → API**. Você precisa de dois valores:

| Nome lá no Supabase | Exemplo |
|---|---|
| Project URL | `https://abcdefgh.supabase.co` |
| anon public (API key) | `eyJhbGciOiJIUzI1...` |

Esses dois valores são **públicos** — podem ficar no código sem risco.

### 3. Colocar as chaves no sistema

Duas opções:

- **Fácil:** abra o site, cole os dois valores na telinha que aparece e clique em salvar.
- **Definitivo (recomendado quando publicar):** edite `assets/js/config.js` e preencha:

```js
const PADRAO = {
  url: 'https://abcdefgh.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1...'
};
```

### 4. Ajustar o login por e-mail

No Supabase → **Authentication → Providers → Email**:

- Deixe **Enable Email provider** ligado.
- Para testar rápido, **desligue "Confirm email"** (aí a conta já entra direto).
  Quando for pra valer, ligue de novo.

Em **Authentication → URL Configuration**, coloque em *Site URL* o endereço do seu
site (ex.: `https://barberpro.vercel.app`) — é pra onde o link de "nova senha" volta.

### 5. Publicar na Vercel

1. Em [vercel.com](https://vercel.com) → **Add New → Project** → escolha este repositório.
2. **Framework Preset:** `Other`. Não precisa comando de build.
3. **Deploy**. Pronto — o site sobe em `https://seu-projeto.vercel.app`.

### 6. Testar na sua máquina (opcional)

Dentro da pasta do projeto, rode no terminal:

```bash
python3 -m http.server 8080
```

E abra `http://localhost:8080`.
(Não funciona abrindo o arquivo com duplo clique — precisa de um servidor.)

---

## Roteiro de teste da Etapa 1

1. Crie sua conta em `/` → **Criar conta**.
2. Preencha o nome da barbearia e escolha uma cor — repare que o sistema muda de cor.
3. Menu **Barbeiros** → cadastre 2 barbeiros, com dias e horários diferentes.
4. Menu **Serviços** → confira os 4 serviços criados automaticamente; mude um preço.
5. Menu **Clientes** → cadastre um cliente com telefone e observação.
6. Menu **Agenda** → clique num horário livre e agende. Veja o bloco ocupar a duração certa.
7. **Tente agendar outro cliente no mesmo horário e barbeiro**: o sistema recusa
   ("Esse barbeiro já tem um atendimento nesse horário") — a trava é no banco.
8. Clique no agendamento → **WhatsApp** (mensagem pronta), **Atendido**, **Cancelar**.
9. **Ajustes** → troque o tema, baixe o backup.
10. **Isolamento:** crie uma segunda conta com outro e-mail e outra barbearia.
    Ela não pode enxergar nada da primeira.
