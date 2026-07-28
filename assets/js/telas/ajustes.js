/* =====================================================================
   Tela AJUSTES — dados da barbearia, link público, notificações,
   fidelidade, assinatura, atalhos e backup.
   ===================================================================== */
import { sb, traduzErro } from '../supabase.js';
import { estado, irPara } from '../app.js';
import {
  $, esc, aviso, erro as toastErro, aplicaCor, alternaTema, dataCurta, mascaraTelefone, modal
} from '../ui.js';
import { suportaPush, estaLigado, ligar, desligar } from '../push.js';

let caixa;

export async function render(container) {
  caixa = container;
  const b = estado.barbearia;
  const dono = estado.papel === 'dono';
  const assinatura = estado.assinatura || {};
  const linkPublico = `${location.origin}/agendar/${b.slug || ''}`;

  const [{ data: notif }, pushLigado] = await Promise.all([
    sb.from('config_notificacao').select('*').eq('barbearia_id', b.id).maybeSingle(),
    estaLigado().catch(() => false)
  ]);

  caixa.innerHTML = `
    <div class="topo"><h1>Ajustes</h1></div>

    <div class="card">
      <h2>Assinatura</h2>
      <p style="margin:0">
        <span class="chip ${assinatura.bloqueado ? 'chip-danger' : assinatura.status === 'ativa' ? 'chip-ok' : 'chip-warn'}">
          ${esc(assinatura.texto || b.status)}
        </span>
        <span class="muted"> — vence em ${esc(dataCurta(b.expira_em))}</span>
      </p>
    </div>

    <div class="card">
      <h2>🔔 Notificações no celular</h2>
      <p class="muted t-sm" style="margin-top:0">
        Avisa o barbeiro antes do próximo atendimento, mesmo com o sistema fechado.
      </p>
      ${suportaPush()
        ? `<button class="btn ${pushLigado ? '' : 'btn-primary'}" id="btnPush">
             ${pushLigado ? '🔕 Desligar neste aparelho' : '🔔 Ligar neste aparelho'}
           </button>`
        : '<p class="muted t-sm">Este navegador não aceita notificações. No iPhone, primeiro adicione o app à tela de início.</p>'}
      ${dono ? `
        <div class="campo" style="max-width:260px;margin-top:1rem">
          <label for="minAntes">Avisar quantos minutos antes?</label>
          <input id="minAntes" type="number" min="5" max="240" step="5" value="${esc(notif?.minutos_antes ?? 30)}">
        </div>
        <button class="btn btn-sm" id="btnSalvarNotif">Salvar</button>` : ''}
    </div>

    <div class="card">
      <h2>🔗 Link de auto-agendamento</h2>
      <p class="muted t-sm" style="margin-top:0">
        Mande no WhatsApp ou coloque na bio do Instagram: o cliente marca sozinho,
        só nos horários livres.
      </p>
      <div class="campo">
        <input id="linkPublico" value="${esc(linkPublico)}" readonly>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="btnCopiar">📋 Copiar link</button>
        <a class="btn btn-sm" href="${esc(linkPublico)}" target="_blank" rel="noopener">Ver como o cliente vê</a>
        ${dono ? `<button class="btn btn-sm" id="btnPublico">
          ${b.agendamento_publico === false ? 'Ligar' : 'Desligar'} auto-agendamento</button>` : ''}
      </div>
    </div>

    ${dono ? `
    <form class="card" id="formBarbearia">
      <h2>Dados da barbearia</h2>
      <div class="campo">
        <label for="nome">Nome</label>
        <input id="nome" value="${esc(b.nome)}">
      </div>
      <div class="linha">
        <div class="campo">
          <label for="tel">Telefone / WhatsApp</label>
          <input id="tel" inputmode="tel" value="${esc(b.telefone || '')}">
        </div>
        <div class="campo">
          <label for="cor">Cor da marca</label>
          <input id="cor" type="color" value="${esc(b.cor)}">
        </div>
      </div>
      <div class="campo">
        <label for="end">Endereço</label>
        <input id="end" value="${esc(b.endereco || '')}">
      </div>
      <button class="btn btn-primary">Salvar</button>
    </form>

    <div class="card">
      <h2>🎁 Cartão fidelidade</h2>
      <p class="muted t-sm" style="margin-top:0">
        A cada X cortes, o próximo sai de graça. O sistema conta sozinho e avisa na ficha do cliente.
      </p>
      <div class="linha">
        <div class="campo">
          <label for="fidAtiva">Situação</label>
          <select id="fidAtiva">
            <option value="1" ${b.fidelidade_ativa ? 'selected' : ''}>Ligado</option>
            <option value="0" ${b.fidelidade_ativa ? '' : 'selected'}>Desligado</option>
          </select>
        </div>
        <div class="campo">
          <label for="fidMeta">Cortes para ganhar um grátis</label>
          <input id="fidMeta" type="number" min="2" max="50" step="1" value="${esc(b.fidelidade_meta ?? 10)}">
        </div>
      </div>
      <button class="btn btn-sm" id="btnFidelidade">Salvar fidelidade</button>
    </div>

    <div class="card atalhos-mobile">
      <h2>Cadastros</h2>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn" data-ir="servicos">✂️ Serviços</button>
        <button class="btn" data-ir="produtos">🧴 Produtos</button>
        <button class="btn" data-ir="barbeiros">💈 Barbeiros</button>
        <button class="btn" data-ir="equipe">🔑 Equipe</button>
      </div>
    </div>` : ''}

    <div class="card">
      <h2>Aparência</h2>
      <button class="btn" id="btnTema">🌗 Alternar tema claro/escuro</button>
    </div>

    <div class="card">
      <h2>Backup dos dados</h2>
      <p class="muted t-sm" style="margin-top:0">
        Baixa um arquivo com tudo da sua barbearia. Guarde de vez em quando.
      </p>
      <button class="btn" id="btnBackup">⬇ Baixar backup (.json)</button>
    </div>`;

  /* ---------------------------- eventos ----------------------------- */
  $('#btnTema', caixa).addEventListener('click', alternaTema);
  $('#btnBackup', caixa).addEventListener('click', backup);

  $('#btnCopiar', caixa).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(linkPublico); aviso('Link copiado!'); }
    catch { $('#linkPublico', caixa).select(); aviso('Selecionei o link — use Ctrl+C.'); }
  });

  $('#btnPush', caixa)?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    const problema = pushLigado ? await desligar() : await ligar();
    e.target.disabled = false;
    if (problema) return toastErro(problema);
    aviso(pushLigado ? 'Notificações desligadas neste aparelho.' : 'Pronto! Vou avisar antes de cada atendimento.');
    render(caixa);
  });

  caixa.querySelectorAll('[data-ir]').forEach((b2) =>
    b2.addEventListener('click', () => irPara(b2.dataset.ir)));

  if (!dono) return;

  mascaraTelefone($('#tel', caixa));
  $('#cor', caixa).addEventListener('input', (e) => aplicaCor(e.target.value));

  $('#btnSalvarNotif', caixa)?.addEventListener('click', async () => {
    const minutos = Math.trunc(Number($('#minAntes', caixa).value) || 30);
    if (minutos < 5 || minutos > 240) return toastErro('Escolha entre 5 e 240 minutos.');
    const { error } = await sb.from('config_notificacao')
      .upsert({ barbearia_id: b.id, minutos_antes: minutos, ativo: true }, { onConflict: 'barbearia_id' });
    if (error) return toastErro(traduzErro(error));
    aviso('Salvo.');
  });

  $('#btnPublico', caixa)?.addEventListener('click', async () => {
    const novo = b.agendamento_publico === false;
    const { error } = await sb.from('barbearias').update({ agendamento_publico: novo }).eq('id', b.id);
    if (error) return toastErro(traduzErro(error));
    estado.barbearia.agendamento_publico = novo;
    aviso(novo ? 'Auto-agendamento ligado.' : 'Auto-agendamento desligado.');
    render(caixa);
  });

  $('#btnFidelidade', caixa)?.addEventListener('click', async () => {
    const meta = Math.trunc(Number($('#fidMeta', caixa).value) || 10);
    if (meta < 2 || meta > 50) return toastErro('Escolha entre 2 e 50 cortes.');
    const ativa = $('#fidAtiva', caixa).value === '1';
    const { error } = await sb.from('barbearias')
      .update({ fidelidade_ativa: ativa, fidelidade_meta: meta }).eq('id', b.id);
    if (error) return toastErro(traduzErro(error));
    Object.assign(estado.barbearia, { fidelidade_ativa: ativa, fidelidade_meta: meta });
    aviso('Fidelidade salva.');
  });

  $('#formBarbearia', caixa).addEventListener('submit', async (e) => {
    e.preventDefault();
    const linha = {
      nome: $('#nome', caixa).value.trim(),
      telefone: $('#tel', caixa).value.trim() || null,
      endereco: $('#end', caixa).value.trim() || null,
      cor: $('#cor', caixa).value
    };
    if (!linha.nome) return toastErro('O nome não pode ficar vazio.');
    const { data, error } = await sb.from('barbearias').update(linha).eq('id', b.id).select().single();
    if (error) return toastErro(traduzErro(error));
    Object.assign(estado.barbearia, data);
    aplicaCor(data.cor);
    aviso('Dados salvos. Recarregando...');
    setTimeout(() => location.reload(), 700);
  });
}

async function backup() {
  const bid = estado.barbearia.id;
  const tabelas = ['barbeiros', 'servicos', 'produtos', 'clientes', 'agendamentos', 'vendas', 'venda_itens', 'despesas'];
  const pacote = { barbearia: estado.barbearia, exportado_em: new Date().toISOString() };

  for (const t of tabelas) {
    const { data, error } = await sb.from(t).select('*').eq('barbearia_id', bid);
    if (error) { console.warn(t, error.message); continue; }  // papel sem acesso: pula
    pacote[t] = data;
  }

  const url = URL.createObjectURL(new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-barberpro-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  aviso('Backup baixado.');
}
