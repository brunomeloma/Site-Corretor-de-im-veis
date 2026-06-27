export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'van' | 'fleet';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  vehicleType: VehicleType;
  plate: string;
  plan: string;
  monthlyValue: number;
  dueDate: string;
  status: 'paid' | 'unpaid';
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

export type FilterStatus = 'all' | 'paid' | 'unpaid';
export type ActiveTab = 'dashboard' | 'clients' | 'prospects';
