export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

export function generateWhatsAppLink(phone: string, clientName: string, property: string, dueDate: string): string {
  const formattedDate = formatDate(dueDate);
  const message = `Olá, ${clientName}! Tudo bem? Aqui é o Andryel. Passando para lembrar que a parcela do seu contrato referente ao imóvel ${property} venceu em ${formattedDate}. Para sua comodidade, você pode realizar o pagamento via PIX ou boleto. Caso já tenha realizado o pagamento, por favor, desconsidere esta mensagem e nos envie o comprovante. Obrigado!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    commercial: 'Comercial',
    land: 'Terreno',
  };
  return labels[type] || type;
}

export function getTransactionLabel(transaction: string): string {
  return transaction === 'sale' ? 'Venda' : 'Aluguel';
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate + 'T00:00:00') < new Date();
}
