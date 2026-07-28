/* =====================================================================
   Página pública de auto-agendamento: /agendar/nome-da-barbearia
   O visitante não faz login e não lê nenhuma tabela — só chama as três
   funções liberadas no banco.
   ===================================================================== */
import { sb } from './supabase.js';
import {
  $, esc, iniciaTema, aplicaCor, money, hojeIso, somaDias, dataBonita, dataCurta,
  erro as toastErro, aviso, mascaraTelefone, estadoVazio
} from './ui.js';

iniciaTema();

// aceita /agendar/nome-da-barbearia  e  /agendar.html?b=nome-da-barbearia
const naRota = location.pathname.match(/^\/agendar\/([^/]+)\/?$/);
const slug = decodeURIComponent(
  naRota ? naRota[1] : (new URLSearchParams(location.search).get('b') || '')
);

const escolha = { servico: null, barbeiro: null, dia: hojeIso(), hora: null };
let info = null;
const raiz = $('#raiz');

iniciar();

async function iniciar() {
  if (!slug) return semBarbearia();
  const { data, error } = await sb.rpc('agenda_publica', { p_slug: slug });
  if (error || !data) return semBarbearia();

  info = data;
  document.title = `Agendar — ${info.nome}`;
  aplicaCor(info.cor);

  if (!info.servicos.length || !info.barbeiros.length) {
    raiz.innerHTML = capa() + `<div class="card">${estadoVazio({
      icone: '💈', titulo: 'Agendamento indisponível',
      texto: 'Esta barbearia ainda não configurou os horários. Chame no WhatsApp.' })}</div>`;
    return;
  }
  desenha();
}

function semBarbearia() {
  raiz.innerHTML = `<div class="card" style="max-width:420px;margin:3rem auto">${estadoVazio({
    icone: '🔎', titulo: 'Link não encontrado',
    texto: 'Confira o endereço com a barbearia — pode ter faltado um pedaço.' })}</div>`;
}

const capa = () => `
  <header class="publico-capa">
    <span class="logo-mark" aria-hidden="true">✂</span>
    <h1>${esc(info.nome)}</h1>
    ${info.endereco ? `<p class="muted t-sm">📍 ${esc(info.endereco)}</p>` : ''}
  </header>`;

/* ------------------------------ passos ------------------------------ */
function desenha() {
  raiz.innerHTML = capa() + `
    <div class="card passo">
      <h2>1. Qual serviço?</h2>
      <div class="opcoes" id="servicos">
        ${info.servicos.map((s) => `
          <button class="opcao ${escolha.servico === s.id ? 'escolhida' : ''}" data-servico="${esc(s.id)}">
            <b>${esc(s.nome)}</b>
            <span class="muted t-xs">${esc(String(s.duracao_min))} min · ${money(s.preco)}</span>
          </button>`).join('')}
      </div>
    </div>

    <div class="card passo" ${escolha.servico ? '' : 'hidden'}>
      <h2>2. Com quem?</h2>
      <div class="opcoes" id="barbeiros">
        ${info.barbeiros.map((b) => `
          <button class="opcao ${escolha.barbeiro === b.id ? 'escolhida' : ''}" data-barbeiro="${esc(b.id)}">
            <span class="ponto" style="background:${esc(b.cor)}"></span>
            <b>${esc(b.nome)}</b>
          </button>`).join('')}
      </div>
    </div>

    <div class="card passo" ${escolha.barbeiro ? '' : 'hidden'}>
      <h2>3. Que dia e hora?</h2>
      <div class="dias" id="dias">
        ${[...Array(14)].map((_, i) => {
          const d = somaDias(hojeIso(), i);
          const [ano, mes, dd] = d.split('-');
          const nome = dataBonita(d).split(',')[0];
          return `<button class="dia ${escolha.dia === d ? 'escolhida' : ''}" data-dia="${esc(d)}">
                    <span>${esc(nome.slice(0, 3))}</span><b>${esc(dd)}/${esc(mes)}</b>
                  </button>`;
        }).join('')}
      </div>
      <div id="horarios" class="horarios"><p class="muted t-sm">Escolha um dia.</p></div>
    </div>`;

  raiz.querySelectorAll('[data-servico]').forEach((b) => b.addEventListener('click', () => {
    escolha.servico = b.dataset.servico; escolha.hora = null; desenha();
  }));
  raiz.querySelectorAll('[data-barbeiro]').forEach((b) => b.addEventListener('click', () => {
    escolha.barbeiro = b.dataset.barbeiro; escolha.hora = null; desenha(); carregaHorarios();
  }));
  raiz.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
    escolha.dia = b.dataset.dia; escolha.hora = null; desenha(); carregaHorarios();
  }));

  if (escolha.barbeiro) carregaHorarios();
}

