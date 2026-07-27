/* Tela CLIENTES — cadastro, busca, histórico e observações. */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, modal, confirmar, aviso, erro as toastErro, mascaraTelefone, soDigitos,
  dataCurta, horaDe, money, iso
} from '../ui.js';

let lista = [];
let busca = '';
let caixa;

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const { data, error } = await sb.from('clientes').select('*')
    .eq('barbearia_id', estado.barbearia.id).order('nome').limit(2000);
  if (error) throw error;
  lista = data;
}

function filtrados() {
  const t = busca.trim().toLowerCase();
  if (!t) return lista;
  const d = soDigitos(t);
  return lista.filter((c) =>
    c.nome.toLowerCase().includes(t) || (d && soDigitos(c.telefone).includes(d)));
}

function desenha() {
  const itens = filtrados();
  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Clientes</h1>
        <p class="muted" style="margin:0">${lista.length} cadastrado(s)</p>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <input id="busca" placeholder="Buscar por nome ou telefone" value="${esc(busca)}" style="width:auto;min-width:220px">
        <button class="btn btn-primary" id="btnNovo">+ Cliente</button>
      </div>
    </div>
    <div class="card">
      ${itens.length === 0
        ? '<div class="vazio">Nenhum cliente encontrado.</div>'
        : `<div class="tabela-wrap"><table>
            <thead><tr><th>Nome</th><th>Telefone</th><th>Aniversário</th><th>Observações</th><th></th></tr></thead>
            <tbody>${itens.map((c) => `
              <tr>
                <td><b>${esc(c.nome)}</b></td>
                <td>${esc(c.telefone || '-')}</td>
                <td>${c.aniversario ? esc(dataCurta(c.aniversario)) : '-'}</td>
                <td class="muted">${esc((c.observacoes || '').slice(0, 60))}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-sm" data-hist="${esc(c.id)}">Histórico</button>
                  <button class="btn btn-sm" data-edit="${esc(c.id)}">✎</button>
                </td>
              </tr>`).join('')}
            </tbody></table></div>`}
    </div>`;

  const inputBusca = $('#busca', caixa);
  inputBusca.addEventListener('input', (e) => {
    busca = e.target.value;
    const pos = e.target.selectionStart;
    desenha();
    const novo = $('#busca', caixa);
    novo.focus(); novo.setSelectionRange(pos, pos);
  });
  $('#btnNovo', caixa).addEventListener('click', () => form());
  caixa.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => form(lista.find((c) => c.id === b.dataset.edit))));
  caixa.querySelectorAll('[data-hist]').forEach((b) =>
    b.addEventListener('click', () => historico(lista.find((c) => c.id === b.dataset.hist))));
}

function form(c) {
  const dlg = modal({
    titulo: c ? 'Editar cliente' : 'Novo cliente',
    corpo: `
      <div class="campo">
        <label for="nome">Nome</label>
        <input id="nome" required value="${esc(c?.nome || '')}">
      </div>
      <div class="linha">
        <div class="campo">
          <label for="tel">Telefone / WhatsApp</label>
          <input id="tel" inputmode="tel" value="${esc(c?.telefone || '')}" placeholder="(11) 90000-0000">
        </div>
        <div class="campo">
          <label for="aniv">Aniversário</label>
          <input id="aniv" type="date" value="${esc(c?.aniversario || '')}">
        </div>
      </div>
      <div class="campo">
        <label for="obs">Preferências e observações</label>
        <textarea id="obs" placeholder="Ex.: máquina 2 nas laterais, não gosta de máquina no topo">${esc(c?.observacoes || '')}</textarea>
      </div>
      ${c ? '<button class="btn btn-sm btn-danger" data-excluir>Excluir cliente</button>' : ''}`,
    onOk: async (d) => {
      const nome = d.querySelector('#nome').value.trim();
      if (!nome) { toastErro('O nome é obrigatório.'); return false; }
      const linha = {
        barbearia_id: estado.barbearia.id,
        nome,
        telefone: d.querySelector('#tel').value.trim() || null,
        aniversario: d.querySelector('#aniv').value || null,
        observacoes: d.querySelector('#obs').value.trim() || null
      };
      const q = c ? sb.from('clientes').update(linha).eq('id', c.id) : sb.from('clientes').insert(linha);
      const { error } = await q;
      if (error) { toastErro(traduzErro(error)); return false; }
      aviso('Cliente salvo.');
      await carregar(); desenha();
    }
  });

  mascaraTelefone(dlg.querySelector('#tel'));
  dlg.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    dlg.close();
    if (!await confirmar(`Excluir "${c.nome}"? O histórico de agendamentos continua guardado.`)) return;
    const { error } = await sb.from('clientes').delete().eq('id', c.id);
    if (error) return toastErro(traduzErro(error));
    aviso('Cliente excluído.');
    await carregar(); desenha();
  });
}

async function historico(c) {
  const { data, error } = await sb.from('agendamentos')
    .select('inicio,status,preco,servicos(nome),barbeiros(nome)')
    .eq('barbearia_id', estado.barbearia.id).eq('cliente_id', c.id)
    .order('inicio', { ascending: false }).limit(50);
  if (error) return toastErro(traduzErro(error));

  const total = data.filter((a) => a.status === 'atendido').length;
  modal({
    titulo: `Histórico — ${c.nome}`,
    corpo: `
      <p class="muted" style="margin-top:0">${total} atendimento(s) concluído(s)</p>
      ${c.observacoes ? `<div class="card" style="margin-bottom:1rem"><b>Preferências:</b><br>${esc(c.observacoes)}</div>` : ''}
      ${data.length === 0 ? '<div class="vazio">Nenhum atendimento ainda.</div>' : `
        <div class="tabela-wrap"><table>
          <thead><tr><th>Data</th><th>Serviço</th><th>Barbeiro</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>${data.map((a) => `
            <tr>
              <td>${esc(dataCurta(iso(new Date(a.inicio))))} ${horaDe(a.inicio)}</td>
              <td>${esc(a.servicos?.nome || '-')}</td>
              <td>${esc(a.barbeiros?.nome || '-')}</td>
              <td>${money(a.preco)}</td>
              <td><span class="chip">${esc(a.status)}</span></td>
            </tr>`).join('')}
          </tbody></table></div>`}`
  });
}
