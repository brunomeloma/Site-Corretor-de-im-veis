'use client';

import { Client } from '@/lib/types';
import { DollarSign, AlertTriangle, Users, TrendingUp, Send, XCircle } from 'lucide-react';

interface DashboardProps {
  clients: Client[];
}

export default function Dashboard({ clients }: DashboardProps) {
  const paidCount = clients.filter((c) => c.status === 'pago').length;
  const sentCount = clients.filter((c) => c.status === 'enviado').length;
  const pendingCount = clients.filter((c) => c.status === 'pendente').length;
  const cancelCount = clients.filter((c) => c.status === 'cancelando' || c.status === 'processo_cancel').length;
  const activeCount = paidCount + sentCount + pendingCount;
  const compliance = clients.length > 0 ? Math.round((paidCount / clients.length) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">Pagos</span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-green-700">{paidCount}</p>
        <p className="text-xs text-green-600 mt-1">clientes em dia</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Send className="h-5 w-5 text-yellow-600" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">Enviados</span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-yellow-700">{sentCount}</p>
        <p className="text-xs text-yellow-600 mt-1">cobrança enviada</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">Pendentes</span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-orange-700">{pendingCount}</p>
        <p className="text-xs text-orange-600 mt-1">aguardando ação</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">Cancelando</span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-red-700">{cancelCount}</p>
        <p className="text-xs text-red-600 mt-1">em cancelamento</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm col-span-2 lg:col-span-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">Total</span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-slate-800">{clients.length}</p>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${compliance}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">{compliance}% adimplência</p>
      </div>
    </div>
  );
}
