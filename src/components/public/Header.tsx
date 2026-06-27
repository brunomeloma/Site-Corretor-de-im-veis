'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Home, Building2, Phone, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-emerald-500" />
            <div>
              <span className="text-xl font-bold text-white">Andryel</span>
              <span className="text-xs text-slate-400 block -mt-1">Corretor de Imóveis</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium">
              <Home className="h-4 w-4" />
              Início
            </Link>
            <Link href="/imoveis" className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              Imóveis
            </Link>
            <Link href="/contato" className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium">
              <Phone className="h-4 w-4" />
              Contato
            </Link>
            <Link href="/admin" className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-sm">
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </Link>
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-slate-300 hover:text-white"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800">
          <nav className="px-4 py-4 space-y-3">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-white py-2">
              <Home className="h-5 w-5" /> Início
            </Link>
            <Link href="/imoveis" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-white py-2">
              <Building2 className="h-5 w-5" /> Imóveis
            </Link>
            <Link href="/contato" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-slate-300 hover:text-white py-2">
              <Phone className="h-5 w-5" /> Contato
            </Link>
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 py-2 border-t border-slate-800 mt-2 pt-4">
              <LayoutDashboard className="h-5 w-5" /> Painel Administrativo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
