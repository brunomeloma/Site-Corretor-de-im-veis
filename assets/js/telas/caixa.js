/* =====================================================================
   Tela CAIXA — registrar vendas, ver o movimento do dia e bater o caixa.
   Dono e recepção veem o dia inteiro; barbeiro vê só as vendas dele.
   Ninguém além do dono enxerga faturamento de outros dias.
   ===================================================================== */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, modal, confirmar, aviso, erro as toastErro, money, hojeIso, dataBonita,
  horaDe, estadoVazio, esqueleto
} from '../ui.js';

const PAGAMENTOS = [
  ['dinheiro', '💵 Dinheiro'], ['pix', '⚡ Pix'],
  ['debito', '💳 Débito'], ['credito', '💳 Crédito']
];

let caixa;
let dados = { vendas: [], resumo: null, barbeiros: [], servicos: [], produtos: [], clientes: [], fechamento: null };

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

const podeFecharCaixa = () => estado.papel === 'dono' || estado.papel === 'recepcao';

async function carregar() {
  const bid = estado.barbearia.id;
  const [resumo, vendas, barbeiros, servicos, produtos, clientes, fechamento] = await Promise.all([
    sb.rpc('vendas_de_hoje', { p_barbearia: bid }),
    sb.from('vendas').select('*, venda_itens(*), barbeiros(nome), clientes(nome)')
      .eq('barbearia_id', bid).order('data', { ascending: false }).limit(100),
    sb.from('barbeiros').select('id,nome,comissao_pct').eq('barbearia_id', bid).eq('ativo', true).order('nome'),
    sb.from('servicos').select('id,nome,preco').eq('barbearia_id', bid).eq('ativo', true).order('nome'),
    sb.from('produtos').select('id,nome,preco,estoque').eq('barbearia_id', bid).eq('ativo', true).order('nome'),
    sb.from('clientes').select('id,nome').eq('barbearia_id', bid).order('nome').limit(1000),
    podeFecharCaixa()
      ? sb.from('caixas').select('*').eq('barbearia_id', bid).eq('dia', hojeIso()).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  for (const r of [resumo, vendas, barbeiros, servicos, clientes]) if (r.error) throw r.error;

  dados = {
    resumo: resumo.data,
    // a RLS já filtra; aqui só mostramos o dia de hoje na lista
    vendas: (vendas.data || []).filter((v) => v.data.slice(0, 10) >= hojeIso()),
    barbeiros: barbeiros.data,
    servicos: servicos.data,
    produtos: produtos.data || [],
    clientes: clientes.data,
    fechamento: fechamento.data || null
  };
}

/* ------------------------------ desenho ----------------------------- */
function desenha() {
  const r = dados.resumo || {};
  const titulo = estado.papel === 'barbeiro' ? 'Minhas vendas de hoje' : 'Vendas de hoje';

  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Caixa</h1>
        <p class="muted" style="margin:0">${esc(dataBonita(hojeIso()))}</p>
      </div>
      <div class="topo-acoes">
        ${podeFecharCaixa() ? '<button class="btn" id="btnFechar">🧾 Fechar caixa</button>' : ''}
        <button class="btn btn-primary" id="btnNova">+ Nova venda</button>
      </div>
    </div>

    <div class="cards-numeros">
      <div class="numero destaque">
        <span class="rotulo">${esc(titulo)}</span>
        <b>${money(r.total)}</b>
        <span class="muted t-xs">${r.quantidade || 0} venda(s)</span>
      </div>
      ${estado.papel === 'barbeiro' ? '' : PAGAMENTOS.map(([k, nome]) => `
        <div class="numero">
          <span class="rotulo">${esc(nome)}</span>
          <b>${money(r[k])}</b>
        </div>`).join('')}
    </div>

    ${dados.fechamento?.fechado_em ? `
      <div class="aviso-faixa">
        🧾 Caixa fechado às ${horaDe(dados.fechamento.fechado_em)} ·
        contado ${money(dados.fechamento.valor_contado)} ·
        diferença <b>${money(dados.fechamento.diferenca)}</b>
      </div>` : ''}

    <div class="card">
      <h2>Movimento de hoje</h2>
      ${dados.vendas.length === 0
        ? estadoVazio({ icone: '🧾', titulo: 'Nenhuma venda registrada hoje',
            texto: 'Toda vez que um atendimento é pago, registre aqui — é isso que alimenta o financeiro e as comissões.' })
        : `<div class="tabela-wrap"><table>
            <thead><tr><th>Hora</th><th>Cliente</th><th>Itens</th><th>Barbeiro</th><th>Pagamento</th><th style="text-align:right">Valor</th><th></th></tr></thead>
            <tbody>${dados.vendas.map(linhaVenda).join('')}</tbody>
          </table></div>`}
    </div>`;

  $('#btnNova', caixa).addEventListener('click', () => formVenda({}, recarrega));
  $('#btnFechar', caixa)?.addEventListener('click', fecharCaixa);
  caixa.querySelectorAll('[data-venda]').forEach((b) =>
    b.addEventListener('click', () => detalheVenda(dados.vendas.find((v) => v.id === b.dataset.venda))));
}

function linhaVenda(v) {
  const itens = (v.venda_itens || []).map((i) => i.descricao).join(', ');
  const pag = PAGAMENTOS.find(([k]) => k === v.forma_pagamento)?.[1] || v.forma_pagamento;
  return `
    <tr>
      <td>${horaDe(v.data)}</td>
      <td><b>${esc(v.clientes?.nome || v.cliente_nome || 'Cliente')}</b></td>
      <td class="muted">${esc(itens)}</td>
      <td>${esc(v.barbeiros?.nome || '-')}</td>
      <td><span class="chip">${esc(pag)}</span></td>
      <td style="text-align:right"><b>${money(v.valor_bruto - v.desconto)}</b></td>
      <td style="text-align:right"><button class="btn btn-sm" data-venda="${esc(v.id)}">ver</button></td>
    </tr>`;
}

async function recarrega() {
  caixa.innerHTML = esqueleto('lista');
  await carregar();
  desenha();
}

/* --------------------------- nova venda ----------------------------- */
/**
 * Abre o formulário de venda. Pode vir pré-preenchido a partir de um
 * agendamento (usado na Agenda ao marcar "atendido").
 */
export function formVenda(pre = {}, aoSalvar) {
  const barbeiros = pre.barbeiros || dados.barbeiros;
  const servicos = pre.servicos || dados.servicos;
  const clientes = pre.clientes || dados.clientes;
  const produtos = pre.produtos || dados.produtos || [];

  if (!barbeiros?.length) { toastErro('Cadastre um barbeiro antes de registrar vendas.'); return; }

  // itens da venda em memória
  const itens = [];
  if (pre.servico) {
    itens.push({
      servico_id: pre.servico.id, descricao: pre.servico.nome,
      quantidade: 1, preco_unit: Number(pre.preco ?? pre.servico.preco) || 0,
      barbeiro_id: pre.barbeiro_id || barbeiros[0].id
    });
  }

  const opcoes = (arr, sel) => arr.map((x) =>
    `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`).join('');

  const dlg = modal({
    titulo: 'Nova venda',
    okTexto: 'Registrar venda',
    largura: 580,
    corpo: `
      <div class="linha">
        <div class="campo">
          <label for="vCliente">Cliente</label>
          <select id="vCliente">
            <option value="">— Sem cadastro —</option>
            ${opcoes(clientes, pre.cliente_id)}
          </select>
        </div>
        <div class="campo">
          <label for="vBarbeiro">Barbeiro</label>
          <select id="vBarbeiro">${opcoes(barbeiros, pre.barbeiro_id)}</select>
        </div>
      </div>

      <label>Itens</label>
      <div id="listaItens" class="lista-itens"></div>
      <div class="linha" style="grid-template-columns:2fr 1fr auto;align-items:end;gap:.5rem">
        <div class="campo" style="margin:0">
          <label for="vServico" class="t-xs">Adicionar serviço</label>
          <select id="vServico">
            <optgroup label="Serviços">
              ${servicos.map((s) => `<option value="${esc(s.id)}">${esc(s.nome)} — ${money(s.preco)}</option>`).join('')}
            </optgroup>
            ${produtos.length ? `<optgroup label="Produtos">
              ${produtos.map((p) => `<option value="prod:${esc(p.id)}">${esc(p.nome)} — ${money(p.preco)} (${esc(String(p.estoque))} em estoque)</option>`).join('')}
            </optgroup>` : ''}
            <option value="__avulso">Outro (valor livre)</option>
          </select>
        </div>
        <div class="campo" style="margin:0">
          <label for="vPreco" class="t-xs">Valor</label>
          <input id="vPreco" type="number" min="0" step="0.01" value="${esc(servicos[0]?.preco ?? 0)}">
        </div>
        <button type="button" class="btn" id="vAdd">+</button>
      </div>

      <div class="linha" style="margin-top:1rem">
        <div class="campo">
          <label for="vPagamento">Forma de pagamento</label>
          <select id="vPagamento">
            ${PAGAMENTOS.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label for="vDesconto">Desconto (R$)</label>
          <input id="vDesconto" type="number" min="0" step="0.01" value="0">
        </div>
      </div>
      <div class="campo">
        <label for="vObs">Observação</label>
        <input id="vObs" placeholder="opcional">
      </div>
      <div class="resumo-venda" id="vResumo"></div>`,
    onOk: async (d) => salvarVenda(d, itens, pre, aoSalvar)
  });

  const selServico = dlg.querySelector('#vServico');
  const inpPreco = dlg.querySelector('#vPreco');

  const itemEscolhido = () => {
    const v = selServico.value;
    if (v.startsWith('prod:')) {
      const p = produtos.find((x) => x.id === v.slice(5));
      return p ? { produto: p, preco: p.preco, nome: p.nome } : null;
    }
    const s = servicos.find((x) => x.id === v);
    return s ? { servico: s, preco: s.preco, nome: s.nome } : null;
  };

  selServico.addEventListener('change', () => {
    const escolhido = itemEscolhido();
    inpPreco.value = escolhido ? escolhido.preco : 0;
  });

  dlg.querySelector('#vAdd').addEventListener('click', () => {
    const valor = Number(inpPreco.value) || 0;
    const escolhido = itemEscolhido();
    if (!escolhido && selServico.value !== '__avulso') return;
    if (selServico.value === '__avulso' && valor <= 0) { toastErro('Informe o valor.'); return; }

    if (escolhido?.produto) {
      const jaNoCarrinho = itens.filter((i) => i.produto_id === escolhido.produto.id).length;
      if (jaNoCarrinho >= escolhido.produto.estoque) {
        toastErro(`Só tem ${escolhido.produto.estoque} de "${escolhido.produto.nome}" no estoque.`);
        return;
      }
    }

    itens.push({
      servico_id: escolhido?.servico?.id || null,
      produto_id: escolhido?.produto?.id || null,
      descricao: escolhido?.nome || 'Serviço avulso',
      quantidade: 1, preco_unit: valor,
      barbeiro_id: dlg.querySelector('#vBarbeiro').value
    });
    pinta();
  });

  dlg.querySelector('#vDesconto').addEventListener('input', pinta);
  dlg.querySelector('#vPagamento').addEventListener('change', pinta);
  dlg.querySelector('#vBarbeiro').addEventListener('change', pinta);

  function pinta() {
    const lista = dlg.querySelector('#listaItens');
    lista.innerHTML = itens.length === 0
      ? '<p class="muted t-sm">Nenhum item ainda. Escolha um serviço abaixo e toque em +.</p>'
      : itens.map((i, n) => `
          <div class="item-venda">
            <span>${esc(i.descricao)}</span>
            <b>${money(i.preco_unit)}</b>
            <button type="button" class="btn btn-sm btn-ghost" data-remove="${n}" aria-label="Remover">✕</button>
          </div>`).join('');
    lista.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => { itens.splice(Number(b.dataset.remove), 1); pinta(); }));

    const bruto = itens.reduce((t, i) => t + i.preco_unit * i.quantidade, 0);
    const desconto = Number(dlg.querySelector('#vDesconto').value) || 0;
    const taxaPct = taxaDe(dlg.querySelector('#vPagamento').value);
    const base = Math.max(bruto - desconto, 0);
    const taxa = base * taxaPct / 100;
    const barbeiro = barbeiros.find((b) => b.id === dlg.querySelector('#vBarbeiro').value);
    const comissao = bruto * (barbeiro?.comissao_pct || 0) / 100;

    dlg.querySelector('#vResumo').innerHTML = `
      <div><span>Total</span><b>${money(base)}</b></div>
      <div class="muted"><span>Taxa da maquininha (${taxaPct}%)</span><span>− ${money(taxa)}</span></div>
      ${estado.papel === 'dono' ? `<div class="muted"><span>Comissão do barbeiro</span><span>− ${money(comissao)}</span></div>` : ''}
      <div class="destaque"><span>Entra no caixa</span><b>${money(base - taxa)}</b></div>`;
  }
  pinta();
  return dlg;
}

/** Taxas configuradas da barbearia (carregadas junto com o app). */
function taxaDe(forma) {
  const c = estado.taxas || {};
  return Number({ debito: c.taxa_debito, credito: c.taxa_credito, pix: c.taxa_pix, dinheiro: c.taxa_dinheiro }[forma] || 0);
}

async function salvarVenda(d, itens, pre, aoSalvar) {
  if (itens.length === 0) { toastErro('Adicione pelo menos um item.'); return false; }

  const clienteId = d.querySelector('#vCliente').value || null;
  const venda = {
    barbearia_id: estado.barbearia.id,
    cliente_id: clienteId,
    cliente_nome: clienteId ? null : (pre.cliente_nome || null),
    barbeiro_id: d.querySelector('#vBarbeiro').value,
    agendamento_id: pre.agendamento_id || null,
    forma_pagamento: d.querySelector('#vPagamento').value,
    desconto: Number(d.querySelector('#vDesconto').value) || 0,
    observacao: d.querySelector('#vObs').value.trim() || null,
    criado_por: estado.user.id
  };

  const { data: nova, error } = await sb.from('vendas').insert(venda).select('id').single();
  if (error) { toastErro(traduzErro(error)); return false; }

  const linhas = itens.map((i) => ({
    venda_id: nova.id,
    barbearia_id: estado.barbearia.id,
    servico_id: i.servico_id,
    produto_id: i.produto_id || null,
    barbeiro_id: i.barbeiro_id,
    descricao: i.descricao,
    quantidade: i.quantidade,
    preco_unit: i.preco_unit
  }));
  const { error: e2 } = await sb.from('venda_itens').insert(linhas);
  if (e2) {
    // não deixa venda pela metade
    await sb.from('vendas').delete().eq('id', nova.id);
    toastErro(traduzErro(e2));
    return false;
  }

  aviso('Venda registrada!');
  if (aoSalvar) await aoSalvar();
}

/* ------------------------- detalhe da venda ------------------------- */
function detalheVenda(v) {
  if (!v) return;
  const pag = PAGAMENTOS.find(([k]) => k === v.forma_pagamento)?.[1] || v.forma_pagamento;
  const dlg = modal({
    titulo: `Venda de ${horaDe(v.data)}`,
    corpo: `
      <table>
        ${(v.venda_itens || []).map((i) => `
          <tr><td>${esc(i.descricao)}</td><td style="text-align:right">${money(i.preco_unit * i.quantidade)}</td></tr>`).join('')}
        ${v.desconto > 0 ? `<tr><td class="muted">Desconto</td><td style="text-align:right">− ${money(v.desconto)}</td></tr>` : ''}
        <tr><th>Total</th><th style="text-align:right">${money(v.valor_bruto - v.desconto)}</th></tr>
        <tr><td class="muted">Pagamento</td><td style="text-align:right">${esc(pag)}</td></tr>
        ${estado.papel === 'dono' ? `
        <tr><td class="muted">Taxa</td><td style="text-align:right">− ${money(v.valor_taxa)}</td></tr>
        <tr><td class="muted">Comissão</td><td style="text-align:right">− ${money(v.comissao_total)}</td></tr>
        <tr><td class="muted">Líquido</td><td style="text-align:right">${money(v.valor_liquido)}</td></tr>` : ''}
      </table>
      ${v.observacao ? `<p class="muted t-sm">${esc(v.observacao)}</p>` : ''}
      ${estado.papel === 'dono'
        ? '<div class="modal-acoes"><button class="btn btn-sm btn-danger" data-excluir>Excluir venda</button></div>'
        : '<p class="muted t-xs">Para corrigir ou apagar uma venda, fale com o dono.</p>'}`
  });

  dlg.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    dlg.close();
    if (!await confirmar('Excluir esta venda? Ela sai do faturamento e das comissões.')) return;
    const { error } = await sb.from('vendas').delete().eq('id', v.id);
    if (error) return toastErro(traduzErro(error));
    aviso('Venda excluída.');
    recarrega();
  });
}

/* ------------------------- fechamento de caixa ---------------------- */
async function fecharCaixa() {
  const { data: esperado, error } = await sb.rpc('esperado_em_caixa', {
    p_barbearia: estado.barbearia.id, p_dia: hojeIso()
  });
  if (error) return toastErro(traduzErro(error));

  modal({
    titulo: 'Fechar o caixa do dia',
    okTexto: 'Fechar caixa',
    corpo: `
      <p class="muted" style="margin-top:0">
        Conte o dinheiro da gaveta (só dinheiro vivo — Pix e cartão não entram)
        e digite quanto deu.
      </p>
      <div class="resumo-venda">
        <div><span>Dinheiro esperado hoje</span><b>${money(esperado)}</b></div>
      </div>
      <div class="linha">
        <div class="campo">
          <label for="fAbertura">Troco inicial (R$)</label>
          <input id="fAbertura" type="number" step="0.01" value="${esc(dados.fechamento?.valor_abertura ?? 0)}">
        </div>
        <div class="campo">
          <label for="fContado">Contei na gaveta (R$)</label>
          <input id="fContado" type="number" step="0.01" value="">
        </div>
      </div>
      <div class="campo">
        <label for="fObs">Observação</label>
        <input id="fObs" placeholder="Ex.: retirei 50 para o almoço">
      </div>
      <p id="fDif" class="muted t-sm"></p>`,
    onOk: async (d) => {
      const contado = Number(d.querySelector('#fContado').value);
      if (Number.isNaN(contado)) { toastErro('Digite quanto deu na contagem.'); return false; }
      const abertura = Number(d.querySelector('#fAbertura').value) || 0;
      const diferenca = Number((contado - abertura - Number(esperado)).toFixed(2));

      const { error: e } = await sb.from('caixas').upsert({
        barbearia_id: estado.barbearia.id,
        dia: hojeIso(),
        valor_abertura: abertura,
        valor_contado: contado,
        valor_esperado: Number(esperado),
        diferenca,
        observacao: d.querySelector('#fObs').value.trim() || null,
        fechado_em: new Date().toISOString(),
        fechado_por: estado.user.id
      }, { onConflict: 'barbearia_id,dia' });

      if (e) { toastErro(traduzErro(e)); return false; }
      aviso(diferenca === 0 ? 'Caixa fechado certinho! 🎯'
        : diferenca > 0 ? `Caixa fechado — sobrou ${money(diferenca)}.`
        : `Caixa fechado — faltou ${money(Math.abs(diferenca))}.`);
      recarrega();
    }
  });
}
