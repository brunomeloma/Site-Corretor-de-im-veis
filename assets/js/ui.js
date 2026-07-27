/* Ajudantes de interface: escape de texto, avisos, modais, datas, dinheiro. */

/** Escapa TUDO que veio do usuário antes de virar HTML (previne XSS). */
export function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

/** Atalho para montar HTML com escape automático das interpolações. */
export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? esc(vals[i]) : ''), '');
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/* ------------------------------ avisos ------------------------------ */
export function toast(msg, tipo = '') {
  let caixa = document.getElementById('toasts');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'toasts';
    document.body.appendChild(caixa);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  caixa.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
export const aviso = (m) => toast(m, 'ok');
export const erro = (m) => toast(m, 'erro');

/* ------------------------------ modal ------------------------------- */
/**
 * Abre um modal. `corpo` é HTML JÁ ESCAPADO por quem chamou.
 * Retorna o <dialog> para ligar eventos nos campos.
 */
export function modal({ titulo, corpo, okTexto = 'Salvar', onOk, largura }) {
  const dlg = document.createElement('dialog');
  if (largura) dlg.style.width = `min(${largura}px, calc(100vw - 2rem))`;
  dlg.innerHTML = `
    <form method="dialog" class="modal-form">
      <div class="modal-head">
        <h2>${esc(titulo)}</h2>
        <button class="btn btn-sm btn-ghost" value="cancelar" type="submit" aria-label="Fechar">✕</button>
      </div>
      <div class="modal-body">${corpo}</div>
      <div class="modal-foot">
        <button class="btn" value="cancelar" type="submit">Cancelar</button>
        ${onOk ? `<button class="btn btn-primary" value="ok" type="button" data-ok>${esc(okTexto)}</button>` : ''}
      </div>
    </form>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  const btnOk = dlg.querySelector('[data-ok]');
  if (btnOk) {
    btnOk.addEventListener('click', async () => {
      btnOk.disabled = true;
      try {
        const fechar = await onOk(dlg);
        if (fechar !== false) dlg.close();
      } finally { btnOk.disabled = false; }
    });
  }
  dlg.showModal();
  const primeiro = dlg.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
  if (primeiro) setTimeout(() => primeiro.focus(), 50);
  return dlg;
}

export function confirmar(texto, { titulo = 'Confirmar', okTexto = 'Confirmar' } = {}) {
  return new Promise((resolve) => {
    const dlg = modal({
      titulo, corpo: `<p>${esc(texto)}</p>`, okTexto,
      onOk: () => { resolve(true); return true; }
    });
    dlg.addEventListener('close', () => resolve(false), { once: true });
  });
}

/* ------------------------------ datas ------------------------------- */
export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/** Data (objeto) -> "2026-07-27" no fuso do navegador. */
export function iso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const hojeIso = () => iso(new Date());

export function somaDias(dataIso, n) {
  const [a, m, d] = dataIso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + n);
  return iso(dt);
}

export function dataBonita(dataIso) {
  const [a, m, d] = dataIso.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  return `${DIAS[dt.getDay()]}, ${d} de ${MESES[m - 1]}`;
}
export const dataCurta = (dataIso) => dataIso.split('-').reverse().join('/');

/** "2026-07-27" + "14:30" -> Date local */
export function montaData(dataIso, hora) {
  const [a, m, d] = dataIso.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm, 0, 0);
}
export function horaDe(dataHoraIso) {
  const d = new Date(dataHoraIso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const minutosDe = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};
export const horaDeMinutos = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/* ------------------------------ dinheiro ---------------------------- */
export const money = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ------------------------------ telefone ---------------------------- */
export function mascaraTelefone(input) {
  input.addEventListener('input', () => {
    const n = input.value.replace(/\D/g, '').slice(0, 11);
    input.value = n.length <= 10
      ? n.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
          [a && `(${a}`, a.length === 2 ? ') ' : '', b, c && `-${c}`].join(''))
      : n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  });
}
export const soDigitos = (t) => String(t || '').replace(/\D/g, '');

/* ------------------------------ tema -------------------------------- */
export function aplicaTema(tema) {
  document.documentElement.dataset.tema = tema;
  localStorage.setItem('bp_tema', tema);
}
export function iniciaTema() {
  const salvo = localStorage.getItem('bp_tema');
  aplicaTema(salvo || 'escuro');
}
export function alternaTema() {
  aplicaTema(document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro');
}

/** Aplica a cor da barbearia no sistema todo. */
export function aplicaCor(cor) {
  if (!cor) return;
  document.documentElement.style.setProperty('--brand', cor);
  // texto escuro ou claro em cima da cor, dependendo do brilho dela
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16) || 0);
  const brilho = (r * 299 + g * 587 + b * 114) / 1000;
  document.documentElement.style.setProperty('--brand-ink', brilho > 150 ? '#10121a' : '#ffffff');
}
