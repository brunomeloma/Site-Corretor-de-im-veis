/* =====================================================================
   Tela RELATÓRIOS — só o dono entra (o banco também recusa os outros).
   Faturamento do período, ranking, serviços, horários de pico, despesas
   e as taxas da maquininha.
   ===================================================================== */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, modal, confirmar, aviso, erro as toastErro, money, iso, hojeIso,
  dataCurta, MESES, estadoVazio, esqueleto
} from '../ui.js';

let caixa;
let periodo = mesAtual();
let dados = {};

function mesAtual() {
  const d = new Date();
  return { de: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
           ate: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}
function mesPassado() {
  const d = new Date();
  return { de: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
           ate: iso(new Date(d.getFullYear(), d.getMonth(), 0)) };
}

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const p = { p_barbearia: estado.barbearia.id, p_de: periodo.de, p_ate: periodo.ate };
  const [resumo, ranking, servicos, pico, despesas, config] = await Promise.all([
    sb.rpc('resumo_financeiro', p),
    sb.rpc('ranking_barbeiros', p),
    sb.rpc('servicos_mais_vendidos', p),
    sb.rpc('horarios_pico', p),
    sb.from('despesas').select('*').eq('barbearia_id', estado.barbearia.id)
      .gte('data', periodo.de).lte('data', periodo.ate).order('data', { ascending: false }),
    sb.from('config_financeiro').select('*').eq('barbearia_id', estado.barbearia.id).maybeSingle()
  ]);

  for (const r of [resumo, ranking, servicos, pico, despesas]) if (r.error) throw r.error;
  dados = {
    resumo: resumo.data || {}, ranking: ranking.data || [], servicos: servicos.data || [],
    pico: pico.data || [], despesas: despesas.data || [], config: config.data || {}
  };
}