async function carregaHorarios() {
  const alvo = $('#horarios', raiz);
  if (!alvo) return;
  alvo.innerHTML = '<p class="muted t-sm">Procurando horários...</p>';

  const { data, error } = await sb.rpc('horarios_livres', {
    p_slug: slug, p_barbeiro: escolha.barbeiro, p_servico: escolha.servico, p_dia: escolha.dia
  });

  if (error) { alvo.innerHTML = '<p class="erro-msg">Não consegui buscar os horários.</p>'; return; }
  if (!data || data.length === 0) {
    alvo.innerHTML = '<p class="muted t-sm">😕 Sem horário livre nesse dia. Tente outro.</p>';
    return;
  }

  alvo.innerHTML = data.map((h) =>
    `<button class="hora-livre" data-hora="${esc(h)}">${esc(h)}</button>`).join('');
  alvo.querySelectorAll('[data-hora]').forEach((b) =>
    b.addEventListener('click', () => confirmar(b.dataset.hora)));
}

/* ---------------------------- confirmação --------------------------- */
function confirmar(hora) {
  escolha.hora = hora;
  const s = info.servicos.find((x) => x.id === escolha.servico);
  const b = info.barbeiros.find((x) => x.id === escolha.barbeiro);

  raiz.innerHTML = capa() + `
    <form class="card" id="formFim">
      <h2>Confirmar horário</h2>
      <div class="resumo-venda" style="margin-top:0">
        <div><span>Serviço</span><b>${esc(s.nome)}</b></div>
        <div><span>Com</span><b>${esc(b.nome)}</b></div>
        <div><span>Quando</span><b>${esc(dataCurta(escolha.dia))} às ${esc(hora)}</b></div>
        <div class="destaque"><span>Valor</span><b>${money(s.preco)}</b></div>
      </div>
      <div class="campo" style="margin-top:1rem">
        <label for="pNome">Seu nome</label>
        <input id="pNome" required autocomplete="name">
      </div>
      <div class="campo">
        <label for="pTel">Seu WhatsApp (com DDD)</label>
        <input id="pTel" inputmode="tel" required autocomplete="tel" placeholder="(11) 90000-0000">
      </div>
      <p id="pErro" class="erro-msg"></p>
      <button class="btn btn-primary btn-block" type="submit">Confirmar meu horário</button>
      <button class="btn btn-ghost btn-block" type="button" id="voltar" style="margin-top:.5rem">Voltar</button>
    </form>`;

  mascaraTelefone($('#pTel', raiz));
  $('#voltar', raiz).addEventListener('click', desenha);

  $('#formFim', raiz).addEventListener('submit', async (e) => {
    e.preventDefault();
    const botao = e.target.querySelector('button[type=submit]');
    botao.disabled = true;
    $('#pErro', raiz).textContent = '';

    const { data, error } = await sb.rpc('agendar_publico', {
      p_slug: slug, p_barbeiro: escolha.barbeiro, p_servico: escolha.servico,
      p_dia: escolha.dia, p_hora: hora,
      p_nome: $('#pNome', raiz).value.trim(), p_telefone: $('#pTel', raiz).value
    });

    botao.disabled = false;
    if (error) { $('#pErro', raiz).textContent = error.message || 'Não deu certo.'; return; }
    pronto(data, s, b);
  });
}

function pronto(resultado, s, b) {
  raiz.innerHTML = capa() + `
    <div class="card" style="text-align:center">
      <div class="estado-icone" style="margin:0 auto 1rem">✅</div>
      <h2>Horário confirmado!</h2>
      <div class="resumo-venda" style="text-align:left">
        <div><span>Serviço</span><b>${esc(s.nome)}</b></div>
        <div><span>Com</span><b>${esc(b.nome)}</b></div>
        <div class="destaque"><span>Quando</span><b>${esc(resultado?.quando || '')}</b></div>
      </div>
      <p class="muted t-sm" style="margin-top:1rem">
        Chegue uns minutinhos antes. Se precisar desmarcar, chame a barbearia.
      </p>
      ${info.telefone ? `<a class="btn btn-primary btn-block"
         href="https://wa.me/55${esc(info.telefone.replace(/\D/g, ''))}" target="_blank" rel="noopener">
         💬 Falar no WhatsApp</a>` : ''}
      <button class="btn btn-block" style="margin-top:.5rem" onclick="location.reload()">Marcar outro horário</button>
    </div>`;
  aviso('Prontinho! Seu horário está marcado.');
}
