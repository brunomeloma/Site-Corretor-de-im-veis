'use client';

import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';

interface AddClientFormProps {
  onAdd: (client: {
    name: string;
    phone: string;
    email: string;
    property: string;
    contractValue: number;
    dueDate: string;
    notes: string;
  }) => void;
}

export default function AddClientForm({ onAdd }: AddClientFormProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    property: '',
    contractValue: '',
    dueDate: '',
    notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      ...form,
      contractValue: parseFloat(form.contractValue) || 0,
    });
    setForm({ name: '', phone: '', email: '', property: '', contractValue: '', dueDate: '', notes: '' });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Nome *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Telefone (com DDD) *</label>
            <input
              required
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="5511999999999"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Imóvel/Contrato *</label>
            <input
              required
              type="text"
              value={form.property}
              onChange={(e) => setForm({ ...form, property: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Apt. 302 - Ed. Monte Verde"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Valor do Contrato *</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.contractValue}
              onChange={(e) => setForm({ ...form, contractValue: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="2500.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Data de Vencimento *</label>
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
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

        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Cadastrar Cliente
        </button>
      </form>
    </div>
  );
}
