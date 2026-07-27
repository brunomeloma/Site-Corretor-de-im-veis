/* Tela SERVIÇOS — nome, duração e preço (só o dono acessa). */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import { $, esc, modal, confirmar, aviso, erro as toastErro, money } from '../ui.js';

let lista = [];
let caixa;

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const { data, error } = await sb.from('servicos').select('*')
    .eq('barbearia_id', estado.barbearia.id).order('nome');
  if (error) throw error;
  lista = data;
}

function desenha() {
  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Serviços</h1>
        <p class="muted" style="margin:0">A duração define quanto tempo o horário fica reservado.</p>
      </div>
      <button class="btn btn-primary" id="btnNovo">+ Serviço</button>
    </div>
    <div class="card">
      ${lista.length === 0 ? '<div class="vazio">Nenhum serviço cadastrado.</div>' : `
        <div class="tabela-wrap"><table>
          <thead><tr><th>Serviço</th><th>Duração</th><th>Preço</th><th>Situação</th><th></th></tr></thead>
          <tbody>${lista.map((s) => `
            <tr>
              <td><b>${esc(s.nome)}</b></td>
              <td>${s.duracao_min} min</td>
              <td>${money(s.preco)}</td>
              <td>${s.ativo ? '<span class="chip chip-ok">ativo</span>' : '<span class="chip">inativo</span>'}</td>
              <td style="text-align:right"><button class="btn btn-sm" data-edit="${esc(s.id)}">✎</button></td>
            </tr>`).join('')}
          </tbody></table></div>`}
    </div>`;

  $('#btnNovo', caixa).addEventListener('click', () => form());
  caixa.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => form(lista.find((s) => s.id === b.dataset.edit))));
}

function form(s) {
  const dlg = modal({
    titulo: s ? 'Editar serviço' : 'Novo serviço',
    corpo: `
      <div class="campo">
        <label for="nome">Nome</label>
        <input id="nome" value="${esc(s?.nome || '')}" placeholder="Ex.: Corte + Barba">
      </div>
      <div class="linha">
        <div class="campo">
          <label for="dur">Duração (minutos)</label>
          <input id="dur" type="number" min="5" max="600" step="5" value="${esc(s?.duracao_min ?? 30)}">
        </div>
        <div class="campo">
          <label for="preco">Preço (R$)</label>
          <input id="preco" type="number" min="0" step="0.01" value="${esc(s?.preco ?? 0)}">
        </div>
      </div>
      <div class="campo">
        <label for="ativo">Situação</label>
        <select id="ativo">
          <option value="1" ${s?.ativo !== false ? 'selected' : ''}>Ativo (aparece na agenda)</option>
          <option value="0" ${s?.ativo === false ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
      ${s ? '<button class="btn btn-sm btn-danger" data-excluir>Excluir serviço</button>' : ''}`,
    onOk: async (d) => {
      const nome = d.querySelector('#nome').value.trim();
      const dur = Number(d.querySelector('#dur').value);
      if (!nome) { toastErro('Dê um nome ao serviço.'); return false; }
      if (!(dur > 0)) { toastErro('A duração precisa ser maior que zero.'); return false; }
      const linha = {
        barbearia_id: estado.barbearia.id,
        nome, duracao_min: dur,
        preco: Number(d.querySelector('#preco').value) || 0,
        ativo: d.querySelector('#ativo').value === '1'
      };
      const q = s ? sb.from('servicos').update(linha).eq('id', s.id) : sb.from('servicos').insert(linha);
      const { error } = await q;
      if (error) { toastErro(traduzErro(error)); return false; }
      aviso('Serviço salvo.');
      await carregar(); desenha();
    }
  });

  dlg.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    dlg.close();
    if (!await confirmar(`Excluir "${s.nome}"? Se ele já foi usado em agendamentos, prefira deixá-lo inativo.`)) return;
    const { error } = await sb.from('servicos').delete().eq('id', s.id);
    if (error) return toastErro(traduzErro(error));
    aviso('Serviço excluído.');
    await carregar(); desenha();
  });
}
