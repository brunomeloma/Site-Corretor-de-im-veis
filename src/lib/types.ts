export interface Property {
  id: string;
  title: string;
  type: 'apartment' | 'house' | 'commercial' | 'land';
  transaction: 'sale' | 'rent';
  price: number;
  location: string;
  neighborhood: string;
  city: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpots: number;
  description: string;
  features: string[];
  images: string[];
  featured: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  property: string;
  contractValue: number;
  dueDate: string;
  status: 'paid' | 'unpaid';
  notes: string;
}

export type FilterStatus = 'all' | 'paid' | 'unpaid';
