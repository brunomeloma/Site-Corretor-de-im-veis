import { Client, Prospect } from './types';
import { sampleClients, sampleProspects } from './data';

const CLIENTS_KEY = 'andryel_clients';
const PROSPECTS_KEY = 'andryel_prospects';

function isBrowser() {
  return typeof window !== 'undefined';
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

export function getProspects(): Prospect[] {
  if (!isBrowser()) return sampleProspects;
  const stored = localStorage.getItem(PROSPECTS_KEY);
  if (!stored) {
    localStorage.setItem(PROSPECTS_KEY, JSON.stringify(sampleProspects));
    return sampleProspects;
  }
  return JSON.parse(stored);
}

export function saveProspects(prospects: Prospect[]) {
  if (!isBrowser()) return;
  localStorage.setItem(PROSPECTS_KEY, JSON.stringify(prospects));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
