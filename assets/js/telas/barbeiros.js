/* Tela BARBEIROS — cadastro, comissão e horário de trabalho (só o dono). */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, modal, confirmar, aviso, erro as toastErro, mascaraTelefone, DIAS, estadoVazio
} from '../ui.js';

let lista = [];
let caixa;

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const { data, error } = await sb.from('barbeiros').select('*')
    .eq('barbearia_id', estado.barbearia.id).order('nome');
  if (error) throw error;
  lista = data;
}

const resumoHorario = (h) => DIAS
  .map((d, i) => ((h || {})[String(i)] || []).length ? d.slice(0, 3) : null)
  .filter(Boolean).join(', ') || 'sem expediente';

function desenha() {
  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Barbeiros</h1>
        <p class="muted" style="margin:0">Quem atende, com que comissão e em quais dias.</p>
      </div>
      <button class="btn btn-primary" id="btnNovo">+ Barbeiro</button>
    </div>
    <div class="card">
      ${lista.length === 0 ? estadoVazio({ icone: '💈', titulo: 'Nenhum barbeiro cadastrado',
          texto: 'Cadastre quem atende, com os dias e horários de trabalho, para a agenda funcionar.' }) : `
        <div class="tabela-wrap"><table>
          <thead><tr><th></th><th>Nome</th><th>Comissão</th><th>Dias de trabalho</th><th>Situação</th><th></th></tr></thead>
          <tbody>${lista.map((b) => `
            <tr>
              <td><span class="ponto" style="display:inline-block;background:${esc(b.cor)}"></span></td>
              <td><b>${esc(b.nome)}</b><br><span class="muted" style="font-size:.8rem">${esc(b.telefone || '')}</span></td>
              <td>${esc(String(b.comissao_pct))}%</td>
              <td class="muted">${esc(resumoHorario(b.horarios))}</td>
              <td>${b.ativo ? '<span class="chip chip-ok">ativo</span>' : '<span class="chip">inativo</span>'}</td>
              <td style="text-align:right"><button class="btn btn-sm" data-edit="${esc(b.id)}">✎</button></td>
            </tr>`).join('')}
          </tbody></table></div>`}
    </div>
    <p class="muted t-sm" style="margin-top:1rem">
      O login do barbeiro (para ele ver a própria agenda no celular) entra na próxima etapa.
    </p>`;

  $('#btnNovo', caixa).addEventListener('click', () => form());
  caixa.querySelectorAll('[data-edit]').forEach((el) =>
    el.addEventListener('click', () => form(lista.find((b) => b.id === el.dataset.edit))));
}

function form(b) {
  const h = b?.horarios || {};
  const linhasDias = DIAS.map((nome, i) => {
    const faixa = (h[String(i)] || [])[0] || null;
    return `
      <tr>
        <td><label style="margin:0">
          <input type="checkbox" data-dia="${i}" style="width:auto" ${faixa ? 'checked' : ''}> ${esc(nome)}
        </label></td>
        <td><input type="time" data-de="${i}" value="${esc(faixa?.[0] || '09:00')}"></td>
        <td><input type="time" data-ate="${i}" value="${esc(faixa?.[1] || '19:00')}"></td>
      </tr>`;
  }).join('');

  const dlg = modal({
    titulo: b ? 'Editar barbeiro' : 'Novo barbeiro',
    largura: 560,
    corpo: `
      <div class="linha">
        <div class="campo">
          <label for="nome">Nome</label>
          <input id="nome" value="${esc(b?.nome || '')}">
        </div>
        <div class="campo">
          <label for="tel">Telefone</label>
          <input id="tel" inputmode="tel" value="${esc(b?.telefone || '')}">
        </div>
      </div>
      <div class="linha">
        <div class="campo">
          <label for="com">Comissão (%)</label>
          <input id="com" type="number" min="0" max="100" step="0.5" value="${esc(b?.comissao_pct ?? 40)}">
        </div>
        <div class="campo">
          <label for="cor">Cor na agenda</label>
          <input id="cor" type="color" value="${esc(b?.cor || '#3b82f6')}" style="height:44px;padding:.2rem">
        </div>
      </div>
      <div class="campo">
        <label for="ativo">Situação</label>
        <select id="ativo">
          <option value="1" ${b?.ativo !== false ? 'selected' : ''}>Ativo</option>
          <option value="0" ${b?.ativo === false ? 'selected' : ''}>Inativo (some da agenda)</option>
        </select>
      </div>
      <label>Horário de trabalho</label>
      <div class="tabela-wrap"><table>
        <thead><tr><th>Dia</th><th>Entra</th><th>Sai</th></tr></thead>
        <tbody>${linhasDias}</tbody>
      </table></div>
      ${b ? '<button class="btn btn-sm btn-danger" style="margin-top:1rem" data-excluir>Excluir barbeiro</button>' : ''}`,
    onOk: async (d) => {
      const nome = d.querySelector('#nome').value.trim();
      if (!nome) { toastErro('Informe o nome.'); return false; }

      const horarios = {};
      for (let i = 0; i < 7; i++) {
        if (!d.querySelector(`[data-dia="${i}"]`).checked) continue;
        const de = d.querySelector(`[data-de="${i}"]`).value;
        const ate = d.querySelector(`[data-ate="${i}"]`).value;
        if (!de || !ate || de >= ate) { toastErro(`Horário inválido em ${DIAS[i]}.`); return false; }
        horarios[String(i)] = [[de, ate]];
      }

      const linha = {
        barbearia_id: estado.barbearia.id,
        nome,
        telefone: d.querySelector('#tel').value.trim() || null,
        comissao_pct: Number(d.querySelector('#com').value) || 0,
        cor: d.querySelector('#cor').value,
        ativo: d.querySelector('#ativo').value === '1',
        horarios
      };
      const q = b ? sb.from('barbeiros').update(linha).eq('id', b.id) : sb.from('barbeiros').insert(linha);
      const { error } = await q;
      if (error) { toastErro(traduzErro(error)); return false; }
      aviso('Barbeiro salvo.');
      await carregar(); desenha();
    }
  });

  mascaraTelefone(dlg.querySelector('#tel'));
  dlg.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    dlg.close();
    if (!await confirmar(`Excluir "${b.nome}"? Isso apaga também os agendamentos dele. Para só tirar da agenda, deixe-o inativo.`)) return;
    const { error } = await sb.from('barbeiros').delete().eq('id', b.id);
    if (error) return toastErro(traduzErro(error));
    aviso('Barbeiro excluído.');
    await carregar(); desenha();
  });
}
