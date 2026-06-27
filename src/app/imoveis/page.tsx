'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/public/Header';
import SearchBar from '@/components/public/SearchBar';
import PropertyCard from '@/components/public/PropertyCard';
import Footer from '@/components/public/Footer';
import { Property } from '@/lib/types';
import { getProperties } from '@/lib/storage';
import { Building2 } from 'lucide-react';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transaction, setTransaction] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    setProperties(getProperties());
  }, []);

  const filtered = properties.filter((p) => {
    if (transaction && p.transaction !== transaction) return false;
    if (propertyType && p.type !== propertyType) return false;
    if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (maxPrice && p.price > parseFloat(maxPrice)) return false;
    return true;
  });

  return (
    <>
      <Header />
      <main className="flex-1 pt-16 bg-slate-50 min-h-screen">
        <div className="bg-slate-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white mb-2">Todos os Imóveis</h1>
            <p className="text-slate-400">Encontre a opção perfeita para você</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <SearchBar
            transaction={transaction}
            propertyType={propertyType}
            city={city}
            maxPrice={maxPrice}
            onTransactionChange={setTransaction}
            onPropertyTypeChange={setPropertyType}
            onCityChange={setCity}
            onMaxPriceChange={setMaxPrice}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-sm text-slate-500 mb-6">{filtered.length} imóvel(is) encontrado(s)</p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">Nenhum imóvel encontrado.</p>
              <p className="text-sm mt-1">Tente ajustar os filtros de busca.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
