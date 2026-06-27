'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  transaction: string;
  propertyType: string;
  city: string;
  maxPrice: string;
  onTransactionChange: (v: string) => void;
  onPropertyTypeChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
}

export default function SearchBar({
  transaction,
  propertyType,
  city,
  maxPrice,
  onTransactionChange,
  onPropertyTypeChange,
  onCityChange,
  onMaxPriceChange,
}: SearchBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-slate-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Finalidade</label>
          <select
            value={transaction}
            onChange={(e) => onTransactionChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Todas</option>
            <option value="sale">Comprar</option>
            <option value="rent">Alugar</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tipo</label>
          <select
            value={propertyType}
            onChange={(e) => onPropertyTypeChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Todos</option>
            <option value="apartment">Apartamento</option>
            <option value="house">Casa</option>
            <option value="commercial">Comercial</option>
            <option value="land">Terreno</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Cidade</label>
          <input
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Ex: São Paulo"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Preço Máximo</label>
          <input
            type="text"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            placeholder="Ex: 500000"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-end">
          <button className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm">
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </div>
      </div>
    </div>
  );
}
