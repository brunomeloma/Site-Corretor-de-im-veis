/* Tela PRODUTOS — revenda com controle de estoque (só o dono edita). */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import { $, esc, modal, confirmar, aviso, erro as toastErro, money, estadoVazio } from '../ui.js';

let lista = [];
let caixa;

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const { data, error } = await sb.from('produtos').select('*')
    .eq('barbearia_id', estado.barbearia.id).order('nome');
  if (error) throw error;
  lista = data;
}

function desenha() {
  const acabando = lista.filter((p) => p.ativo && p.estoque <= p.estoque_min);
  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Produtos</h1>
        <p class="muted" style="margin:0">Pomada, shampoo, cera... o estoque baixa sozinho a cada venda.</p>
      </div>
      <button class="btn btn-primary" id="btnNovo">+ Produto</button>
    </div>

    ${acabando.length ? `<div class="aviso-faixa">
      ⚠️ Acabando: ${esc(acabando.map((p) => `${p.nome} (${p.estoque})`).join(', '))}
    </div>` : ''}

    <div class="card">
      ${lista.length === 0
        ? estadoVazio({ icone: '🧴', titulo: 'Nenhum produto cadastrado',
            texto: 'Cadastre o que você revende para vender no caixa e controlar o estoque.' })
        : `<div class="tabela-wrap"><table>
            <thead><tr><th>Produto</th><th>Preço</th><th>Custo</th><th>Estoque</th><th>Situação</th><th></th></tr></thead>
            <tbody>${lista.map((p) => `
              <tr>
                <td><b>${esc(p.nome)}</b></td>
                <td>${money(p.preco)}</td>
                <td class="muted">${money(p.custo)}</td>
                <td><b class="${p.estoque <= p.estoque_min ? 'texto-alerta' : ''}">${esc(String(p.estoque))}</b></td>
                <td>${p.ativo ? '<span class="chip chip-ok">ativo</span>' : '<span class="chip">inativo</span>'}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-sm" data-entrada="${esc(p.id)}">+ estoque</button>
                  <button class="btn btn-sm" data-edit="${esc(p.id)}">✎</button>
                </td>
              </tr>`).join('')}
            </tbody></table></div>`}
    </div>`;

  $('#btnNovo', caixa).addEventListener('click', () => form());
  caixa.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => form(lista.find((p) => p.id === b.dataset.edit))));
  caixa.querySelectorAll('[data-entrada]').forEach((b) =>
    b.addEventListener('click', () => entradaEstoque(lista.find((p) => p.id === b.dataset.entrada))));
}

function form(p) {
  const dlg = modal({
    titulo: p ? 'Editar produto' : 'Novo produto',
    corpo: `
      <div class="campo">
        <label for="nome">Nome</label>
        <input id="nome" value="${esc(p?.nome || '')}" placeholder="Ex.: Pomada modeladora">
      </div>
      <div class="linha">
        <div class="campo"><label for="preco">Preço de venda (R$)</label>
          <input id="preco" type="number" min="0" step="0.01" value="${esc(p?.preco ?? 0)}"></div>
        <div class="campo"><label for="custo">Custo (R$)</label>
          <input id="custo" type="number" min="0" step="0.01" value="${esc(p?.custo ?? 0)}"></div>
      </div>
      <div class="linha">
        <div class="campo"><label for="estoque">Estoque atual</label>
          <input id="estoque" type="number" step="1" value="${esc(p?.estoque ?? 0)}"></div>
        <div class="campo"><label for="minimo">Avisar quando chegar em</label>
          <input id="minimo" type="number" step="1" min="0" value="${esc(p?.estoque_min ?? 2)}"></div>
      </div>
      <div class="campo">
        <label for="com">Comissão do barbeiro neste produto (%)</label>
        <input id="com" type="number" min="0" max="100" step="0.5" value="${esc(p?.comissao_pct ?? '')}"
               placeholder="deixe vazio para usar a comissão normal">
      </div>
      <div class="campo">
        <label for="ativo">Situação</label>
        <select id="ativo">
          <option value="1" ${p?.ativo !== false ? 'selected' : ''}>Ativo (aparece na venda)</option>
          <option value="0" ${p?.ativo === false ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
      ${p ? '<button class="btn btn-sm btn-danger" data-excluir>Excluir produto</button>' : ''}`,
    onOk: async (d) => {
      const nome = d.querySelector('#nome').value.trim();
      if (!nome) { toastErro('Dê um nome ao produto.'); return false; }
      const comissao = d.querySelector('#com').value;
      const linha = {
        barbearia_id: estado.barbearia.id,
        nome,
        preco: Number(d.querySelector('#preco').value) || 0,
        custo: Number(d.querySelector('#custo').value) || 0,
        estoque: Math.trunc(Number(d.querySelector('#estoque').value) || 0),
        estoque_min: Math.trunc(Number(d.querySelector('#minimo').value) || 0),
        comissao_pct: comissao === '' ? null : Number(comissao),
        ativo: d.querySelector('#ativo').value === '1'
      };
      const q = p ? sb.from('produtos').update(linha).eq('id', p.id) : sb.from('produtos').insert(linha);
      const { error } = await q;
      if (error) { toastErro(traduzErro(error)); return false; }
      aviso('Produto salvo.');
      await carregar(); desenha();
    }
  });

  dlg.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    dlg.close();
    if (!await confirmar(`Excluir "${p.nome}"? Se já foi vendido, prefira deixar inativo.`)) return;
    const { error } = await sb.from('produtos').delete().eq('id', p.id);
    if (error) return toastErro(traduzErro(error));
    aviso('Produto excluído.');
    await carregar(); desenha();
  });
}

function entradaEstoque(p) {
  if (!p) return;
  modal({
    titulo: `Entrada de estoque — ${p.nome}`,
    okTexto: 'Somar ao estoque',
    corpo: `
      <p class="muted" style="margin-top:0">Estoque atual: <b>${esc(String(p.estoque))}</b></p>
      <div class="campo">
        <label for="qtd">Quantas unidades chegaram?</label>
        <input id="qtd" type="number" min="1" step="1" value="1">
      </div>`,
    onOk: async (d) => {
      const qtd = Math.trunc(Number(d.querySelector('#qtd').value) || 0);
      if (qtd <= 0) { toastErro('Informe a quantidade.'); return false; }
      const { error } = await sb.from('produtos')
        .update({ estoque: p.estoque + qtd }).eq('id', p.id);
      if (error) { toastErro(traduzErro(error)); return false; }
      await sb.from('estoque_mov').insert({
        barbearia_id: estado.barbearia.id, produto_id: p.id,
        quantidade: qtd, motivo: 'compra', criado_por: estado.user.id
      });
      aviso('Estoque atualizado.');
      await carregar(); desenha();
    }
  });
}
