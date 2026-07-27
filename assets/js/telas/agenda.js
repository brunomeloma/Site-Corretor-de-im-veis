/* =====================================================================
   Tela AGENDA — visão do dia, uma coluna por barbeiro.
   Barbeiro comum vê só a própria coluna.
   ===================================================================== */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, modal, confirmar, aviso, erro as toastErro, hojeIso, somaDias, dataBonita,
  montaData, horaDe, minutosDe, horaDeMinutos, money, soDigitos, estadoVazio, esqueleto
} from '../ui.js';

const PASSO = 30; // tamanho do "quadradinho" de horário, em minutos

let dia = hojeIso();
let dados = { barbeiros: [], servicos: [], clientes: [], agendamentos: [] };
let caixa;

export async function render(container) {
  caixa = container;
  await carregar();
  desenha();
}

async function carregar() {
  const bid = estado.barbearia.id;
  const de = montaData(dia, '00:00').toISOString();
  const ate = montaData(somaDias(dia, 1), '00:00').toISOString();

  const [barbeiros, servicos, clientes, agendamentos] = await Promise.all([
    sb.from('barbeiros').select('*').eq('barbearia_id', bid).eq('ativo', true).order('nome'),
    sb.from('servicos').select('*').eq('barbearia_id', bid).eq('ativo', true).order('nome'),
    sb.from('clientes').select('id,nome,telefone').eq('barbearia_id', bid).order('nome').limit(1000),
    sb.from('agendamentos').select('*').eq('barbearia_id', bid)
      .gte('inicio', de).lt('inicio', ate).order('inicio')
  ]);

  for (const r of [barbeiros, servicos, clientes, agendamentos])
    if (r.error) throw r.error;

  dados = {
    barbeiros: barbeiros.data,
    servicos: servicos.data,
    clientes: clientes.data,
    agendamentos: agendamentos.data
  };

  // Barbeiro comum só enxerga a agenda dele.
  if (estado.papel === 'barbeiro' && estado.barbeiroId) {
    dados.barbeiros = dados.barbeiros.filter((b) => b.id === estado.barbeiroId);
    dados.agendamentos = dados.agendamentos.filter((a) => a.barbeiro_id === estado.barbeiroId);
  }
}

/* ------------------------------ desenho ----------------------------- */
function desenha() {
  const total = dados.agendamentos.filter((a) => a.status !== 'cancelado').length;

  caixa.innerHTML = `
    <div class="topo">
      <div>
        <h1>Agenda</h1>
        <p class="muted" style="margin:0">${esc(dataBonita(dia))} · ${total} atendimento(s)</p>
      </div>
      <div class="topo-acoes">
        <div class="seletor-dia">
          <button class="btn btn-sm btn-ghost btn-icone" data-nav="-1" aria-label="Dia anterior">◀</button>
          <input type="date" id="inputDia" value="${esc(dia)}" style="width:auto" aria-label="Data">
          <button class="btn btn-sm btn-ghost btn-icone" data-nav="1" aria-label="Próximo dia">▶</button>
        </div>
        <button class="btn btn-sm" id="btnHoje">Hoje</button>
        <button class="btn btn-primary" id="btnNovo">+ Agendar</button>
      </div>
    </div>
    <div id="grade"></div>`;

  caixa.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => trocarDia(somaDias(dia, Number(b.dataset.nav)))));
  $('#inputDia', caixa).addEventListener('change', (e) => e.target.value && trocarDia(e.target.value));
  $('#btnHoje', caixa).addEventListener('click', () => trocarDia(hojeIso()));
  $('#btnNovo', caixa).addEventListener('click', () => formAgendamento({}));

  desenhaGrade();
}

async function trocarDia(novo) {
  dia = novo;
  caixa.innerHTML = esqueleto('colunas');
  await carregar();
  desenha();
}

