'use client';

import { Search, MessageCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full blur-[128px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-emerald-500/20">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          CRECI Ativo &mdash; Corretor Certificado
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          Encontre o imóvel dos seus
          <span className="text-emerald-400"> sonhos</span> com quem
          <span className="text-emerald-400"> entende</span> do mercado.
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sou o <strong className="text-white">Andryel</strong>, corretor especializado em ajudar você a comprar, vender ou alugar com segurança, transparência e agilidade.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/imoveis"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
          >
            <Search className="h-5 w-5" />
            Ver Imóveis Disponíveis
            <ArrowRight className="h-4 w-4" />
          </Link>

          <a
            href="https://api.whatsapp.com/send?phone=5500000000000&text=Ol%C3%A1%20Andryel%2C%20tenho%20interesse%20em%20um%20im%C3%B3vel!"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl border border-white/20 transition-all"
          >
            <MessageCircle className="h-5 w-5 text-green-400" />
            Falar no WhatsApp
          </a>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">200+</p>
            <p className="text-sm text-slate-400">Imóveis vendidos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">98%</p>
            <p className="text-sm text-slate-400">Clientes satisfeitos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">5+</p>
            <p className="text-sm text-slate-400">Anos de experiência</p>
          </div>
        </div>
      </div>
    </section>
  );
}
