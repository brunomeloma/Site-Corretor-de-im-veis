/* Tela de entrada: configuração inicial, login, cadastro e reset de senha. */
import { configurado, salvarConfig } from './config.js';
import { sb, traduzErro } from './supabase.js';
import { $, iniciaTema, aviso, erro as toastErro, modal } from './ui.js';

iniciaTema();

const setup = $('#setup');
const auth = $('#auth');

/* ------------------------- 1. configuração -------------------------- */
if (!configurado()) {
  setup.hidden = false;
  $('#cfgSalvar').addEventListener('click', () => {
    const url = $('#cfgUrl').value.trim();
    const key = $('#cfgKey').value.trim();
    if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
      $('#cfgErro').textContent = 'A URL deve ser parecida com https://xxxx.supabase.co';
      return;
    }
    if (key.length < 40) {
      $('#cfgErro').textContent = 'A chave anon parece incompleta.';
      return;
    }
    salvarConfig(url.replace(/\/$/, ''), key);
    location.reload();
  });
} else {
  auth.hidden = false;
  iniciar();
}

/* ------------------------------ login ------------------------------- */
async function iniciar() {
  // Já logado? vai direto pro sistema.
  const { data } = await sb.auth.getSession();
  if (data.session) { location.replace('/app.html'); return; }

  const tabEntrar = $('#tabEntrar');
  const tabCriar = $('#tabCriar');
  const formEntrar = $('#formEntrar');
  const formCriar = $('#formCriar');

  const troca = (criando) => {
    tabEntrar.setAttribute('aria-selected', String(!criando));
    tabCriar.setAttribute('aria-selected', String(criando));
    formEntrar.hidden = criando;
    formCriar.hidden = !criando;
  };
  tabEntrar.addEventListener('click', () => troca(false));
  tabCriar.addEventListener('click', () => troca(true));

  formEntrar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formEntrar.querySelector('button[type=submit]');
    btn.disabled = true;
    $('#msgEntrar').textContent = '';
    const { error } = await sb.auth.signInWithPassword({
      email: $('#email').value.trim(),
      password: $('#senha').value
    });
    btn.disabled = false;
    if (error) { $('#msgEntrar').textContent = traduzErro(error); return; }
    location.replace('/app.html');
  });

  formCriar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formCriar.querySelector('button[type=submit]');
    btn.disabled = true;
    $('#msgCriar').textContent = '';
    const email = $('#cEmail').value.trim();
    const senha = $('#cSenha').value;
    const { data, error } = await sb.auth.signUp({
      email, password: senha,
      options: { data: { nome: $('#cNome').value.trim() } }
    });
    btn.disabled = false;
    if (error) { $('#msgCriar').textContent = traduzErro(error); return; }

    if (data.session) { location.replace('/app.html'); return; }
    // Confirmação de e-mail ligada no Supabase:
    aviso('Conta criada! Confirme o e-mail que enviamos e depois entre.');
    troca(false);
  });

  $('#linkReset').addEventListener('click', () => {
    modal({
      titulo: 'Recuperar senha',
      corpo: `
        <p class="muted" style="margin-top:0">
          Digite seu e-mail. Enviamos um link para você criar uma nova senha.
          (Por segurança, nenhuma senha pode ser "mostrada" — só trocada.)
        </p>
        <div class="campo">
          <label for="rEmail">E-mail</label>
          <input id="rEmail" type="email" value="${''}">
        </div>`,
      okTexto: 'Enviar link',
      onOk: async (dlg) => {
        const email = dlg.querySelector('#rEmail').value.trim();
        if (!email) return false;
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + '/nova-senha.html'
        });
        if (error) { toastErro(traduzErro(error)); return false; }
        aviso('Link enviado! Confira seu e-mail.');
      }
    });
  });
}
