'use client';

import { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Users, UserSearch } from 'lucide-react';
import Dashboard from '@/components/admin/Dashboard';
import ClientTable from '@/components/admin/ClientTable';
import AddClientForm from '@/components/admin/AddClientForm';
import ProspectList from '@/components/admin/ProspectList';
import { Client, Prospect, FilterStatus, ActiveTab, ClientStatus } from '@/lib/types';
import { getClients, saveClients, getProspects, saveProspects, generateId } from '@/lib/storage';
import { needsBilling } from '@/lib/utils';

export default function HomePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [tab, setTab] = useState<ActiveTab>('dashboard');

  useEffect(() => {
    setClients(getClients());
    setProspects(getProspects());
  }, []);

  function updateClients(updated: Client[]) {
    setClients(updated);
    saveClients(updated);
  }

  function updateProspects(updated: Prospect[]) {
    setProspects(updated);
    saveProspects(updated);
  }

  function changeStatus(id: string, status: ClientStatus) {
    const updated = clients.map((c) =>
      c.id === id ? { ...c, status } : c
    );
    updateClients(updated);
  }

  function deleteClient(id: string) {
    updateClients(clients.filter((c) => c.id !== id));
  }

  function addClient(data: {
    name: string;
    phone: string;
    email: string;
    insurer: string;
    installments: number;
    dueDate: string;
    cancelDate: string;
    producer: string;
    policy: string;
    notes: string;
  }) {
    const newClient: Client = {
      id: generateId(),
      ...data,
      status: 'pendente',
    };
    updateClients([newClient, ...clients]);
  }

  function addProspect(data: { name: string; phone: string; vehicle: string; interest: string; notes: string }) {
    const newProspect: Prospect = {
      id: generateId(),
      ...data,
      contacted: false,
    };
    updateProspects([newProspect, ...prospects]);
  }

  function toggleProspectContacted(id: string) {
    const updated = prospects.map((p) =>
      p.id === id ? { ...p, contacted: !p.contacted } : p
    );
    updateProspects(updated);
  }

  function deleteProspect(id: string) {
    updateProspects(prospects.filter((p) => p.id !== id));
  }

  const billingCount = clients.filter((c) => needsBilling(c.status)).length;
  const pendingProspects = prospects.filter((p) => !p.contacted).length;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Painel', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="h-4 w-4" />, badge: billingCount || undefined },
    { id: 'prospects', label: 'Prospectar', icon: <UserSearch className="h-4 w-4" />, badge: pendingProspects || undefined },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2.5">
              <Shield className="h-7 w-7 text-emerald-500" />
              <div>
                <span className="text-lg font-bold text-white">Andryel</span>
                <span className="text-xs text-slate-400 block -mt-0.5 hidden sm:block">Seguros Veiculares</span>
              </div>
            </div>

            {/* Desktop tabs */}
            <nav className="hidden sm:flex items-center gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-pb">
        <div className="grid grid-cols-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative ${
                tab === t.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge && (
                <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 sm:pb-6 space-y-5">

        {/* ===== DASHBOARD TAB ===== */}
        {tab === 'dashboard' && (
          <>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Bom dia, Andryel</h1>
              <p className="text-sm text-slate-500">Resumo do mês atual</p>
            </div>

            <Dashboard clients={clients} />

            {billingCount > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-red-800 text-sm">
                    {billingCount} parcela{billingCount > 1 ? 's' : ''} pendente{billingCount > 1 ? 's' : ''} de cobrança
                  </p>
                  <p className="text-xs text-red-600">Clique abaixo para visualizar e enviar cobranças via WhatsApp</p>
                </div>
                <button
                  onClick={() => { setTab('clients'); setFilter('enviado'); }}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                >
                  Ver Pendentes
                </button>
              </div>
            )}

            {pendingProspects > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-blue-800 text-sm">
                    {pendingProspects} prospecto{pendingProspects > 1 ? 's' : ''} aguardando contato
                  </p>
                  <p className="text-xs text-blue-600">Envie uma oferta de seguro via WhatsApp</p>
                </div>
                <button
                  onClick={() => setTab('prospects')}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                >
                  Ver Prospectos
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== CLIENTS TAB ===== */}
        {tab === 'clients' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Relatório de Parcelas</h1>
                <p className="text-sm text-slate-500">Gerencie seguros, cobranças e cancelamentos</p>
              </div>
              <AddClientForm onAdd={addClient} />
            </div>

            <ClientTable
              clients={clients}
              filter={filter}
              onFilterChange={setFilter}
              onChangeStatus={changeStatus}
              onDelete={deleteClient}
            />
          </>
        )}

        {/* ===== PROSPECTS TAB ===== */}
        {tab === 'prospects' && (
          <ProspectList
            prospects={prospects}
            onAdd={addProspect}
            onToggleContacted={toggleProspectContacted}
            onDelete={deleteProspect}
          />
        )}
      </main>
    </div>
  );
}
