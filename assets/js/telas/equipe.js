/* =====================================================================
   Tela EQUIPE — o dono cria os logins de barbeiro e recepção.
   O login é criado por uma função de servidor (/api/equipe): a senha é
   guardada só como código embaralhado pelo Supabase, e a barbearia é
   descoberta pelo token do dono, nunca pelo que o navegador manda.
   ===================================================================== */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import { $, esc, modal, confirmar, aviso, erro as toastErro, estadoVazio, dataCurta, iso } from '../ui.js';

let caixa;
let equipe = [];
let barbeiros = [];

const PAPEIS = { dono: 'Dono', barbeiro: 'Barbeiro', recepcao: 'Recepção' };

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const [e, b] = await Promise.all([
    sb.rpc('equipe_da_barbearia', { p_barbearia: estado.barbearia.id }),
    sb.from('barbeiros').select('id,nome,user_id').eq('barbearia_id', estado.barbearia.id)
      .eq('ativo', true).order('nome')
  ]);
  if (e.error) throw e.error;
  if (b.error) throw b.error;
  equipe = e.data || [];
  barbeiros = b.data || [];
}

function desenha() {
  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Equipe</h1>
        <p class="muted" style="margin:0">Quem tem login para entrar no sistema.</p>
      </div>
      <button class="btn btn-primary" id="btnNovo">+ Criar login</button>
    </div>

    <div class="card">
      ${equipe.length === 0 ? estadoVazio({ icone: '🔑', titulo: 'Só você por enquanto' }) : `
        <div class="tabela-wrap"><table>
          <thead><tr><th>Pessoa</th><th>E-mail</th><th>Função</th><th>Último acesso</th><th></th></tr></thead>
          <tbody>${equipe.map((p) => `
            <tr>
              <td><b>${esc(p.nome || p.barbeiro_nome || '—')}</b>
                  ${p.barbeiro_nome ? `<br><span class="muted t-xs">agenda: ${esc(p.barbeiro_nome)}</span>` : ''}</td>
              <td class="muted">${esc(p.email)}</td>
              <td><span class="chip ${p.papel === 'dono' ? 'chip-marca' : ''}">${esc(PAPEIS[p.papel] || p.papel)}</span></td>
              <td class="muted t-sm">${p.last_sign_in_at ? esc(dataCurta(iso(new Date(p.last_sign_in_at)))) : 'nunca entrou'}</td>
              <td style="text-align:right;white-space:nowrap">
                ${p.papel === 'dono' ? '' : `
                  <button class="btn btn-sm" data-senha="${esc(p.user_id)}">Trocar senha</button>
                  <button class="btn btn-sm btn-danger" data-remover="${esc(p.user_id)}">Remover</button>`}
              </td>
            </tr>`).join('')}
          </tbody></table></div>`}
    </div>

    <div class="card">
      <h2>Como funciona</h2>
      <ul class="muted t-sm" style="margin:0;padding-left:1.1rem">
        <li><b>Barbeiro</b>: vê a própria agenda e os próprios ganhos. Não vê o caixa da barbearia.</li>
        <li><b>Recepção</b>: agenda, atende e registra vendas. Vê só as vendas de hoje.</li>
        <li>Ninguém além de você cria logins.</li>
        <li>Senha esquecida não é "mostrada" — você cria uma nova aqui e entrega à pessoa.</li>
      </ul>
    </div>`;

  $('#btnNovo', caixa).addEventListener('click', formNovo);
  caixa.querySelectorAll('[data-senha]').forEach((b) =>
    b.addEventListener('click', () => formSenha(equipe.find((p) => p.user_id === b.dataset.senha))));
  caixa.querySelectorAll('[data-remover]').forEach((b) =>
    b.addEventListener('click', () => remover(equipe.find((p) => p.user_id === b.dataset.remover))));
}

/* --------------------- conversa com a função de servidor ------------ */
async function chamaApi(corpo) {
  const { data: { session } } = await sb.auth.getSession();
  const resposta = await fetch('/api/equipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(corpo)
  });
  let dados = {};
  try { dados = await resposta.json(); } catch { /* resposta vazia */ }
  if (!resposta.ok) throw new Error(dados.erro || 'Não deu certo.');
  return dados;
}

const senhaSugerida = () =>
  'bp' + Math.random().toString(36).slice(2, 7) + Math.floor(Math.random() * 90 + 10);

function formNovo() {
  const livres = barbeiros.filter((b) => !b.user_id);
  const dlg = modal({
    titulo: 'Criar login para a equipe',
    okTexto: 'Criar login',
    corpo: `
      <div class="campo">
        <label for="qNome">Nome da pessoa</label>
        <input id="qNome" placeholder="Ex.: Zé Navalha">
      </div>
      <div class="campo">
        <label for="qEmail">E-mail (é o usuário para entrar)</label>
        <input id="qEmail" type="email" autocomplete="off" placeholder="ze@email.com">
      </div>
      <div class="campo">
        <label for="qPapel">Função</label>
        <select id="qPapel">
          <option value="barbeiro">Barbeiro — vê a própria agenda e os próprios ganhos</option>
          <option value="recepcao">Recepção — agenda e registra vendas do dia</option>
        </select>
      </div>
      <div class="campo" id="campoBarbeiro">
        <label for="qBarbeiro">Ligar a qual barbeiro da agenda?</label>
        <select id="qBarbeiro">
          <option value="">— escolher depois —</option>
          ${livres.map((b) => `<option value="${esc(b.id)}">${esc(b.nome)}</option>`).join('')}
        </select>
        <p class="campo-dica">É isso que faz a agenda e a comissão dele aparecerem certas.</p>
      </div>
      <div class="campo">
        <label for="qSenha">Senha provisória</label>
        <input id="qSenha" value="${esc(senhaSugerida())}">
        <p class="campo-dica">Anote e entregue à pessoa. Ela pode trocar depois em "Esqueci minha senha".</p>
      </div>`,
    onOk: async (d) => {
      const papel = d.querySelector('#qPapel').value;
      try {
        await chamaApi({
          acao: 'criar',
          nome: d.querySelector('#qNome').value.trim(),
          email: d.querySelector('#qEmail').value.trim(),
          senha: d.querySelector('#qSenha').value,
          papel,
          barbeiro_id: papel === 'barbeiro' ? (d.querySelector('#qBarbeiro').value || null) : null
        });
      } catch (e) { toastErro(e.message); return false; }

      const email = d.querySelector('#qEmail').value.trim();
      const senha = d.querySelector('#qSenha').value;
      aviso('Login criado!');
      await carregar(); desenha();
      modal({
        titulo: 'Pronto! Entregue estes dados',
        corpo: `
          <p>Peça para a pessoa entrar em <b>${esc(location.origin)}</b> com:</p>
          <div class="resumo-venda">
            <div><span>E-mail</span><b>${esc(email)}</b></div>
            <div><span>Senha</span><b>${esc(senha)}</b></div>
          </div>
          <p class="muted t-sm">Esta é a única vez que a senha aparece. Se perder, é só criar outra.</p>`
      });
    }
  });

  const sel = dlg.querySelector('#qPapel');
  sel.addEventListener('change', () => {
    dlg.querySelector('#campoBarbeiro').hidden = sel.value !== 'barbeiro';
  });
}

function formSenha(p) {
  if (!p) return;
  modal({
    titulo: `Nova senha para ${p.email}`,
    okTexto: 'Trocar senha',
    corpo: `
      <p class="muted" style="margin-top:0">
        Ninguém consegue ver a senha antiga — nem eu, nem você. O jeito certo é criar uma nova.
      </p>
      <div class="campo">
        <label for="sNova">Nova senha</label>
        <input id="sNova" value="${esc(senhaSugerida())}">
      </div>`,
    onOk: async (d) => {
      const senha = d.querySelector('#sNova').value;
      try { await chamaApi({ acao: 'resetar', user_id: p.user_id, senha }); }
      catch (e) { toastErro(e.message); return false; }
      aviso('Senha trocada. Entregue a nova para a pessoa.');
    }
  });
}

async function remover(p) {
  if (!p) return;
  if (!await confirmar(
    `Remover o acesso de ${p.email}? Os atendimentos e vendas dele continuam guardados.`)) return;
  try { await chamaApi({ acao: 'remover', user_id: p.user_id }); }
  catch (e) { return toastErro(e.message); }
  aviso('Acesso removido.');
  await carregar(); desenha();
}
