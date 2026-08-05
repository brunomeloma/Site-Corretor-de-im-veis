'use client';

import { useState, useEffect } from 'react';
import { Client, ClientStatus } from '@/lib/types';
import { X, Save } from 'lucide-react';

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'pago', label: 'PAGO' },
  { value: 'enviado', label: 'ENVIADO' },
  { value: 'pendente', label: 'PENDENTE' },
  { value: 'cancelando', label: 'CANCELANDO' },
  { value: 'processo_cancel', label: 'PROC. CANCEL.' },
];

interface EditClientModalProps {
  client: Client;
  onSave: (client: Client) => void;
  onClose: () => void;
}

export default function EditClientModal({ client, onSave, onClose }: EditClientModalProps) {
  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email,
    insurer: client.insurer,
    installments: client.installments.toString(),
    dueDate: client.dueDate,
    cancelDate: client.cancelDate,
    producer: client.producer,
    status: client.status as ClientStatus,
    policy: client.policy,
    notes: client.notes,
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...client,
      ...form,
      installments: parseInt(form.installments) || 0,
    });
  }

  const inputClass = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-slate-800 text-base">Editar Cliente</h3>
          <button onClick={onClose} className="p-2 -m-2 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className={labelClass}>Nome do Cliente *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Telefone *</label>
              <input
                required
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Seguradora *</label>
              <input
                required
                type="text"
                value={form.insurer}
                onChange={(e) => setForm({ ...form, insurer: e.target.value.toUpperCase() })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Parcelas *</label>
              <input
                required
                type="number"
                min="1"
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vencimento *</label>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Data Cancelamento</label>
              <input
                type="date"
                value={form.cancelDate}
                onChange={(e) => setForm({ ...form, cancelDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Produtor</label>
              <input
                type="text"
                value={form.producer}
                onChange={(e) => setForm({ ...form, producer: e.target.value.toUpperCase() })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Apolice</label>
            <input
              type="text"
              value={form.policy}
              onChange={(e) => setForm({ ...form, policy: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Observacoes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
