#!/usr/bin/env bash
# =====================================================================
#  BARBER PRO — configura a Vercel de uma vez só
#
#  O que ele faz:
#    1. gera as chaves das notificações (VAPID) pra você
#    2. pergunta as chaves do Supabase
#    3. cadastra TODAS as variáveis de ambiente na Vercel
#    4. mostra a chave pública pra você colar no config.js
#
#  Como usar (no terminal, dentro da pasta do projeto):
#    bash configurar-vercel.sh
#
#  As senhas não aparecem na tela enquanto você digita e não ficam
#  salvas em arquivo nenhum.
# =====================================================================

set -euo pipefail

echo ""
echo "  ✂  BARBER PRO — configuração da Vercel"
echo "  ────────────────────────────────────────"
echo ""

# --------------------------------------------------------------- checagens
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node não encontrado. Instale em https://nodejs.org e rode de novo."
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "→ Instalando a ferramenta da Vercel (uma vez só)..."
  npm install -g vercel
fi

echo "→ Entrando na sua conta da Vercel (abre o navegador)..."
vercel login || true

echo "→ Ligando esta pasta ao projeto na Vercel..."
vercel link

# ------------------------------------------------------------ chaves VAPID
echo ""
echo "→ Gerando as chaves das notificações..."
CHAVES="$(npx --yes web-push generate-vapid-keys --json)"
VAPID_PUB="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).publicKey)" "$CHAVES")"
VAPID_PRIV="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).privateKey)" "$CHAVES")"
echo "  ✓ chaves geradas"

# ----------------------------------------------------------- dados do Supabase
echo ""
echo "  Agora os dados do Supabase (Project Settings → API)."
echo ""
read -rp "  Project URL (https://xxxx.supabase.co): " SUPA_URL
read -rp "  Chave anon public: " SUPA_ANON
echo ""
echo "  A próxima é SECRETA (não vai aparecer na tela enquanto digita):"
read -rsp "  Chave service_role: " SUPA_SERVICE
echo ""
read -rp "  Seu e-mail (para as notificações): " EMAIL

# segredo do cron, gerado sozinho
CRON_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")"

# ------------------------------------------------------- cadastra na Vercel
cadastrar() {
  local nome="$1" valor="$2"
  for ambiente in production preview development; do
    vercel env rm "$nome" "$ambiente" --yes >/dev/null 2>&1 || true
    printf '%s' "$valor" | vercel env add "$nome" "$ambiente" >/dev/null
  done
  echo "  ✓ $nome"
}

echo ""
echo "→ Cadastrando as variáveis na Vercel..."
cadastrar SUPABASE_URL "$SUPA_URL"
cadastrar SUPABASE_ANON_KEY "$SUPA_ANON"
cadastrar SUPABASE_SERVICE_ROLE_KEY "$SUPA_SERVICE"
cadastrar VAPID_PUBLIC_KEY "$VAPID_PUB"
cadastrar VAPID_PRIVATE_KEY "$VAPID_PRIV"
cadastrar VAPID_SUBJECT "mailto:$EMAIL"
cadastrar CRON_SECRET "$CRON_SECRET"

# -------------------------------------------------------------- config.js
echo ""
echo "  ────────────────────────────────────────"
echo "  FALTA SÓ ISTO: abra assets/js/config.js e deixe assim:"
echo ""
echo "  const PADRAO = {"
echo "    url: '$SUPA_URL',"
echo "    anonKey: '$SUPA_ANON',"
echo "    vapidPublica: '$VAPID_PUB'"
echo "  };"
echo ""
echo "  Depois salve, faça commit e envie (git push) — a Vercel publica sozinha."
echo "  ────────────────────────────────────────"
echo ""
read -rp "  Quer publicar agora mesmo? (s/N) " PUBLICAR
if [[ "${PUBLICAR,,}" == "s" ]]; then
  vercel --prod
fi

echo ""
echo "  ✓ Pronto. As notificações vão começar a rodar no próximo deploy."
echo ""
