/* Tela AJUSTES — dados da barbearia, cor, tema, assinatura e backup. */
import { sb, traduzErro } from '../supabase.js';
import { estado } from '../app.js';
import {
  $, esc, aviso, erro as toastErro, aplicaCor, alternaTema, dataCurta, mascaraTelefone
} from '../ui.js';

let caixa;

export async function render(container) {
  caixa = container;
  const b = estado.barbearia;
  const dono = estado.papel === 'dono';
  const dias = Math.ceil((new Date(b.expira_em + 'T23:59:59') - new Date()) / 86400000);

  caixa.innerHTML = `
    <div class="topo"><h1>Ajustes</h1></div>

    <div class="card" style="margin-bottom:1rem">
      <h2>Assinatura</h2>
      <p style="margin:0">
        <span class="chip ${b.status === 'ativa' ? 'chip-ok' : dias < 0 ? 'chip-danger' : 'chip-warn'}">
          ${esc(b.status)}
        </span>
        ${b.status === 'ativa'
          ? '<span class="muted"> — tudo certo por aqui.</span>'
          : `<span class="muted"> — ${dias >= 0 ? `teste grátis até ${esc(dataCurta(b.expira_em))} (${dias} dia(s))` : 'teste encerrado'}</span>`}
      </p>
    </div>

    ${dono ? `
    <form class="card" id="formBarbearia" style="margin-bottom:1rem">
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
          <input id="cor" type="color" value="${esc(b.cor)}" style="height:44px;padding:.2rem">
        </div>
      </div>
      <div class="campo">
        <label for="end">Endereço</label>
        <input id="end" value="${esc(b.endereco || '')}">
      </div>
      <button class="btn btn-primary">Salvar</button>
    </form>` : ''}

    <div class="card" style="margin-bottom:1rem">
      <h2>Aparência</h2>
      <button class="btn" id="btnTema">🌗 Alternar tema claro/escuro</button>
    </div>

    <div class="card">
      <h2>Backup dos dados</h2>
      <p class="muted" style="margin-top:0">
        Baixa um arquivo com tudo da sua barbearia (clientes, serviços, barbeiros e agendamentos).
      </p>
      <button class="btn" id="btnBackup">⬇ Baixar backup (.json)</button>
    </div>`;

  $('#btnTema', caixa).addEventListener('click', alternaTema);
  $('#btnBackup', caixa).addEventListener('click', backup);

  if (dono) {
    mascaraTelefone($('#tel', caixa));
    $('#cor', caixa).addEventListener('input', (e) => aplicaCor(e.target.value));
    $('#formBarbearia', caixa).addEventListener('submit', async (e) => {
      e.preventDefault();
      const linha = {
        nome: $('#nome', caixa).value.trim(),
        telefone: $('#tel', caixa).value.trim() || null,
        endereco: $('#end', caixa).value.trim() || null,
        cor: $('#cor', caixa).value
      };
      if (!linha.nome) return toastErro('O nome não pode ficar vazio.');
      const { data, error } = await sb.from('barbearias').update(linha)
        .eq('id', b.id).select().single();
      if (error) return toastErro(traduzErro(error));
      Object.assign(estado.barbearia, data);
      aplicaCor(data.cor);
      aviso('Dados salvos. Recarregando o menu...');
      setTimeout(() => location.reload(), 700);
    });
  }
}

async function backup() {
  const bid = estado.barbearia.id;
  const tabelas = ['barbeiros', 'servicos', 'clientes', 'agendamentos'];
  const pacote = { barbearia: estado.barbearia, exportado_em: new Date().toISOString() };

  for (const t of tabelas) {
    const { data, error } = await sb.from(t).select('*').eq('barbearia_id', bid);
    if (error) return toastErro(traduzErro(error));
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
