import { Property, Client } from './types';
import { sampleProperties, sampleClients } from './data';

const PROPERTIES_KEY = 'andryel_properties';
const CLIENTS_KEY = 'andryel_clients';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getProperties(): Property[] {
  if (!isBrowser()) return sampleProperties;
  const stored = localStorage.getItem(PROPERTIES_KEY);
  if (!stored) {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(sampleProperties));
    return sampleProperties;
  }
  return JSON.parse(stored);
}

export function saveProperties(properties: Property[]) {
  if (!isBrowser()) return;
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
}

export function getClients(): Client[] {
  if (!isBrowser()) return sampleClients;
  const stored = localStorage.getItem(CLIENTS_KEY);
  if (!stored) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(sampleClients));
    return sampleClients;
  }
  return JSON.parse(stored);
}

export function saveClients(clients: Client[]) {
  if (!isBrowser()) return;
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