function desenhaGrade() {
  const grade = $('#grade', caixa);

  if (dados.barbeiros.length === 0) {
    grade.innerHTML = `<div class="card card-plano">${estadoVazio({
      icone: '💈',
      titulo: 'Nenhum barbeiro na agenda',
      texto: estado.papel === 'dono'
        ? 'Cadastre quem atende para a agenda começar a funcionar.'
        : 'Peça ao dono da barbearia para cadastrar os barbeiros.',
      acao: estado.papel === 'dono'
        ? '<button class="btn btn-primary" data-ir-barbeiros>Cadastrar barbeiro</button>' : ''
    })}</div>`;
    grade.querySelector('[data-ir-barbeiros]')?.addEventListener('click', () => { location.hash = 'barbeiros'; });
    return;
  }

  const diaSemana = String(montaData(dia, '12:00').getDay());

  grade.innerHTML = `<div class="colunas">${dados.barbeiros.map((b) => {
    const ags = dados.agendamentos.filter((a) => a.barbeiro_id === b.id);
    return `
      <section class="coluna-barbeiro">
        <div class="coluna-head">
          <span class="ponto" style="background:${esc(b.cor)}"></span>
          <span>${esc(b.nome)}</span>
          <span class="contador">${ags.filter((a) => a.status !== 'cancelado').length}</span>
        </div>
        ${linhasDoBarbeiro(b, ags, diaSemana)}
      </section>`;
  }).join('')}</div>`;

  grade.querySelectorAll('[data-livre]').forEach((el) =>
    el.addEventListener('click', () => formAgendamento({
      barbeiro_id: el.dataset.barbeiro, hora: el.dataset.livre
    })));
  grade.querySelectorAll('[data-ag]').forEach((el) =>
    el.addEventListener('click', () => detalhe(dados.agendamentos.find((a) => a.id === el.dataset.ag))));
}

function linhasDoBarbeiro(barbeiro, ags, diaSemana) {
  const faixas = (barbeiro.horarios || {})[diaSemana] || [];
  const marcados = new Map(); // minuto de início -> agendamento
  const ocupado = new Set();  // minutos cobertos por algum agendamento

  for (const a of ags) {
    if (a.status === 'cancelado') continue;
    const ini = minutosDe(horaDe(a.inicio));
    const fim = minutosDe(horaDe(a.fim));
    marcados.set(ini, a);
    for (let m = ini; m < fim; m += 5) ocupado.add(m);
  }

  // pontos de tempo: os "quadradinhos" do expediente + os inícios de agendamento
  const pontos = new Set([...marcados.keys()]);
  for (const [de, ate] of faixas)
    for (let m = minutosDe(de); m + PASSO <= minutosDe(ate); m += PASSO) pontos.add(m);

  const ordenados = [...pontos].sort((a, b) => a - b);
  if (ordenados.length === 0) {
    return `<div class="slot" style="padding:1.4rem;justify-content:center">
              <span class="muted t-sm">☕ Folga hoje</span>
            </div>`;
  }

  const cancelados = ags.filter((a) => a.status === 'cancelado');
  let html = '';
  for (const m of ordenados) {
    const ag = marcados.get(m);
    if (ag) { html += linhaAg(m, ag); continue; }
    // dentro de um atendimento em andamento? não mostra slot livre
    let dentro = false;
    for (let x = m; x < m + PASSO; x += 5) if (ocupado.has(x)) dentro = true;
    if (dentro) continue;
    html += `
      <div class="slot slot-livre" data-livre="${horaDeMinutos(m)}" data-barbeiro="${esc(barbeiro.id)}">
        <span class="hora">${horaDeMinutos(m)}</span>
        <span class="add">+ horário livre</span>
      </div>`;
  }
  html += cancelados.map((a) => linhaAg(minutosDe(horaDe(a.inicio)), a)).join('');
  return html;
}

function linhaAg(minuto, a) {
  const servico = dados.servicos.find((s) => s.id === a.servico_id);
  const nome = a.cliente_nome || dados.clientes.find((c) => c.id === a.cliente_id)?.nome || 'Cliente';
  const marca = { atendido: '✔', faltou: '✖', confirmado: '☑' }[a.status] || '';
  return `
    <div class="slot">
      <span class="hora">${horaDeMinutos(minuto)}</span>
      <div class="ag ${esc(a.status)}" data-ag="${esc(a.id)}">
        <b>${esc(nome)} ${marca}</b>
        <span class="detalhe">${esc(servico?.nome || 'Serviço')} · ${horaDe(a.inicio)}–${horaDe(a.fim)}</span>
      </div>
    </div>`;
}

