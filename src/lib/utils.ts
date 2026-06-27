import { ClientStatus } from './types';

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

export function generateBillingWhatsAppLink(phone: string, clientName: string, insurer: string, policy: string, dueDate: string): string {
  const formattedDate = formatDate(dueDate);
  const policyInfo = policy ? ` (apólice ${policy})` : '';
  const message = `Olá, ${clientName}! Tudo bem? Aqui é o Andryel. Passando para lembrar que a parcela do seu seguro na ${insurer}${policyInfo} venceu em ${formattedDate}. Para sua comodidade, você pode realizar o pagamento via PIX ou boleto. Caso já tenha realizado o pagamento, por favor, desconsidere esta mensagem e nos envie o comprovante. Obrigado!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function generateProspectWhatsAppLink(phone: string, prospectName: string, vehicle: string): string {
  const message = `Olá, ${prospectName}! Tudo bem? Aqui é o Andryel, especialista em seguros veiculares. Vi que você tem interesse em proteção para o seu ${vehicle}. Tenho planos com ótimo custo-benefício, com cobertura contra roubo, furto, colisão e assistência 24h. Posso te apresentar as opções? Será rápido!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function getStatusLabel(status: ClientStatus): string {
  const labels: Record<ClientStatus, string> = {
    pago: 'PAGO',
    enviado: 'ENVIADO',
    cancelando: 'CANCELANDO',
    processo_cancel: 'PROC. CANCEL.',
    pendente: 'PENDENTE',
  };
  return labels[status] || status;
}

export function getStatusColor(status: ClientStatus): { bg: string; text: string; row: string } {
  const colors: Record<ClientStatus, { bg: string; text: string; row: string }> = {
    pago: { bg: 'bg-green-100', text: 'text-green-800', row: 'bg-green-50/50' },
    enviado: { bg: 'bg-yellow-100', text: 'text-yellow-800', row: '' },
    cancelando: { bg: 'bg-red-100', text: 'text-red-800', row: 'bg-red-50/40' },
    processo_cancel: { bg: 'bg-red-200', text: 'text-red-900', row: 'bg-red-50/60' },
    pendente: { bg: 'bg-orange-100', text: 'text-orange-800', row: 'bg-orange-50/40' },
  };
  return colors[status] || { bg: 'bg-slate-100', text: 'text-slate-700', row: '' };
}

export function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate + 'T00:00:00') < new Date();
}

export function needsBilling(status: ClientStatus): boolean {
  return status === 'enviado' || status === 'pendente';
}
