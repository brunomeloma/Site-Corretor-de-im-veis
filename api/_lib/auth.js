/* =====================================================================
   Ajudantes das funções serverless.

   REGRA DE OURO: o navegador manda só o token. Quem é o usuário, de qual
   barbearia ele é e com que papel — tudo isso é lido do banco AQUI, com a
   service role. Nada de confiar em id vindo do corpo da requisição.
   ===================================================================== */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_ROLE) {
  console.error('Faltam as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
}

/** Cliente com poderes de servidor. NUNCA exponha isso no navegador. */
export const admin = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export function json(res, status, corpo) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(corpo));
}

export const erro = (res, status, mensagem) => json(res, status, { erro: mensagem });

/** Descobre quem está chamando, pelo token do cabeçalho Authorization. */
export async function usuarioDoToken(req) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Confirma que o usuário é DONO de alguma barbearia e devolve qual.
 * A barbearia vem do banco, não do pedido.
 */
export async function barbeariaDoDono(user) {
  const { data, error } = await admin
    .from('membros')
    .select('barbearia_id, papel, barbearias(id, nome, status, expira_em)')
    .eq('user_id', user.id)
    .eq('papel', 'dono')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.barbearias;
}

/** Confirma que o usuário é o administrador do site. */
export async function ehAdminDoSite(user) {
  const { data } = await admin.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  return Boolean(data);
}

/** Lê o corpo JSON da requisição (a Vercel já entrega pronto na maioria dos casos). */
export async function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

/** Aceita só o método esperado. */
export function metodo(req, res, esperado) {
  if (req.method !== esperado) { erro(res, 405, 'Método não permitido.'); return false; }
  return true;
}
