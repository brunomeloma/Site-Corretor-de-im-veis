'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';
import Dashboard from '@/components/admin/Dashboard';
import ClientTable from '@/components/admin/ClientTable';
import AddClientForm from '@/components/admin/AddClientForm';
import { Client, FilterStatus } from '@/lib/types';
import { getClients, saveClients, generateId } from '@/lib/storage';

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    setClients(getClients());
  }, []);

  function updateClients(updated: Client[]) {
    setClients(updated);
    saveClients(updated);
  }

  function toggleStatus(id: string) {
    const updated = clients.map((c) =>
      c.id === id ? { ...c, status: c.status === 'paid' ? 'unpaid' as const : 'paid' as const } : c
    );
    updateClients(updated);
  }

  function addClient(data: {
    name: string;
    phone: string;
    email: string;
    property: string;
    contractValue: number;
    dueDate: string;
    notes: string;
  }) {
    const newClient: Client = {
      id: generateId(),
      ...data,
      status: 'unpaid',
    };
    updateClients([newClient, ...clients]);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Building2 className="h-7 w-7 text-emerald-500" />
              <div>
                <span className="text-lg font-bold text-white">Painel do Andryel</span>
                <span className="text-xs text-slate-400 block -mt-0.5">Gestão de Clientes & Cobranças</span>
              </div>
            </div>

            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar ao Site</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500">Visão geral do mês atual</p>
          </div>
          <AddClientForm onAdd={addClient} />
        </div>

        <Dashboard clients={clients} />

        <ClientTable
          clients={clients}
          filter={filter}
          onFilterChange={setFilter}
          onToggleStatus={toggleStatus}
        />
      </main>
    </div>
  );
}
