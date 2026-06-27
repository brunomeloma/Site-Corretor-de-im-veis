'use client';

import { useState } from 'react';
import { Client, FilterStatus, ClientStatus } from '@/lib/types';
import { formatDate, generateBillingWhatsAppLink, getStatusLabel, getStatusColor, isOverdue, needsBilling } from '@/lib/utils';
import { MessageCircle, Trash2, AlertCircle, ChevronDown, Pencil } from 'lucide-react';
import EditClientModal from './EditClientModal';

interface ClientTableProps {
  clients: Client[];
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  onChangeStatus: (id: string, status: ClientStatus) => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'pago', label: 'PAGO' },
  { value: 'enviado', label: 'ENVIADO' },
  { value: 'pendente', label: 'PENDENTE' },
  { value: 'cancelando', label: 'CANCELANDO' },
  { value: 'processo_cancel', label: 'PROC. CANCEL.' },
];

export default function ClientTable({ clients, filter, onFilterChange, onChangeStatus, onEdit, onDelete }: ClientTableProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filtered = clients.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'pago') return c.status === 'pago';
    if (filter === 'enviado') return c.status === 'enviado';
    if (filter === 'cancelando') return c.status === 'cancelando' || c.status === 'processo_cancel';
    if (filter === 'pendente') return c.status === 'pendente';
    return true;
  });

  const filterButtons: { label: string; value: FilterStatus; count: number; color: string }[] = [
    { label: 'Todos', value: 'all', count: clients.length, color: 'bg-slate-800 text-white' },
    { label: 'Pagos', value: 'pago', count: clients.filter((c) => c.status === 'pago').length, color: 'bg-green-600 text-white' },
    { label: 'Enviados', value: 'enviado', count: clients.filter((c) => c.status === 'enviado').length, color: 'bg-yellow-500 text-white' },
    { label: 'Cancelando', value: 'cancelando', count: clients.filter((c) => c.status === 'cancelando' || c.status === 'processo_cancel').length, color: 'bg-red-600 text-white' },
    { label: 'Pendentes', value: 'pendente', count: clients.filter((c) => c.status === 'pendente').length, color: 'bg-orange-500 text-white' },
  ];

  function handleEditSave(updated: Client) {
    onEdit(updated);
    setEditingClient(null);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Filter buttons */}
        <div className="p-3 sm:p-5 border-b border-slate-100">
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onFilterChange(btn.value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                  filter === btn.value
                    ? btn.color
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                  filter === btn.value ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider w-8">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Cliente</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Seguradora</th>
                <th className="text-center px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Parcelas</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Vencimento</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Data Cancel.</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Produtor/Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Apolice</th>
                <th className="text-center px-3 py-2.5 text-xs font-bold uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((client) => {
                const colors = getStatusColor(client.status);
                return (
                  <tr key={client.id} className={`hover:bg-slate-50 transition-colors ${colors.row}`}>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{client.id}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {client.name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{client.insurer}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{client.installments}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1">
                        <span className={`${isOverdue(client.dueDate) && needsBilling(client.status) ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          {formatDate(client.dueDate)}
                        </span>
                        {isOverdue(client.dueDate) && needsBilling(client.status) && (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {client.cancelDate ? formatDate(client.cancelDate) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{client.producer}/</span>
                        <div className="relative">
                          <select
                            value={client.status}
                            onChange={(e) => onChangeStatus(client.id, e.target.value as ClientStatus)}
                            className={`appearance-none pl-2 pr-6 py-1 rounded text-xs font-bold cursor-pointer border-0 ${colors.bg} ${colors.text}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-50" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                      {client.policy || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingClient(client)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {needsBilling(client.status) && (
                          <a
                            href={generateBillingWhatsAppLink(client.phone, client.name, client.insurer, client.policy, client.dueDate)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Cobrar
                          </a>
                        )}
                        <button
                          onClick={() => onDelete(client.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filtered.map((client) => {
            const colors = getStatusColor(client.status);
            return (
              <div key={client.id} className={`p-4 space-y-3 ${colors.row}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{client.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {client.insurer} &middot; {client.installments}x &middot; {client.producer}
                    </p>
                  </div>
                  <select
                    value={client.status}
                    onChange={(e) => onChangeStatus(client.id, e.target.value as ClientStatus)}
                    className={`appearance-none px-2 py-1.5 rounded text-xs font-bold cursor-pointer border-0 flex-shrink-0 ${colors.bg} ${colors.text}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">
                    Venc: <strong className={isOverdue(client.dueDate) && needsBilling(client.status) ? 'text-red-600' : 'text-slate-700'}>{formatDate(client.dueDate)}</strong>
                    {isOverdue(client.dueDate) && needsBilling(client.status) && (
                      <AlertCircle className="h-3 w-3 text-red-500 inline ml-1" />
                    )}
                  </span>
                  {client.cancelDate && (
                    <span className="text-slate-400">Cancel: {formatDate(client.cancelDate)}</span>
                  )}
                  {client.policy && (
                    <span className="text-slate-400">Ap: {client.policy}</span>
                  )}
                </div>

                {client.notes && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded">{client.notes}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl transition-colors flex-1"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  {needsBilling(client.status) && (
                    <a
                      href={generateBillingWhatsAppLink(client.phone, client.name, client.insurer, client.policy, client.dueDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors flex-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Cobrar
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
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">Nenhum cliente encontrado com este filtro.</p>
          </div>
        )}
      </div>

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onSave={handleEditSave}
          onClose={() => setEditingClient(null)}
        />
      )}
    </>
  );
}