/* ----------------------- novo / editar agendamento ------------------ */
function formAgendamento({ id, barbeiro_id, hora }) {
  const ag = id ? dados.agendamentos.find((a) => a.id === id) : null;
  const barbeiroSel = ag?.barbeiro_id || barbeiro_id || dados.barbeiros[0]?.id || '';
  const horaSel = ag ? horaDe(ag.inicio) : (hora || '09:00');

  if (dados.barbeiros.length === 0) { toastErro('Cadastre um barbeiro primeiro.'); return; }
  if (dados.servicos.length === 0) { toastErro('Cadastre um serviço primeiro.'); return; }

  const opcoes = (arr, sel, extra = (x) => '') => arr.map((x) =>
    `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}${extra(x)}</option>`).join('');

  const dlg = modal({
    titulo: ag ? 'Editar agendamento' : 'Novo agendamento',
    okTexto: ag ? 'Salvar' : 'Agendar',
    corpo: `
      <div class="campo">
        <label for="aCliente">Cliente</label>
        <select id="aCliente">
          <option value="">— Encaixe / sem cadastro —</option>
          ${opcoes(dados.clientes, ag?.cliente_id)}
        </select>
      </div>
      <div class="campo" id="campoNome" ${ag?.cliente_id ? 'hidden' : ''}>
        <label for="aNome">Nome do cliente (encaixe)</label>
        <input id="aNome" value="${esc(ag?.cliente_nome || '')}" placeholder="Ex.: João (encaixe)">
      </div>
      <div class="campo">
        <label for="aServico">Serviço</label>
        <select id="aServico">
          ${opcoes(dados.servicos, ag?.servico_id, (s) => ` — ${s.duracao_min}min · ${money(s.preco)}`)}
        </select>
      </div>
      <div class="campo">
        <label for="aBarbeiro">Barbeiro</label>
        <select id="aBarbeiro">${opcoes(dados.barbeiros, barbeiroSel)}</select>
      </div>
      <div class="linha">
        <div class="campo">
          <label for="aData">Data</label>
          <input id="aData" type="date" value="${esc(dia)}">
        </div>
        <div class="campo">
          <label for="aHora">Horário</label>
          <input id="aHora" type="time" step="300" value="${esc(horaSel)}">
        </div>
      </div>
      <div class="campo">
        <label for="aObs">Observação</label>
        <input id="aObs" value="${esc(ag?.observacao || '')}" placeholder="Ex.: máquina 2 nas laterais">
      </div>
      <p class="muted" id="aResumo" style="font-size:.85rem"></p>`,
    onOk: async (dlg) => salvarAgendamento(dlg, ag)
  });

  const sel = dlg.querySelector('#aCliente');
  const resumo = () => {
    const s = dados.servicos.find((x) => x.id === dlg.querySelector('#aServico').value);
    const h = dlg.querySelector('#aHora').value;
    if (!s || !h) return;
    const fim = horaDeMinutos(minutosDe(h) + s.duracao_min);
    dlg.querySelector('#aResumo').textContent = `Vai ocupar das ${h} às ${fim} · ${money(s.preco)}`;
  };
  sel.addEventListener('change', () => {
    dlg.querySelector('#campoNome').hidden = Boolean(sel.value);
  });
  dlg.querySelector('#aServico').addEventListener('change', resumo);
  dlg.querySelector('#aHora').addEventListener('change', resumo);
  resumo();
}

