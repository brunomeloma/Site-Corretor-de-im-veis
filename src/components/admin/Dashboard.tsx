'use client';

import { Client } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, AlertTriangle, Users, TrendingUp, Car, Bike, Truck } from 'lucide-react';

interface DashboardProps {
  clients: Client[];
}

export default function Dashboard({ clients }: DashboardProps) {
  const totalReceived = clients
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.monthlyValue, 0);

  const totalPending = clients
    .filter((c) => c.status === 'unpaid')
    .reduce((sum, c) => sum + c.monthlyValue, 0);

  const paidCount = clients.filter((c) => c.status === 'paid').length;
  const unpaidCount = clients.filter((c) => c.status === 'unpaid').length;
  const paidPercentage = clients.length > 0 ? Math.round((paidCount / clients.length) * 100) : 0;

  const vehicleCounts = {
    car: clients.filter((c) => c.vehicleType === 'car').length,
    motorcycle: clients.filter((c) => c.vehicleType === 'motorcycle').length,
    truck: clients.filter((c) => c.vehicleType === 'truck' || c.vehicleType === 'van' || c.vehicleType === 'fleet').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-500">Recebido</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(totalReceived)}</p>
          <p className="text-xs text-emerald-600 mt-1">{paidCount} seguros em dia</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-500">Pendente</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-red-600 mt-1">{unpaidCount} em atraso</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-500">Clientes</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{clients.length}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Car className="h-3 w-3" />{vehicleCounts.car}</span>
            <span className="flex items-center gap-1"><Bike className="h-3 w-3" />{vehicleCounts.motorcycle}</span>
            <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{vehicleCounts.truck}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-500">Adimplência</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{paidPercentage}%</p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
