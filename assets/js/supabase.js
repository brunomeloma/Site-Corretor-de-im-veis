/* Cria o cliente do Supabase.
   A biblioteca vem do arquivo /assets/vendor/supabase.js (carregado no <head>),
   então o sistema não depende de CDN nenhuma para abrir. */
import { CONFIG, configurado } from './config.js';

const lib = globalThis.supabase;

export const sb = (configurado() && lib)
  ? lib.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

/** Traduz os erros técnicos do Supabase para português de gente. */
export function traduzErro(erro) {
  if (!erro) return 'Erro desconhecido.';
  const m = (erro.message || String(erro)).toLowerCase();

  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (veja a caixa de entrada).';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail.';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('agendamentos_sem_conflito') || erro.code === '23P01')
    return 'Esse barbeiro já tem um atendimento nesse horário.';
  if (erro.code === '23505') return 'Esse registro já existe.';
  if (erro.code === '42501' || m.includes('row-level security'))
    return 'Você não tem permissão para essa ação.';
  if (m.includes('failed to fetch') || m.includes('networkerror'))
    return 'Sem conexão com o servidor. Verifique a internet.';
  return erro.message || 'Não deu certo. Tente de novo.';
}
