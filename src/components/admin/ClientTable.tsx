'use client';

import { Client, FilterStatus } from '@/lib/types';
import { formatCurrency, formatDate, generateBillingWhatsAppLink, getVehicleTypeLabel, isOverdue } from '@/lib/utils';
import { MessageCircle, ArrowUpDown, AlertCircle, Trash2, Car, Bike, Truck, Bus } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

function VehicleIcon({ type }: { type: string }) {
  switch (type) {
    case 'motorcycle': return <Bike className="h-4 w-4" />;
    case 'truck': return <Truck className="h-4 w-4" />;
    case 'van': return <Bus className="h-4 w-4" />;
    case 'fleet': return <Truck className="h-4 w-4" />;
    default: return <Car className="h-4 w-4" />;
  }
}

export default function ClientTable({ clients, filter, onFilterChange, onToggleStatus, onDelete }: ClientTableProps) {
  const filtered = clients.filter((c) => {
    if (filter === 'paid') return c.status === 'paid';
    if (filter === 'unpaid') return c.status === 'unpaid';
    return true;
  });

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'Todos', value: 'all', count: clients.length },
    { label: 'Em dia', value: 'paid', count: clients.filter((c) => c.status === 'paid').length },
    { label: 'Em Atraso', value: 'unpaid', count: clients.filter((c) => c.status === 'unpaid').length },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Clientes & Seguros</h2>
          <div className="flex gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onFilterChange(btn.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === btn.value
                    ? btn.value === 'unpaid' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
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
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Veículo</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mensal</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${
                client.status === 'unpaid' && isOverdue(client.dueDate) ? 'bg-red-50/30' : ''
              }`}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-800 text-sm">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.phone.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><VehicleIcon type={client.vehicleType} /></span>
                    <div>
                      <p className="text-sm text-slate-700">{client.vehicle}</p>
                      <p className="text-xs text-slate-400">{client.plate}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{client.plan}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-800">{formatCurrency(client.monthlyValue)}</td>
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
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {client.status === 'unpaid' && (
                      <a
                        href={generateBillingWhatsAppLink(client.phone, client.name, client.vehicle, client.plate, client.dueDate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Cobrar
                      </a>
                    )}
                    <button
                      onClick={() => onDelete(client.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                      title="Remover cliente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-slate-100">
        {filtered.map((client) => (
          <div key={client.id} className={`p-4 space-y-3 ${
            client.status === 'unpaid' && isOverdue(client.dueDate) ? 'bg-red-50/40' : ''
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{client.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <VehicleIcon type={client.vehicleType} />
                  <span>{client.vehicle}</span>
                  <span className="text-slate-300">|</span>
                  <span>{client.plate}</span>
                </div>
              </div>
              <button
                onClick={() => onToggleStatus(client.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                  client.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {client.status === 'paid' ? 'Pago' : 'Não Pago'}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{client.plan}: <strong className="text-slate-800">{formatCurrency(client.monthlyValue)}</strong></span>
              <span className="text-slate-500 flex items-center gap-1">
                Venc: {formatDate(client.dueDate)}
                {client.status === 'unpaid' && isOverdue(client.dueDate) && (
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                )}
              </span>
            </div>

            {client.notes && (
              <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{client.notes}</p>
            )}

            <div className="flex gap-2">
              {client.status === 'unpaid' && (
                <a
                  href={generateBillingWhatsAppLink(client.phone, client.name, client.vehicle, client.plate, client.dueDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Cobrar via WhatsApp
                </a>
              )}
              <button
                onClick={() => onDelete(client.id)}
                className="px-3 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
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
