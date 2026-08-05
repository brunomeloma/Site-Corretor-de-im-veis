'use client';

import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';

interface AddClientFormProps {
  onAdd: (client: {
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
  }) => void;
}

export default function AddClientForm({ onAdd }: AddClientFormProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    insurer: '',
    installments: '',
    dueDate: '',
    cancelDate: '',
    producer: '',
    policy: '',
    notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      ...form,
      installments: parseInt(form.installments) || 0,
    });
    setForm({ name: '', phone: '', email: '', insurer: '', installments: '', dueDate: '', cancelDate: '', producer: '', policy: '', notes: '' });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
      >
        <UserPlus className="h-4 w-4" />
        Novo Cliente
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">Cadastrar Novo Cliente</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Nome do Cliente *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="NOME COMPLETO"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Telefone *</label>
            <input
              required
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="5511999999999"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Seguradora *</label>
            <input
              required
              type="text"
              value={form.insurer}
              onChange={(e) => setForm({ ...form, insurer: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: TOKIO, ALIRO, ALLI"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Parcelas *</label>
            <input
              required
              type="number"
              min="1"
              value={form.installments}
              onChange={(e) => setForm({ ...form, installments: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Vencimento *</label>
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Produtor</label>
            <input
              type="text"
              value={form.producer}
              onChange={(e) => setForm({ ...form, producer: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: JULIO"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Apólice</label>
            <input
              type="text"
              value={form.policy}
              onChange={(e) => setForm({ ...form, policy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Número da apólice"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Observações</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Anotações opcionais..."
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Cadastrar Cliente
        </button>
      </form>
    </div>
  );
}
