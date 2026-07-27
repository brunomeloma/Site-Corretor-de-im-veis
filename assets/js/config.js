/* =====================================================================
   Configuração do Supabase.
   Estes dois valores são PÚBLICOS (podem ficar no código; quem protege
   os dados é a RLS do banco). Preencha aqui OU pela telinha de setup
   que aparece no site quando estiverem vazios.
   ===================================================================== */

const PADRAO = {
  url: '',        // ex.: https://abcdefgh.supabase.co
  anonKey: ''     // ex.: eyJhbGciOi... (chave "anon public")
};

function salvo() {
  try { return JSON.parse(localStorage.getItem('bp_config') || '{}'); }
  catch { return {}; }
}

export const CONFIG = {
  url: PADRAO.url || salvo().url || '',
  anonKey: PADRAO.anonKey || salvo().anonKey || ''
};

export const configurado = () => Boolean(CONFIG.url && CONFIG.anonKey);

export function salvarConfig(url, anonKey) {
  localStorage.setItem('bp_config', JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
}

export const APP = {
  nome: 'BARBER PRO',
  diasTeste: 14
};
