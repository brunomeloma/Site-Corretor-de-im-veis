/* =====================================================================
   BARBER PRO — núcleo do aplicativo
   Cuida de: sessão, qual barbearia/papel, menu e troca de telas.
   ===================================================================== */
import { configurado } from './config.js';
import { sb, traduzErro } from './supabase.js';
import {
  $, esc, iniciaTema, alternaTema, aplicaCor, erro as toastErro, aviso, modal
} from './ui.js';

import * as Agenda from './telas/agenda.js';
import * as Clientes from './telas/clientes.js';
import * as Servicos from './telas/servicos.js';
import * as Barbeiros from './telas/barbeiros.js';
import * as Ajustes from './telas/ajustes.js';

iniciaTema();

/** Estado global, lido pelas telas. */
export const estado = {
  user: null,
  barbearia: null,   // { id, nome, cor, status, expira_em, ... }
  papel: null,       // 'dono' | 'barbeiro' | 'recepcao'
  barbeiroId: null   // se o usuário logado for um barbeiro cadastrado
};

export const podeVerFinanceiro = () => estado.papel === 'dono';

const TELAS = {
  agenda:    { titulo: 'Agenda',    ico: '📅', mod: Agenda,    papeis: ['dono', 'barbeiro', 'recepcao'] },
  clientes:  { titulo: 'Clientes',  ico: '👤', mod: Clientes,  papeis: ['dono', 'barbeiro', 'recepcao'] },
  servicos:  { titulo: 'Serviços',  ico: '✂️', mod: Servicos,  papeis: ['dono'] },
  barbeiros: { titulo: 'Barbeiros', ico: '💈', mod: Barbeiros, papeis: ['dono'] },
  ajustes:   { titulo: 'Ajustes',   ico: '⚙️', mod: Ajustes,   papeis: ['dono', 'barbeiro', 'recepcao'] }
};

/* ------------------------------ partida ----------------------------- */
if (!configurado()) location.replace('/index.html');
else iniciar();

async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace('/index.html'); return; }
  estado.user = session.user;

  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') location.replace('/index.html');
  });

  await carregarContexto();
}

/** Descobre de qual barbearia o usuário faz parte e com qual papel. */
async function carregarContexto() {
  const { data: membros, error } = await sb
    .from('membros')
    .select('papel, barbearia_id, barbearias(*)')
    .order('criado_em', { ascending: true });

  if (error) { telaErroFatal(traduzErro(error)); return; }

  if (!membros || membros.length === 0) { telaCriarBarbearia(); return; }

  const escolhida = localStorage.getItem('bp_barbearia');
  const m = membros.find((x) => x.barbearia_id === escolhida) || membros[0];
  estado.papel = m.papel;
  estado.barbearia = m.barbearias;
  estado.membros = membros;
  localStorage.setItem('bp_barbearia', m.barbearia_id);

  if (estado.papel === 'barbeiro') {
    const { data: b } = await sb.from('barbeiros').select('id')
      .eq('barbearia_id', estado.barbearia.id).eq('user_id', estado.user.id).maybeSingle();
    estado.barbeiroId = b?.id || null;
  }

  aplicaCor(estado.barbearia.cor);
  montarShell();
}

/* --------------------- primeira vez: criar barbearia ---------------- */
function telaCriarBarbearia() {
  $('#raiz').innerHTML = `
    <main class="auth-wrap">
      <form class="auth-card card" id="formBarbearia">
        <div class="logo" style="margin-bottom:1rem">
          <span class="logo-mark">✂</span><span>BARBER<span style="color:var(--brand)">PRO</span></span>
        </div>
        <h1>Vamos criar sua barbearia</h1>
        <p class="muted" style="font-size:.9rem">
          Você tem 14 dias de teste grátis. Dá pra mudar tudo isso depois em Ajustes.
        </p>
        <div class="campo">
          <label for="bNome">Nome da barbearia</label>
          <input id="bNome" required placeholder="Ex.: Barbearia do Bruno">
        </div>
        <div class="linha">
          <div class="campo">
            <label for="bTel">Telefone / WhatsApp</label>
            <input id="bTel" placeholder="(11) 90000-0000">
          </div>
          <div class="campo">
            <label for="bCor">Cor da marca</label>
            <input id="bCor" type="color" value="#c9a227" style="height:44px;padding:.2rem">
          </div>
        </div>
        <p id="bMsg" class="erro-msg"></p>
        <button class="btn btn-primary btn-block">Criar barbearia</button>
        <p style="text-align:center;margin:.8rem 0 0">
          <button type="button" id="sairAqui" class="btn btn-ghost btn-sm">Sair da conta</button>
        </p>
      </form>
    </main>`;

  $('#bCor').addEventListener('input', (e) => aplicaCor(e.target.value));
  $('#sairAqui').addEventListener('click', sair);

  $('#formBarbearia').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    const { error } = await sb.from('barbearias').insert({
      dono_user_id: estado.user.id,
      nome: $('#bNome').value.trim(),
      telefone: $('#bTel').value.trim() || null,
      cor: $('#bCor').value
    });
    btn.disabled = false;
    if (error) { $('#bMsg').textContent = traduzErro(error); return; }
    aviso('Barbearia criada! Bem-vindo ao BARBER PRO.');
    await carregarContexto();
  });
}

