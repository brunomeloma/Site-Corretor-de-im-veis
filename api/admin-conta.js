/* =====================================================================
   /api/admin-conta — apagar a conta de uma barbearia (só o ADMIN DO SITE).

   Regras de segurança:
   - só o administrador do site chama;
   - a senha do admin é conferida de novo, na hora;
   - conta de administrador NUNCA é apagada;
   - o nome da barbearia precisa ser digitado igualzinho para confirmar.
   ===================================================================== */
import { admin, json, erro, usuarioDoToken, ehAdminDoSite, corpo, metodo } from './_lib/auth.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (!metodo(req, res, 'POST')) return;

  const user = await usuarioDoToken(req);
  if (!user) return erro(res, 401, 'Faça login de novo.');
  if (!(await ehAdminDoSite(user))) return erro(res, 403, 'Só o administrador do site.');

  const { barbearia_id: id, senha, confirmacao } = await corpo(req);
  if (!id) return erro(res, 400, 'Barbearia não informada.');
  if (!senha) return erro(res, 400, 'Digite sua senha de administrador.');

  // 1) confere a senha do admin agora (não basta ter o token)
  const publico = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  const { error: eSenha } = await publico.auth.signInWithPassword({ email: user.email, password: senha });
  if (eSenha) return erro(res, 403, 'Senha do administrador incorreta.');

  // 2) confere o nome digitado
  const { data: barbearia } = await admin.from('barbearias')
    .select('id, nome, dono_user_id').eq('id', id).maybeSingle();
  if (!barbearia) return erro(res, 404, 'Barbearia não encontrada.');
  if (String(confirmacao || '').trim() !== barbearia.nome)
    return erro(res, 400, 'O nome digitado não confere com o nome da barbearia.');

  // 3) nunca apaga conta de administrador
  const { data: membros } = await admin.from('membros').select('user_id').eq('barbearia_id', id);
  const ids = (membros || []).map((m) => m.user_id);
  const { data: admins } = await admin.from('admin_users').select('user_id').in('user_id', ids.length ? ids : ['-']);
  const idsAdmin = new Set((admins || []).map((a) => a.user_id));
  if (idsAdmin.has(barbearia.dono_user_id))
    return erro(res, 403, 'Essa conta pertence a um administrador do site. Não pode ser apagada.');

  // 4) apaga a barbearia (os dados caem junto por causa do "on delete cascade")
  const { error: eDel } = await admin.from('barbearias').delete().eq('id', id);
  if (eDel) { console.error(eDel); return erro(res, 500, 'Não consegui apagar a barbearia.'); }

  // 5) apaga os logins que não pertencem a mais nenhuma barbearia (menos admins)
  let logins = 0;
  for (const uid of ids) {
    if (idsAdmin.has(uid)) continue;
    const { data: outros } = await admin.from('membros').select('barbearia_id').eq('user_id', uid);
    if (!outros || outros.length === 0) {
      await admin.auth.admin.deleteUser(uid);
      logins++;
    }
  }

  return json(res, 200, { ok: true, logins_removidos: logins });
}
