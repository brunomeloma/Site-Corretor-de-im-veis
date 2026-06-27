export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'van' | 'fleet';
export type ClientStatus = 'pago' | 'enviado' | 'cancelando' | 'processo_cancel' | 'pendente';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  insurer: string;
  installments: number;
  dueDate: string;
  cancelDate: string;
  producer: string;
  status: ClientStatus;
  policy: string;
  notes: string;
}

export interface Prospect {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  interest: string;
  notes: string;
  contacted: boolean;
}

export type FilterStatus = 'all' | 'pago' | 'enviado' | 'cancelando' | 'pendente';
export type ActiveTab = 'dashboard' | 'clients' | 'prospects';
