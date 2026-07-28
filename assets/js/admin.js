/* =====================================================================
   PAINEL DO ADMINISTRADOR DO SITE (você, dono do BARBER PRO).
   Lista todas as barbearias, mostra inadimplentes e receita, registra
   pagamento, suspende e apaga conta. Não tem tela de vendas.
   Quem não é admin não vê nada: o banco recusa todas as funções.
   ===================================================================== */
import { sb, traduzErro } from './supabase.js';
import {
  $, esc, iniciaTema, modal, aviso, erro as toastErro, money, dataCurta, iso, estadoVazio, esqueleto
} from './ui.js';

iniciaTema();

let usuario = null;
let resumo = {};
let barbearias = [];
let filtro = 'todas';

iniciar();

async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace('/index.html'); return; }
  usuario = session.user;
  await carregar();
}

async function carregar() {
  $('#raiz').innerHTML = esqueleto('lista');
  const [r, b] = await Promise.all([sb.rpc('admin_resumo'), sb.rpc('admin_barbearias')]);

  if (r.error || b.error) {
    $('#raiz').innerHTML = `<main class="auth-wrap"><div class="auth-card card">${estadoVazio({
      icone: '🔒', titulo: 'Área restrita',
      texto: 'Esta conta não é administradora do site.' })}
      <a class="btn btn-block" href="/app.html">Ir para o sistema</a></div></main>`;
    return;
  }
  resumo = r.data || {};
  barbearias = b.data || [];
  desenha();
}

const situacao = (b) => {
  if (b.status === 'cancelada') return ['chip-danger', 'cancelada'];
  if (b.status === 'suspensa') return ['chip-danger', 'suspensa'];
  if (b.dias < 0) return ['chip-danger', b.status === 'trial' ? 'teste vencido' : 'vencida'];
  if (b.status === 'trial') return ['chip-warn', `teste (${b.dias}d)`];
  return ['chip-ok', `ativa (${b.dias}d)`];
};

const inadimplente = (b) =>
  b.status === 'suspensa' || (b.dias < 0 && b.status !== 'cancelada');

function listaFiltrada() {
  if (filtro === 'inadimplentes') return barbearias.filter(inadimplente);
  if (filtro === 'teste') return barbearias.filter((b) => b.status === 'trial' && b.dias >= 0);
  if (filtro === 'ativas') return barbearias.filter((b) => b.status === 'ativa' && b.dias >= 0);
  return barbearias;
}

function desenha() {
  const itens = listaFiltrada();
  $('#raiz').innerHTML = `
    <header class="topbar" style="display:flex">
      <span class="logo-mark" aria-hidden="true">✂</span>
      <b>Painel do administrador</b>
      <div class="topbar-acoes">
        <a class="btn btn-sm" href="/app.html">Meu sistema</a>
        <button class="btn btn-sm btn-ghost" id="sair">Sair</button>
      </div>
    </header>

    <main class="main" style="max-width:1200px;margin:0 auto">
      <div class="cards-numeros">
        <div class="numero destaque">
          <span class="rotulo">Receita por mês</span><b>${money(resumo.receita_mes)}</b>
          <span class="muted t-xs">só as contas ativas em dia</span>
        </div>
        <div class="numero"><span class="rotulo">Barbearias</span><b>${esc(String(resumo.total || 0))}</b></div>
        <div class="numero"><span class="rotulo">Ativas</span><b>${esc(String(resumo.ativas || 0))}</b></div>
        <div class="numero"><span class="rotulo">Em teste</span><b>${esc(String(resumo.em_teste || 0))}</b></div>
        <div class="numero ${resumo.inadimplentes ? 'negativo' : ''}">
          <span class="rotulo">Inadimplentes</span><b>${esc(String(resumo.inadimplentes || 0))}</b></div>
      </div>

      <div class="topo">
        <h2 style="margin:0">Contas</h2>
        <div class="topo-acoes">
          ${[['todas', 'Todas'], ['ativas', 'Ativas'], ['teste', 'Em teste'], ['inadimplentes', 'Inadimplentes']]
            .map(([k, n]) => `<button class="btn btn-sm ${filtro === k ? 'btn-primary' : ''}" data-filtro="${k}">${n}</button>`).join('')}
        </div>
      </div>

      <div class="card">
        ${itens.length === 0 ? estadoVazio({ icone: '📋', titulo: 'Nenhuma conta nesta lista' }) : `
          <div class="tabela-wrap"><table>
            <thead><tr><th>Barbearia</th><th>Dono</th><th>Situação</th><th>Uso</th><th>Mensal</th><th></th></tr></thead>
            <tbody>${itens.map((b) => {
              const [cor, txt] = situacao(b);
              return `<tr>
                <td><b>${esc(b.nome)}</b><br>
                    <span class="muted t-xs">/agendar/${esc(b.slug || '')}</span></td>
                <td class="muted t-sm">${esc(b.dono_email || '—')}</td>
                <td><span class="chip ${cor}">${esc(txt)}</span><br>
                    <span class="muted t-xs">vence ${esc(dataCurta(b.expira_em))}</span></td>
                <td class="muted t-sm">${esc(String(b.clientes))} clientes · ${esc(String(b.agendamentos))} agend.<br>
                    <span class="t-xs">${b.ultimo_uso ? 'ativo em ' + esc(dataCurta(iso(new Date(b.ultimo_uso)))) : 'nunca usou'}</span></td>
                <td>${money(b.valor_mensal)}</td>
                <td style="text-align:right"><button class="btn btn-sm" data-conta="${esc(b.id)}">Gerenciar</button></td>
              </tr>`;
            }).join('')}
            </tbody></table></div>`}
      </div>
    </main>`;

  $('#sair').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('/index.html'); });
  document.querySelectorAll('[data-filtro]').forEach((b) =>
    b.addEventListener('click', () => { filtro = b.dataset.filtro; desenha(); }));
  document.querySelectorAll('[data-conta]').forEach((b) =>
    b.addEventListener('click', () => gerenciar(barbearias.find((x) => x.id === b.dataset.conta))));
}

