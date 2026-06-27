'use client';

import { Property } from '@/lib/types';
import { formatCurrency, getPropertyTypeLabel, getTransactionLabel } from '@/lib/utils';
import { Bed, Bath, Car, Maximize2, MapPin, MessageCircle } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const whatsappLink = `https://api.whatsapp.com/send?phone=5500000000000&text=${encodeURIComponent(
    `Olá Andryel! Tenho interesse no imóvel: ${property.title} - ${property.neighborhood}, ${property.city}. Pode me passar mais informações?`
  )}`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
      <div className="relative h-56 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Maximize2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <span className="text-sm opacity-75">Foto do Imóvel</span>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
            property.transaction === 'sale' ? 'bg-blue-500' : 'bg-amber-500'
          }`}>
            {getTransactionLabel(property.transaction)}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-slate-700/80 backdrop-blur-sm">
            {getPropertyTypeLabel(property.type)}
          </span>
        </div>

        {property.featured && (
          <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
            Destaque
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-emerald-600 transition-colors">
            {property.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 mb-3">
          <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span className="text-sm">{property.neighborhood}, {property.city}</span>
        </div>

        <p className="text-2xl font-bold text-emerald-600 mb-4">
          {formatCurrency(property.price)}
          {property.transaction === 'rent' && <span className="text-sm font-normal text-slate-400">/mês</span>}
        </p>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-5 pb-5 border-b border-slate-100">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" /> {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" /> {property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}
          </span>
          <span className="flex items-center gap-1">
            <Car className="h-4 w-4" /> {property.parkingSpots} {property.parkingSpots === 1 ? 'vaga' : 'vagas'}
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="h-4 w-4" /> {property.area}m²
          </span>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
        >
          <MessageCircle className="h-5 w-5" />
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
