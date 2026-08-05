export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  created_at: string;
};

export type Veiculo = {
  id: string;
  cliente_id: string;
  placa: string;
  modelo: string | null;
  cor: string | null;
};

export type Plano = {
  id: string;
  nome: string;
  lavagens_por_mes: number;
  preco_mensal: number;
  ativo: boolean;
};

export type Assinatura = {
  id: string;
  cliente_id: string;
  plano_id: string;
  lavagens_usadas: number;
  data_inicio: string;
  data_renovacao: string;
  status: "ativo" | "cancelado" | "vencido";
};

export type Agendamento = {
  id: string;
  cliente_id: string;
  veiculo_id: string | null;
  inicio: string;
  fim: string;
  status: "agendado" | "em_andamento" | "concluido" | "cancelado";
};

export type Venda = {
  id: string;
  cliente_id: string;
  assinatura_id: string | null;
  agendamento_id: string | null;
  valor: number;
  forma_pagamento: "dinheiro" | "pix" | "debito" | "credito";
  created_at: string;
};
