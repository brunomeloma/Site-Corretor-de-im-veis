/* =====================================================================
   /api/push-lembretes — roda de minuto em minuto (cron da Vercel).

   Procura atendimentos que começam daqui a X minutos e avisa o barbeiro
   no celular/PC, mesmo com o sistema fechado.

   Protegido por segredo: só roda quem manda o cabeçalho
   Authorization: Bearer $CRON_SECRET (a Vercel manda sozinha).
   ===================================================================== */
import webpush from 'web-push';
import { admin, json, erro } from './_lib/auth.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const CONTATO = process.env.VAPID_SUBJECT || 'mailto:contato@barberpro.app';

export default async function handler(req, res) {
  const segredo = process.env.CRON_SECRET;
  const cabecalho = req.headers.authorization || '';
  if (!segredo || cabecalho !== `Bearer ${segredo}`) return erro(res, 401, 'Não autorizado.');
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return erro(res, 500, 'Faltam as chaves VAPID.');

  webpush.setVapidDetails(CONTATO, VAPID_PUBLIC, VAPID_PRIVATE);

  const agora = new Date();
  const limite = new Date(agora.getTime() + 4 * 60 * 60 * 1000); // olha 4h à frente

  // Agendamentos futuros + configuração de cada barbearia
  const { data: ags, error } = await admin
    .from('agendamentos')
    .select(`id, inicio, barbearia_id, barbeiro_id, cliente_nome,
             clientes(nome), servicos(nome),
             barbeiros(nome, user_id),
             barbearias(nome, config_notificacao(ativo, minutos_antes))`)
    .gte('inicio', agora.toISOString())
    .lte('inicio', limite.toISOString())
    .in('status', ['agendado', 'confirmado']);

  if (error) { console.error(error); return erro(res, 500, 'Erro ao ler a agenda.'); }

  let enviados = 0, falhas = 0, ignorados = 0;

  for (const a of ags || []) {
    const cfg = a.barbearias?.config_notificacao?.[0] || a.barbearias?.config_notificacao || {};
    if (cfg.ativo === false) { ignorados++; continue; }
    const minutos = Number(cfg.minutos_antes ?? 30);

    const faltam = (new Date(a.inicio) - agora) / 60000;
    if (faltam > minutos || faltam < 0) { ignorados++; continue; }

    const destino = a.barbeiros?.user_id;
    if (!destino) { ignorados++; continue; }

    // já avisou? (a chave primária impede duplicidade)
    const { error: eMarca } = await admin.from('push_enviados')
      .insert({ agendamento_id: a.id, tipo: 'lembrete' });
    if (eMarca) { ignorados++; continue; }   // 23505 = já enviado

    const { data: inscricoes } = await admin.from('push_subscriptions')
      .select('*').eq('user_id', destino);

    if (!inscricoes?.length) continue;

    const hora = new Date(a.inicio).toLocaleTimeString('pt-BR',
      { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const cliente = a.clientes?.nome || a.cliente_nome || 'Cliente';

    const aviso = JSON.stringify({
      titulo: `Próximo atendimento às ${hora}`,
      corpo: `${cliente} — ${a.servicos?.nome || 'atendimento'}`,
      url: '/app.html#agenda'
    });

    for (const s of inscricoes) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, aviso);
        enviados++;
      } catch (e) {
        falhas++;
        // aparelho desinstalado/expirado: limpa o cadastro
        if (e.statusCode === 404 || e.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
  }

  return json(res, 200, { ok: true, enviados, falhas, ignorados, olhou: ags?.length || 0 });
}
