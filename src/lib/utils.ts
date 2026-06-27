export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

export function generateBillingWhatsAppLink(phone: string, clientName: string, vehicle: string, plate: string, dueDate: string): string {
  const formattedDate = formatDate(dueDate);
  const message = `Olá, ${clientName}! Tudo bem? Aqui é o Andryel. Passando para lembrar que a mensalidade do seguro do seu veículo ${vehicle} (placa ${plate}) venceu em ${formattedDate}. Para sua comodidade, você pode realizar o pagamento via PIX ou boleto. Caso já tenha realizado o pagamento, por favor, desconsidere esta mensagem e nos envie o comprovante. Obrigado!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function generateProspectWhatsAppLink(phone: string, prospectName: string, vehicle: string): string {
  const message = `Olá, ${prospectName}! Tudo bem? Aqui é o Andryel, especialista em seguros veiculares. Vi que você tem interesse em proteção para o seu ${vehicle}. Tenho planos com ótimo custo-benefício, com cobertura contra roubo, furto, colisão e assistência 24h. Posso te apresentar as opções? Será rápido!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function getVehicleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    car: 'Carro',
    motorcycle: 'Moto',
    truck: 'Caminhão',
    van: 'Van/Utilitário',
    fleet: 'Frota',
  };
  return labels[type] || type;
}

export function getVehicleTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    car: '🚗',
    motorcycle: '🏍️',
    truck: '🚛',
    van: '🚐',
    fleet: '🚚',
  };
  return emojis[type] || '🚗';
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate + 'T00:00:00') < new Date();
}
