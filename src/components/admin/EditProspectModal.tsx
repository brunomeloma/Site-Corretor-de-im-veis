'use client';

import { useState, useEffect } from 'react';
import { Prospect } from '@/lib/types';
import { X, Save } from 'lucide-react';

interface EditProspectModalProps {
  prospect: Prospect;
  onSave: (prospect: Prospect) => void;
  onClose: () => void;
}

export default function EditProspectModal({ prospect, onSave, onClose }: EditProspectModalProps) {
  const [form, setForm] = useState({
    name: prospect.name,
    phone: prospect.phone,
    vehicle: prospect.vehicle,
    interest: prospect.interest,
    notes: prospect.notes,
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...prospect, ...form });
  }

  const inputClass = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-slate-800 text-base">Editar Prospecto</h3>
          <button onClick={onClose} className="p-2 -m-2 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

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
            <label className={labelClass}>Veiculo</label>
            <input
              type="text"
              value={form.vehicle}
              onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              className={inputClass}
              placeholder="Ex: Honda Civic 2024"
            />
          </div>

          <div>
            <label className={labelClass}>Interesse</label>
            <input
              type="text"
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              className={inputClass}
              placeholder="Ex: Seguro contra roubo"
            />
          </div>

          <div>
            <label className={labelClass}>Observacoes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
              placeholder="De onde veio? Indicacao?"
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
