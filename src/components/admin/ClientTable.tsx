'use client';

import { Client, FilterStatus } from '@/lib/types';
import { formatCurrency, formatDate, generateWhatsAppLink, isOverdue } from '@/lib/utils';
import { MessageCircle, ArrowUpDown, AlertCircle } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  onToggleStatus: (id: string) => void;
}

export default function ClientTable({ clients, filter, onFilterChange, onToggleStatus }: ClientTableProps) {
  const filtered = clients.filter((c) => {
    if (filter === 'paid') return c.status === 'paid';
    if (filter === 'unpaid') return c.status === 'unpaid';
    return true;
  });

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'Todos', value: 'all', count: clients.length },
    { label: 'Pagos', value: 'paid', count: clients.filter((c) => c.status === 'paid').length },
    { label: 'Em Atraso', value: 'unpaid', count: clients.filter((c) => c.status === 'unpaid').length },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Clientes & Contratos</h2>
          <div className="flex gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onFilterChange(btn.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === btn.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                  filter === btn.value ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Imóvel/Contrato</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{client.name}</p>
                    <p className="text-xs text-slate-400">{client.phone}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{client.property}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-800">{formatCurrency(client.contractValue)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-slate-600">{formatDate(client.dueDate)}</span>
                    {client.status === 'unpaid' && isOverdue(client.dueDate) && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <button
                    onClick={() => onToggleStatus(client.id)}
                    title="Clique para alternar o status"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      client.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {client.status === 'paid' ? 'Pago' : 'Não Pago'}
                  </button>
                </td>
                <td className="px-5 py-4 text-center">
                  {client.status === 'unpaid' ? (
                    <a
                      href={generateWhatsAppLink(client.phone, client.name, client.property, client.dueDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Cobrar
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {filtered.map((client) => (
          <div key={client.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{client.name}</p>
                <p className="text-xs text-slate-400">{client.property}</p>
              </div>
              <button
                onClick={() => onToggleStatus(client.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  client.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {client.status === 'paid' ? 'Pago' : 'Não Pago'}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Valor: <strong className="text-slate-800">{formatCurrency(client.contractValue)}</strong></span>
              <span className="text-slate-500 flex items-center gap-1">
                Venc: {formatDate(client.dueDate)}
                {client.status === 'unpaid' && isOverdue(client.dueDate) && (
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                )}
              </span>
            </div>

            {client.status === 'unpaid' && (
              <a
                href={generateWhatsAppLink(client.phone, client.name, client.property, client.dueDate)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar Cobrança via WhatsApp
              </a>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-slate-400">
          <p className="text-sm">Nenhum cliente encontrado com este filtro.</p>
        </div>
      )}
    </div>
  );
}
