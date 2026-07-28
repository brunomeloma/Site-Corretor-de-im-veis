/* Notificações push: ligar/desligar no aparelho atual. */
import { sb } from './supabase.js';
import { CONFIG } from './config.js';
import { estado } from './app.js';

export const suportaPush = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Converte a chave VAPID (texto) para o formato que o navegador exige. */
function chaveParaBytes(base64) {
  const completo = (base64 + '='.repeat((4 - base64.length % 4) % 4))
    .replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(completo);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

export async function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); }
  catch (e) { console.warn('Service worker não registrou:', e); return null; }
}

export async function estaLigado() {
  if (!suportaPush()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  return Boolean(inscricao);
}

/** Liga as notificações neste aparelho. Devolve mensagem de erro ou null. */
export async function ligar() {
  if (!suportaPush()) return 'Este navegador não aceita notificações.';
  if (!CONFIG.vapidPublica) return 'As notificações ainda não foram configuradas pelo administrador.';

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return 'Você precisa permitir as notificações no navegador.';

  const reg = (await navigator.serviceWorker.getRegistration()) || await registraServiceWorker();
  if (!reg) return 'Não consegui preparar as notificações neste aparelho.';

  const inscricao = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: chaveParaBytes(CONFIG.vapidPublica)
  });

  const j = inscricao.toJSON();
  const { error } = await sb.from('push_subscriptions').upsert({
    barbearia_id: estado.barbearia.id,
    user_id: estado.user.id,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    aparelho: navigator.userAgent.slice(0, 120)
  }, { onConflict: 'endpoint' });

  if (error) return 'Não consegui salvar a inscrição: ' + error.message;
  return null;
}

/** Desliga neste aparelho. */
export async function desligar() {
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  if (!inscricao) return null;
  await sb.from('push_subscriptions').delete().eq('endpoint', inscricao.endpoint);
  await inscricao.unsubscribe();
  return null;
}