function telaErroFatal(msg) {
  $('#raiz').innerHTML = `
    <main class="auth-wrap"><div class="auth-card card">
      <h1>Algo deu errado</h1>
      <p class="muted">${esc(msg)}</p>
      <button class="btn btn-primary btn-block" onclick="location.reload()">Tentar de novo</button>
    </div></main>`;
}

/* ------------------------------- shell ------------------------------ */
function menuDoPapel() {
  return Object.entries(TELAS).filter(([, t]) => t.papeis.includes(estado.papel));
}

function montarShell() {
  const b = estado.barbearia;
  const itens = menuDoPapel().map(([id, t]) => `
    <button class="nav-item" data-tela="${id}">
      <span class="ico">${t.ico}</span> ${esc(t.titulo)}
    </button>`).join('');

  $('#raiz').innerHTML = `
    <div class="topbar-mobile">
      <button class="btn btn-sm btn-ghost" id="btnMenu" aria-label="Menu">☰</button>
      <b>${esc(b.nome)}</b>
    </div>
    <div class="app">
      <aside class="side" id="side">
        <div class="logo">
          <span class="logo-mark">✂</span>
          <span style="font-size:.95rem">${esc(b.nome)}</span>
        </div>
        <nav id="nav">${itens}</nav>
        <div class="side-foot">
          <div style="padding:.4rem .7rem;font-size:.8rem" class="muted">
            ${esc(estado.user.email || '')}<br>
            <span class="chip">${esc(rotuloPapel(estado.papel))}</span>
          </div>
          <button class="nav-item" id="btnTema"><span class="ico">🌗</span> Tema claro/escuro</button>
          <button class="nav-item" id="btnSair"><span class="ico">🚪</span> Sair</button>
        </div>
      </aside>
      <main class="main" id="conteudo"></main>
    </div>`;

  $('#btnTema').addEventListener('click', alternaTema);
  $('#btnSair').addEventListener('click', sair);
  $('#btnMenu')?.addEventListener('click', abreMenu);
  $('#nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tela]');
    if (btn) irPara(btn.dataset.tela);
  });
  window.addEventListener('hashchange', () => irPara(location.hash.slice(1)));

  avisoAssinatura();
  irPara(location.hash.slice(1) || 'agenda');
}

function abreMenu() {
  const side = $('#side');
  side.classList.add('aberta');
  const fundo = document.createElement('div');
  fundo.className = 'backdrop';
  fundo.addEventListener('click', () => { side.classList.remove('aberta'); fundo.remove(); });
  document.body.appendChild(fundo);
}

const rotuloPapel = (p) => ({ dono: 'Dono', barbeiro: 'Barbeiro', recepcao: 'Recepção' }[p] || p);

/** Troca de tela. Cada módulo exporta `render(container)`. */
export async function irPara(tela) {
  const permitidas = Object.fromEntries(menuDoPapel());
  const alvo = permitidas[tela] ? tela : 'agenda';
  if (location.hash.slice(1) !== alvo) location.hash = alvo;

  document.querySelectorAll('.nav-item[data-tela]').forEach((el) =>
    el.classList.toggle('ativo', el.dataset.tela === alvo));
  $('#side')?.classList.remove('aberta');
  document.querySelector('.backdrop')?.remove();

  const alvoEl = $('#conteudo');
  alvoEl.innerHTML = '<div class="carregando">Carregando...</div>';
  try {
    await TELAS[alvo].mod.render(alvoEl);
  } catch (e) {
    console.error(e);
    alvoEl.innerHTML = `<div class="card"><p class="erro-msg">${esc(traduzErro(e))}</p></div>`;
  }
}

/* --------------------------- assinatura ----------------------------- */
function avisoAssinatura() {
  const b = estado.barbearia;
  const dias = Math.ceil((new Date(b.expira_em + 'T23:59:59') - new Date()) / 86400000);
  if (b.status === 'ativa') return;
  if (dias < 0) {
    modal({
      titulo: 'Seu período de teste terminou',
      corpo: `<p>Para continuar usando o BARBER PRO, ative sua assinatura.
              Seus dados continuam guardados.</p>
              <p class="muted">A tela de pagamento entra numa próxima etapa.</p>`,
      okTexto: 'Entendi',
      onOk: () => true
    });
  } else if (dias <= 5) {
    aviso(`Seu teste grátis termina em ${dias} dia(s).`);
  }
}

async function sair() {
  await sb.auth.signOut();
  location.replace('/index.html');
}

export { toastErro };
