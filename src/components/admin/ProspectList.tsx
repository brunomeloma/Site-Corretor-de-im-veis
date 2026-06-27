'use client';

import { useState } from 'react';
import { Prospect } from '@/lib/types';
import { generateProspectWhatsAppLink } from '@/lib/utils';
import { MessageCircle, UserPlus, X, Trash2, CheckCircle, Circle, Pencil } from 'lucide-react';
import EditProspectModal from './EditProspectModal';

interface ProspectListProps {
  prospects: Prospect[];
  onAdd: (prospect: { name: string; phone: string; vehicle: string; interest: string; notes: string }) => void;
  onEdit: (prospect: Prospect) => void;
  onToggleContacted: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ProspectList({ prospects, onAdd, onEdit, onToggleContacted, onDelete }: ProspectListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', vehicle: '', interest: '', notes: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(form);
    setForm({ name: '', phone: '', vehicle: '', interest: '', notes: '' });
    setShowForm(false);
  }

  function handleEditSave(updated: Prospect) {
    onEdit(updated);
    setEditingProspect(null);
  }

  const pendingCount = prospects.filter((p) => !p.contacted).length;
  const contactedCount = prospects.filter((p) => p.contacted).length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Prospeccao de Clientes</h2>
            <p className="text-sm text-slate-500">{pendingCount} pendentes &middot; {contactedCount} contatados</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Novo Prospecto
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Adicionar Prospecto</h3>
              <button onClick={() => setShowForm(false)} className="p-2 -m-2 text-slate-400 hover:text-slate-600">
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
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do contato"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Telefone *</label>
                  <input
                    required
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5511999999999"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Veiculo</label>
                  <input
                    type="text"
                    value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Honda Civic 2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Interesse</label>
                  <input
                    type="text"
                    value={form.interest}
                    onChange={(e) => setForm({ ...form, interest: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Seguro contra roubo"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Observacoes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="De onde veio? Indicacao? Instagram?"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {prospects.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">Nenhum prospecto cadastrado ainda.</p>
            </div>
          )}
          {prospects.map((prospect) => (
            <div key={prospect.id} className={`p-4 ${prospect.contacted ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggleContacted(prospect.id)}
                  className="mt-0.5 flex-shrink-0 p-1 -m-1"
                  title={prospect.contacted ? 'Marcar como pendente' : 'Marcar como contatado'}
                >
                  {prospect.contacted ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300 hover:text-blue-400 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div>
                    <p className={`font-semibold text-sm ${prospect.contacted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                      {prospect.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {prospect.vehicle && <span>{prospect.vehicle}</span>}
                      {prospect.vehicle && prospect.interest && <span> &middot; </span>}
                      {prospect.interest && <span>{prospect.interest}</span>}
                    </p>
                    {prospect.notes && (
                      <p className="text-xs text-slate-400 mt-1">{prospect.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setEditingProspect(prospect)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    {!prospect.contacted && (
                      <a
                        href={generateProspectWhatsAppLink(prospect.phone, prospect.name, prospect.vehicle || 'veiculo')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Enviar Oferta
                      </a>
                    )}
                    <button
                      onClick={() => onDelete(prospect.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sm:hidden">Remover</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingProspect && (
        <EditProspectModal
          prospect={editingProspect}
          onSave={handleEditSave}
          onClose={() => setEditingProspect(null)}
        />
      )}
    </>
  );
}