/* ---------------------------- gerenciar ----------------------------- */
function gerenciar(b) {
  if (!b) return;
  const dlg = modal({
    titulo: b.nome,
    largura: 560,
    corpo: `
      <div class="resumo-venda" style="margin-top:0">
        <div><span>Dono</span><b>${esc(b.dono_email || '—')}</b></div>
        <div><span>Criada em</span><b>${esc(dataCurta(iso(new Date(b.criada_em))))}</b></div>
        <div><span>Pessoas / clientes</span><b>${esc(String(b.pessoas))} / ${esc(String(b.clientes))}</b></div>
        <div><span>Já pagou</span><b>${money(b.ja_pagou)}</b></div>
      </div>

      <div class="linha" style="margin-top:1rem">
        <div class="campo"><label for="gStatus">Situação</label>
          <select id="gStatus">
            ${['trial', 'ativa', 'suspensa', 'cancelada'].map((s) =>
              `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></div>
        <div class="campo"><label for="gExpira">Vence em</label>
          <input id="gExpira" type="date" value="${esc(b.expira_em)}"></div>
      </div>
      <div class="campo">
        <label for="gValor">Mensalidade (R$)</label>
        <input id="gValor" type="number" min="0" step="0.01" value="${esc(b.valor_mensal)}">
      </div>

      <div class="modal-acoes">
        <button class="btn btn-primary btn-sm" data-salvar>Salvar mudanças</button>
        <button class="btn btn-sm" data-pagamento>💰 Registrar pagamento (+30 dias)</button>
        <button class="btn btn-sm btn-danger" data-apagar>Apagar conta</button>
      </div>`
  });

  dlg.querySelector('[data-salvar]').addEventListener('click', async () => {
    const { error } = await sb.rpc('admin_atualizar_barbearia', {
      p_barbearia: b.id,
      p_status: dlg.querySelector('#gStatus').value,
      p_expira_em: dlg.querySelector('#gExpira').value,
      p_valor: Number(dlg.querySelector('#gValor').value) || 0
    });
    if (error) return toastErro(traduzErro(error));
    dlg.close(); aviso('Conta atualizada.'); carregar();
  });

  dlg.querySelector('[data-pagamento]').addEventListener('click', () => {
    dlg.close();
    modal({
      titulo: `Registrar pagamento — ${b.nome}`,
      okTexto: 'Registrar',
      corpo: `
        <div class="linha">
          <div class="campo"><label for="pValor">Valor recebido (R$)</label>
            <input id="pValor" type="number" step="0.01" value="${esc(b.valor_mensal)}"></div>
          <div class="campo"><label for="pDias">Somar quantos dias</label>
            <input id="pDias" type="number" step="1" value="30"></div>
        </div>
        <div class="campo"><label for="pMeio">Como recebeu</label>
          <select id="pMeio"><option>Pix</option><option>Cartão</option><option>Dinheiro</option><option>Boleto</option></select></div>`,
      onOk: async (d) => {
        const { error } = await sb.rpc('admin_registrar_pagamento', {
          p_barbearia: b.id,
          p_valor: Number(d.querySelector('#pValor').value) || 0,
          p_meio: d.querySelector('#pMeio').value,
          p_dias: Math.trunc(Number(d.querySelector('#pDias').value) || 30)
        });
        if (error) { toastErro(traduzErro(error)); return false; }
        aviso('Pagamento registrado e conta reativada.');
        carregar();
      }
    });
  });

  dlg.querySelector('[data-apagar]').addEventListener('click', () => {
    dlg.close();
    modal({
      titulo: '⚠️ Apagar conta para sempre',
      okTexto: 'Apagar tudo',
      corpo: `
        <p>Isso apaga <b>todos</b> os dados da barbearia <b>${esc(b.nome)}</b>:
        agenda, clientes, vendas e logins. <b>Não tem volta.</b></p>
        <div class="campo">
          <label for="aNome">Digite o nome da barbearia para confirmar</label>
          <input id="aNome" placeholder="${esc(b.nome)}" autocomplete="off">
        </div>
        <div class="campo">
          <label for="aSenha">Sua senha de administrador</label>
          <input id="aSenha" type="password" autocomplete="current-password">
        </div>`,
      onOk: async (d) => {
        const { data: { session } } = await sb.auth.getSession();
        const resposta = await fetch('/api/admin-conta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            barbearia_id: b.id,
            senha: d.querySelector('#aSenha').value,
            confirmacao: d.querySelector('#aNome').value
          })
        });
        const r = await resposta.json().catch(() => ({}));
        if (!resposta.ok) { toastErro(r.erro || 'Não deu certo.'); return false; }
        aviso('Conta apagada.');
        carregar();
      }
    });
  });
}
