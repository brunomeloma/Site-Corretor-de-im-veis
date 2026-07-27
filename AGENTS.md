# BARBER PRO — instruções do projeto

Sistema SaaS de gestão para barbearias. **Não é um projeto Next.js/React.**

## Stack
- Front: HTML + CSS + JavaScript puro (ES modules), sem build. `index.html` (entrada)
  e `app.html` (SPA). Nada de framework, nada de npm no runtime.
- Banco/Auth/Storage: Supabase. A biblioteca fica vendorizada em
  `assets/vendor/supabase.js` (UMD) — não usar CDN.
- Publicação: Vercel (site estático + funções em `/api` quando entrarem).

## Regras obrigatórias
- **Multi-tenant com RLS de verdade:** toda tabela filtra por `barbearia_id` via
  as funções `SECURITY DEFINER` (`minhas_barbearias()`, `sou_dono()`, `sou_admin()`).
  Nunca confiar em id vindo do corpo da requisição.
- **Escapar todo conteúdo do usuário** antes de virar HTML: usar `esc()` de `ui.js`.
  Nada de `innerHTML` com texto cru vindo do banco.
- **Migrações SQL nunca apagam dados.** Só `create ... if not exists`, `drop policy`
  / `drop function` para recriar. Cada migração é um arquivo novo em `sql/`.
- Funções serverless: validar o token do usuário e derivar a barbearia **pelo token**;
  service role só no servidor, nunca no navegador.
- Interface e mensagens de erro em **português simples**, para usuário leigo.

## Convenções
- Código e nomes de variáveis em português.
- Cada tela vive em `assets/js/telas/<nome>.js` e exporta `render(container)`.
- Cores/tema por variáveis CSS; a cor da barbearia entra em `--brand`.

## Lições que não podem ser esquecidas
- **Chaves do Supabase**: modelo SaaS com UM projeto só. `assets/js/config.js` é a
  fonte da verdade. Tela de setup só em `localhost` (`ehDesenvolvimento`).
- **Nada de barbearia fantasma**: nenhum gatilho em `auth.users`; funcionário
  (`barbeiro`/`recepcao`) não pode inserir em `barbearias` (policy + `sou_funcionario()`);
  o login sempre confere `membros` ANTES de considerar posse.
- Toda mudança de segurança precisa passar em `sql/testes/teste_rls.sql`.
- **Financeiro por papel** (migração 003): recepção só enxerga o dia de hoje,
  barbeiro só o que é dele, relatórios só do dono — tudo checado no banco
  (policies + funções que validam `meu_papel()`), nunca só na tela.
