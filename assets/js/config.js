/* =====================================================================
   Configuração do Supabase — MODELO SaaS.

   IMPORTANTE: existe UM único projeto Supabase (o meu, dono do sistema).
   Todas as barbearias usam ESTA MESMA url + chave anon. O cliente final
   NUNCA vê tela de chave nenhuma e NÃO tem Supabase próprio.

   Estes dois valores são públicos por natureza (quem protege os dados é a
   RLS do banco). Preencha UMA vez, aqui embaixo, e faça o deploy.
   ===================================================================== */

const PADRAO = {
  url: '',        // ex.: https://abcdefgh.supabase.co
  anonKey: ''     // ex.: eyJhbGciOi... (chave "anon public")
};

/* ---------------------------------------------------------------------
   A telinha de "colar as chaves" é SÓ FERRAMENTA DE DESENVOLVIMENTO.
   Ela só aparece quando o site está rodando na sua máquina (localhost).
   Em produção, se as chaves faltarem, o cliente vê "sistema indisponível"
   — nunca um formulário pedindo chave.
   --------------------------------------------------------------------- */
export const ehDesenvolvimento = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

function salvo() {
  if (!ehDesenvolvimento) return {};
  try { return JSON.parse(localStorage.getItem('bp_config') || '{}'); }
  catch { return {}; }
}

export const CONFIG = {
  url: PADRAO.url || salvo().url || '',
  anonKey: PADRAO.anonKey || salvo().anonKey || ''
};

export const configurado = () => Boolean(CONFIG.url && CONFIG.anonKey);

/** Só faz sentido em desenvolvimento (ver comentário acima). */
export function salvarConfig(url, anonKey) {
  if (!ehDesenvolvimento) return false;
  localStorage.setItem('bp_config', JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  return true;
}

export const APP = {
  nome: 'BARBER PRO',
  diasTeste: 14
};
