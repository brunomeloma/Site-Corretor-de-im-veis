/* =====================================================================
   Tela MEUS GANHOS — o barbeiro vê o que produziu e quanto tem de comissão.
   O banco ignora qualquer id que venha do navegador: sempre devolve os
   dados do barbeiro que está logado.
   ===================================================================== */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, money, iso, dataCurta, horaDe, estadoVazio, esqueleto, erro as toastErro
} from '../ui.js';

let caixa;
let periodo = mesAtual();

function mesAtual() {
  const d = new Date();
  return { de: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
           ate: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}

export async function render(container) {
  caixa = container;
  await desenha();
}

async function desenha() {
  caixa.innerHTML = esqueleto('lista');

  const { data, error } = await sb.rpc('minhas_comissoes', {
    p_barbearia: estado.barbearia.id, p_de: periodo.de, p_ate: periodo.ate
  });

  if (error) {
    caixa.innerHTML = `<div class="card">${estadoVazio({
      icone: '🔒', titulo: 'Não deu para carregar seus ganhos', texto: traduzErro(error) })}</div>`;
    return;
  }

  const g = data || {};
  const itens = g.itens || [];

  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Meus ganhos</h1>
        <p class="muted" style="margin:0">${esc(dataCurta(periodo.de))} a ${esc(dataCurta(periodo.ate))}</p>
      </div>
      <div class="topo-acoes">
        <input type="month" id="mes" value="${esc(periodo.de.slice(0, 7))}" style="width:auto">
      </div>
    </div>

    <div class="cards-numeros">
      <div class="numero destaque">
        <span class="rotulo">Minha comissão</span><b>${money(g.comissao)}</b>
        <span class="muted t-xs">no período escolhido</span>
      </div>
      <div class="numero"><span class="rotulo">Produzi</span><b>${money(g.produzido)}</b></div>
      <div class="numero"><span class="rotulo">Atendimentos</span><b>${esc(String(g.atendimentos || 0))}</b></div>
    </div>

    <div class="card">
      <h2>Detalhe</h2>
      ${itens.length === 0
        ? estadoVazio({ icone: '💈', titulo: 'Nada por aqui ainda',
            texto: 'Assim que suas vendas forem registradas no caixa, elas aparecem aqui com a comissão.' })
        : `<div class="tabela-wrap"><table>
            <thead><tr><th>Data</th><th>Serviço</th><th style="text-align:right">Valor</th><th style="text-align:right">Comissão</th></tr></thead>
            <tbody>${itens.map((i) => `
              <tr>
                <td>${esc(dataCurta(iso(new Date(i.data))))} ${horaDe(i.data)}</td>
                <td>${esc(i.descricao)}</td>
                <td style="text-align:right">${money(i.valor)}</td>
                <td style="text-align:right"><b>${money(i.comissao)}</b></td>
              </tr>`).join('')}
            </tbody></table></div>`}
    </div>

    <p class="muted t-xs" style="margin-top:1rem">
      Só você e o dono da barbearia enxergam estes valores.
    </p>`;

  $('#mes', caixa).addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [a, m] = e.target.value.split('-').map(Number);
    periodo = { de: iso(new Date(a, m - 1, 1)), ate: iso(new Date(a, m, 0)) };
    desenha();
  });
}
