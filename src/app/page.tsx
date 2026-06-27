'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/public/Header';
import Hero from '@/components/public/Hero';
import SearchBar from '@/components/public/SearchBar';
import PropertyCard from '@/components/public/PropertyCard';
import Footer from '@/components/public/Footer';
import { Property } from '@/lib/types';
import { getProperties } from '@/lib/storage';
import { Building2, Shield, Handshake, Clock } from 'lucide-react';

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transaction, setTransaction] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    setProperties(getProperties());
  }, []);

  const featured = properties.filter((p) => p.featured);

  const filtered = properties.filter((p) => {
    if (transaction && p.transaction !== transaction) return false;
    if (propertyType && p.type !== propertyType) return false;
    if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (maxPrice && p.price > parseFloat(maxPrice)) return false;
    return true;
  });

  const hasActiveFilters = transaction || propertyType || city || maxPrice;
  const displayProperties = hasActiveFilters ? filtered : featured;

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />

        {/* Search Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
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
        </section>

        {/* Properties Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {hasActiveFilters ? 'Resultados da Busca' : 'Imóveis em Destaque'}
            </h2>
            <p className="text-slate-500">
              {hasActiveFilters
                ? `${filtered.length} imóvel(is) encontrado(s)`
                : 'Confira as melhores oportunidades selecionadas por mim'}
            </p>
          </div>

          {displayProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum imóvel encontrado com os filtros selecionados.</p>
            </div>
          )}
        </section>

        {/* Value Props */}
        <section className="bg-slate-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Por que escolher o Andryel?</h2>
              <p className="text-slate-500">Atendimento personalizado do início ao fim</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Segurança Jurídica</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Toda documentação revisada e processo acompanhado do início ao fim para sua tranquilidade.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Handshake className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Negociação Estratégica</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Experiência em negociação para garantir as melhores condições de compra, venda ou aluguel.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-7 w-7 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Agilidade no Atendimento</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Resposta rápida e disponibilidade para visitas. Seu tempo é valioso e eu respeito isso.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