async function salvarAgendamento(dlg, ag) {
  const clienteId = dlg.querySelector('#aCliente').value || null;
  const nomeSolto = dlg.querySelector('#aNome').value.trim();
  const servico = dados.servicos.find((s) => s.id === dlg.querySelector('#aServico').value);
  const data = dlg.querySelector('#aData').value;
  const hora = dlg.querySelector('#aHora').value;

  if (!clienteId && !nomeSolto) { toastErro('Informe o cliente (ou um nome para o encaixe).'); return false; }
  if (!data || !hora) { toastErro('Escolha data e horário.'); return false; }

  const inicio = montaData(data, hora);
  const fim = new Date(inicio.getTime() + servico.duracao_min * 60000);

  const linha = {
    barbearia_id: estado.barbearia.id,
    cliente_id: clienteId,
    cliente_nome: clienteId ? null : nomeSolto,
    barbeiro_id: dlg.querySelector('#aBarbeiro').value,
    servico_id: servico.id,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    preco: servico.preco,
    observacao: dlg.querySelector('#aObs').value.trim() || null,
    criado_por: estado.user.id
  };

  const q = ag
    ? sb.from('agendamentos').update(linha).eq('id', ag.id)
    : sb.from('agendamentos').insert(linha);
  const { error } = await q;
  if (error) { toastErro(traduzErro(error)); return false; }

  aviso(ag ? 'Agendamento atualizado.' : 'Agendamento criado!');
  dia = data;
  await trocarDia(data);
}

/* --------------------------- detalhe / ações ------------------------ */
function detalhe(a) {
  if (!a) return;
  const servico = dados.servicos.find((s) => s.id === a.servico_id);
  const cliente = dados.clientes.find((c) => c.id === a.cliente_id);
  const barbeiro = dados.barbeiros.find((b) => b.id === a.barbeiro_id);
  const nome = a.cliente_nome || cliente?.nome || 'Cliente';

  const dlg = modal({
    titulo: nome,
    corpo: `
      <p style="margin-top:0">
        <span class="chip">${esc(a.status)}</span>
        ${servico ? `<span class="chip">${esc(servico.nome)}</span>` : ''}
      </p>
      <table>
        <tr><th>Horário</th><td>${horaDe(a.inicio)} – ${horaDe(a.fim)}</td></tr>
        <tr><th>Barbeiro</th><td>${esc(barbeiro?.nome || '-')}</td></tr>
        <tr><th>Valor</th><td>${money(a.preco)}</td></tr>
        ${cliente?.telefone ? `<tr><th>Telefone</th><td>${esc(cliente.telefone)}</td></tr>` : ''}
        ${a.observacao ? `<tr><th>Observação</th><td>${esc(a.observacao)}</td></tr>` : ''}
      </table>
      <div class="modal-acoes">
        <button class="btn btn-sm" data-status="confirmado">☑ Confirmado</button>
        <button class="btn btn-sm" data-status="atendido">✔ Atendido</button>
        <button class="btn btn-sm" data-status="faltou">✖ Faltou</button>
        <button class="btn btn-sm" data-editar>✎ Editar</button>
        ${cliente?.telefone ? '<button class="btn btn-sm" data-zap>💬 WhatsApp</button>' : ''}
        <button class="btn btn-sm btn-danger" data-cancelar>Cancelar atendimento</button>
      </div>`
  });

  dlg.querySelectorAll('[data-status]').forEach((b) =>
    b.addEventListener('click', async () => {
      const { error } = await sb.from('agendamentos').update({ status: b.dataset.status }).eq('id', a.id);
      if (error) return toastErro(traduzErro(error));
      dlg.close(); aviso('Status atualizado.'); trocarDia(dia);
    }));

  dlg.querySelector('[data-editar]').addEventListener('click', () => {
    dlg.close(); formAgendamento({ id: a.id });
  });

  dlg.querySelector('[data-zap]')?.addEventListener('click', () => {
    const texto = `Olá ${nome}! Confirmando seu horário na ${estado.barbearia.nome}: ` +
      `${dataBonita(dia)} às ${horaDe(a.inicio)} com ${barbeiro?.nome || 'nosso barbeiro'}. Até lá! ✂`;
    window.open(`https://wa.me/55${soDigitos(cliente.telefone)}?text=${encodeURIComponent(texto)}`, '_blank');
  });

  dlg.querySelector('[data-cancelar]').addEventListener('click', async () => {
    dlg.close();
    if (!await confirmar('Cancelar este atendimento? O horário fica livre de novo.')) return;
    const { error } = await sb.from('agendamentos').update({ status: 'cancelado' }).eq('id', a.id);
    if (error) return toastErro(traduzErro(error));
    aviso('Atendimento cancelado.'); trocarDia(dia);
  });
}