/* ------------------------------ desenho ----------------------------- */
function desenha() {
  const r = dados.resumo;
  const lucro = Number(r.liquido || 0) - Number(r.comissoes || 0) - Number(r.despesas || 0);

  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Relatórios</h1>
        <p class="muted" style="margin:0">${esc(dataCurta(periodo.de))} a ${esc(dataCurta(periodo.ate))}</p>
      </div>
      <div class="topo-acoes">
        <button class="btn btn-sm" data-p="mes">Este mês</button>
        <button class="btn btn-sm" data-p="passado">Mês passado</button>
        <button class="btn btn-sm" data-p="custom">Escolher período</button>
      </div>
    </div>

    <div class="cards-numeros">
      <div class="numero destaque">
        <span class="rotulo">Faturamento</span><b>${money(r.bruto)}</b>
        <span class="muted t-xs">${r.vendas || 0} venda(s) · ticket ${money(r.ticket)}</span>
      </div>
      <div class="numero"><span class="rotulo">Taxas de cartão</span><b>− ${money(r.taxas)}</b></div>
      <div class="numero"><span class="rotulo">Comissões</span><b>− ${money(r.comissoes)}</b></div>
      <div class="numero"><span class="rotulo">Despesas</span><b>− ${money(r.despesas)}</b></div>
      <div class="numero ${lucro >= 0 ? 'positivo' : 'negativo'}">
        <span class="rotulo">Sobra no fim</span><b>${money(lucro)}</b>
        <span class="muted t-xs">faturamento − taxas − comissões − despesas</span>
      </div>
    </div>

    <div class="grade-2">
      <div class="card">
        <h2>Ranking dos barbeiros</h2>
        ${dados.ranking.length === 0 ? estadoVazio({ icone: '🏆', titulo: 'Sem vendas no período' }) : `
          <div class="tabela-wrap"><table>
            <thead><tr><th>Barbeiro</th><th>Atend.</th><th>Produziu</th><th>Comissão</th></tr></thead>
            <tbody>${dados.ranking.map((b, i) => `
              <tr>
                <td><span class="ponto" style="display:inline-block;background:${esc(b.cor || '#888')}"></span>
                    ${i === 0 ? '🥇 ' : ''}<b>${esc(b.nome)}</b></td>
                <td>${esc(String(b.atendimentos))}</td>
                <td>${money(b.total)}</td>
                <td>${money(b.comissao)}</td>
              </tr>`).join('')}
            </tbody></table></div>`}
      </div>

      <div class="card">
        <h2>Serviços mais vendidos</h2>
        ${dados.servicos.length === 0 ? estadoVazio({ icone: '✂️', titulo: 'Sem vendas no período' }) : `
          <div class="tabela-wrap"><table>
            <thead><tr><th>Serviço</th><th>Qtd</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${dados.servicos.map((s) => `
              <tr><td>${esc(s.nome)}</td><td>${esc(String(s.qtd))}</td>
                  <td style="text-align:right">${money(s.total)}</td></tr>`).join('')}
            </tbody></table></div>`}
      </div>
    </div>

    <div class="card">
      <h2>Horários de pico</h2>
      ${graficoPico()}
    </div>

    <div class="card">
      <div class="topo" style="margin-bottom:1rem">
        <h2 style="margin:0">Despesas do período</h2>
        <button class="btn btn-sm" id="btnDespesa">+ Despesa</button>
      </div>
      ${dados.despesas.length === 0
        ? estadoVazio({ icone: '🧾', titulo: 'Nenhuma despesa lançada',
            texto: 'Aluguel, produtos, energia... lance aqui para saber a sobra de verdade.' })
        : `<div class="tabela-wrap"><table>
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th></th></tr></thead>
            <tbody>${dados.despesas.map((d) => `
              <tr>
                <td>${esc(dataCurta(d.data))}</td>
                <td>${esc(d.descricao)}</td>
                <td><span class="chip">${esc(d.categoria)}</span></td>
                <td style="text-align:right">${money(d.valor)}</td>
                <td style="text-align:right"><button class="btn btn-sm" data-del-desp="${esc(d.id)}">✕</button></td>
              </tr>`).join('')}
            </tbody></table></div>`}
    </div>

    <div class="card">
      <h2>Taxas das maquininhas</h2>
      <p class="muted t-sm" style="margin-top:0">
        O sistema desconta essas taxas sozinho em cada venda.
      </p>
      <div class="linha">
        <div class="campo"><label for="tDeb">Débito (%)</label>
          <input id="tDeb" type="number" step="0.01" min="0" value="${esc(dados.config.taxa_debito ?? 0)}"></div>
        <div class="campo"><label for="tCred">Crédito (%)</label>
          <input id="tCred" type="number" step="0.01" min="0" value="${esc(dados.config.taxa_credito ?? 0)}"></div>
      </div>
      <div class="linha">
        <div class="campo"><label for="tPix">Pix (%)</label>
          <input id="tPix" type="number" step="0.01" min="0" value="${esc(dados.config.taxa_pix ?? 0)}"></div>
        <div class="campo"><label for="tDin">Dinheiro (%)</label>
          <input id="tDin" type="number" step="0.01" min="0" value="${esc(dados.config.taxa_dinheiro ?? 0)}"></div>
      </div>
      <button class="btn btn-primary" id="btnTaxas">Salvar taxas</button>
    </div>`;

  caixa.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => trocaPeriodo(b.dataset.p)));
  $('#btnDespesa', caixa).addEventListener('click', formDespesa);
  $('#btnTaxas', caixa).addEventListener('click', salvarTaxas);
  caixa.querySelectorAll('[data-del-desp]').forEach((b) =>
    b.addEventListener('click', () => excluirDespesa(b.dataset.delDesp)));
}

function graficoPico() {
  if (!dados.pico.length) return estadoVazio({ icone: '⏰', titulo: 'Sem agendamentos no período' });
  const max = Math.max(...dados.pico.map((p) => Number(p.qtd)));
  return `<div class="barras">${dados.pico.map((p) => `
    <div class="barra" title="${esc(String(p.hora))}h: ${esc(String(p.qtd))} atendimento(s)">
      <div class="barra-valor" style="height:${Math.round((p.qtd / max) * 100)}%"></div>
      <span class="barra-rotulo">${String(p.hora).padStart(2, '0')}h</span>
    </div>`).join('')}</div>`;
}

async function recarrega() {
  caixa.innerHTML = esqueleto('lista');
  await carregar();
  desenha();
}

function trocaPeriodo(qual) {
  if (qual === 'mes') { periodo = mesAtual(); return recarrega(); }
  if (qual === 'passado') { periodo = mesPassado(); return recarrega(); }
  modal({
    titulo: 'Escolher período',
    okTexto: 'Ver',
    corpo: `
      <div class="linha">
        <div class="campo"><label for="pDe">De</label><input id="pDe" type="date" value="${esc(periodo.de)}"></div>
        <div class="campo"><label for="pAte">Até</label><input id="pAte" type="date" value="${esc(periodo.ate)}"></div>
      </div>`,
    onOk: async (d) => {
      const de = d.querySelector('#pDe').value, ate = d.querySelector('#pAte').value;
      if (!de || !ate || de > ate) { toastErro('Período inválido.'); return false; }
      periodo = { de, ate };
      recarrega();
    }
  });
}

/* ------------------------------ despesas ---------------------------- */
function formDespesa() {
  const categorias = ['aluguel', 'produtos', 'energia', 'água', 'internet', 'salário', 'imposto', 'outros'];
  modal({
    titulo: 'Nova despesa',
    corpo: `
      <div class="campo">
        <label for="dDesc">Descrição</label>
        <input id="dDesc" placeholder="Ex.: Compra de pomada">
      </div>
      <div class="linha">
        <div class="campo"><label for="dValor">Valor (R$)</label>
          <input id="dValor" type="number" min="0" step="0.01"></div>
        <div class="campo"><label for="dData">Data</label>
          <input id="dData" type="date" value="${esc(hojeIso())}"></div>
      </div>
      <div class="campo">
        <label for="dCat">Categoria</label>
        <select id="dCat">${categorias.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
      </div>`,
    onOk: async (d) => {
      const descricao = d.querySelector('#dDesc').value.trim();
      const valor = Number(d.querySelector('#dValor').value);
      if (!descricao) { toastErro('Escreva a descrição.'); return false; }
      if (!(valor > 0)) { toastErro('Informe um valor maior que zero.'); return false; }
      const { error } = await sb.from('despesas').insert({
        barbearia_id: estado.barbearia.id,
        descricao, valor,
        categoria: d.querySelector('#dCat').value,
        data: d.querySelector('#dData').value,
        criado_por: estado.user.id
      });
      if (error) { toastErro(traduzErro(error)); return false; }
      aviso('Despesa lançada.');
      recarrega();
    }
  });
}

async function excluirDespesa(id) {
  if (!await confirmar('Excluir esta despesa?')) return;
  const { error } = await sb.from('despesas').delete().eq('id', id);
  if (error) return toastErro(traduzErro(error));
  aviso('Despesa excluída.');
  recarrega();
}

async function salvarTaxas() {
  const num = (sel) => Number($(sel, caixa).value) || 0;
  const { error } = await sb.from('config_financeiro').upsert({
    barbearia_id: estado.barbearia.id,
    taxa_debito: num('#tDeb'), taxa_credito: num('#tCred'),
    taxa_pix: num('#tPix'), taxa_dinheiro: num('#tDin'),
    atualizado_em: new Date().toISOString()
  }, { onConflict: 'barbearia_id' });
  if (error) return toastErro(traduzErro(error));
  estado.taxas = { taxa_debito: num('#tDeb'), taxa_credito: num('#tCred'),
                   taxa_pix: num('#tPix'), taxa_dinheiro: num('#tDin') };
  aviso('Taxas salvas.');
}
