/* =====================================================================
   /api/equipe — o dono cria, reseta a senha e remove os logins da equipe.

   Só o DONO pode chamar. A barbearia é descoberta pelo token, nunca pelo
   corpo do pedido. Senha nunca volta em texto para lugar nenhum além da
   resposta única de criação (para o dono anotar e entregar ao funcionário).
   ===================================================================== */
import { admin, json, erro, usuarioDoToken, barbeariaDoDono, corpo, metodo } from './_lib/auth.js';

const PAPEIS = ['barbeiro', 'recepcao'];

export default async function handler(req, res) {
  if (!metodo(req, res, 'POST')) return;

  const user = await usuarioDoToken(req);
  if (!user) return erro(res, 401, 'Faça login de novo.');

  const barbearia = await barbeariaDoDono(user);
  if (!barbearia) return erro(res, 403, 'Só o dono da barbearia pode mexer nos logins da equipe.');

  const dados = await corpo(req);
  const acao = dados.acao;

  try {
    if (acao === 'criar') return await criar(res, barbearia, dados);
    if (acao === 'resetar') return await resetar(res, barbearia, dados);
    if (acao === 'remover') return await remover(res, barbearia, dados, user);
    return erro(res, 400, 'Ação desconhecida.');
  } catch (e) {
    console.error(e);
    return erro(res, 500, 'Não deu certo. Tente de novo em instantes.');
  }
}

/* ------------------------------ criar ------------------------------- */
async function criar(res, barbearia, dados) {
  const email = String(dados.email || '').trim().toLowerCase();
  const nome = String(dados.nome || '').trim();
  const papel = String(dados.papel || '');
  const senha = String(dados.senha || '');
  const barbeiroId = dados.barbeiro_id || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro(res, 400, 'E-mail inválido.');
  if (nome.length < 2) return erro(res, 400, 'Informe o nome da pessoa.');
  if (!PAPEIS.includes(papel)) return erro(res, 400, 'Escolha barbeiro ou recepção.');
  if (senha.length < 6) return erro(res, 400, 'A senha precisa ter pelo menos 6 caracteres.');

  // Se o barbeiro foi indicado, ele tem que ser desta barbearia.
  if (barbeiroId) {
    const { data: b } = await admin.from('barbeiros').select('id')
      .eq('id', barbeiroId).eq('barbearia_id', barbearia.id).maybeSingle();
    if (!b) return erro(res, 400, 'Barbeiro inválido.');
  }

  const { data: criado, error } = await admin.auth.admin.createUser({
    email, password: senha,
    email_confirm: true,                       // login de equipe já entra
    user_metadata: { nome },
    app_metadata: { papel, barbearia_id: barbearia.id }  // marca: é da equipe
  });

  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('already') || m.includes('registered'))
      return erro(res, 409, 'Já existe um login com esse e-mail.');
    return erro(res, 400, error.message);
  }

  const novoId = criado.user.id;

  const { error: e2 } = await admin.from('membros')
    .insert({ user_id: novoId, barbearia_id: barbearia.id, papel });
  if (e2) {
    await admin.auth.admin.deleteUser(novoId);   // não deixa login órfão
    return erro(res, 500, 'Não consegui vincular a pessoa à barbearia.');
  }

  if (barbeiroId) {
    await admin.from('barbeiros').update({ user_id: novoId })
      .eq('id', barbeiroId).eq('barbearia_id', barbearia.id);
  }

  return json(res, 200, { ok: true, user_id: novoId, email });
}

/* ----------------------------- resetar ------------------------------ */
async function resetar(res, barbearia, dados) {
  const userId = String(dados.user_id || '');
  const senha = String(dados.senha || '');
  if (senha.length < 6) return erro(res, 400, 'A senha precisa ter pelo menos 6 caracteres.');

  const membro = await membroDaCasa(barbearia.id, userId);
  if (!membro) return erro(res, 403, 'Essa pessoa não é da sua barbearia.');
  if (membro.papel === 'dono') return erro(res, 403, 'A senha do dono é trocada pelo "Esqueci minha senha".');

  const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
  if (error) return erro(res, 400, error.message);
  return json(res, 200, { ok: true });
}

/* ----------------------------- remover ------------------------------ */
async function remover(res, barbearia, dados, user) {
  const userId = String(dados.user_id || '');
  if (userId === user.id) return erro(res, 400, 'Você não pode remover a si mesmo.');

  const membro = await membroDaCasa(barbearia.id, userId);
  if (!membro) return erro(res, 403, 'Essa pessoa não é da sua barbearia.');
  if (membro.papel === 'dono') return erro(res, 403, 'Não dá para remover o dono.');

  // solta o cadastro do barbeiro (o histórico de atendimentos continua)
  await admin.from('barbeiros').update({ user_id: null })
    .eq('barbearia_id', barbearia.id).eq('user_id', userId);
  await admin.from('membros').delete().eq('barbearia_id', barbearia.id).eq('user_id', userId);

  // Se a pessoa não pertence a mais nenhuma barbearia, apaga o login.
  const { data: outros } = await admin.from('membros').select('barbearia_id').eq('user_id', userId);
  if (!outros || outros.length === 0) await admin.auth.admin.deleteUser(userId);

  return json(res, 200, { ok: true });
}

async function membroDaCasa(barbeariaId, userId) {
  if (!userId) return null;
  const { data } = await admin.from('membros').select('papel')
    .eq('barbearia_id', barbeariaId).eq('user_id', userId).maybeSingle();
  return data;
}
