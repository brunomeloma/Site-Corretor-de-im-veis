'use client';

import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: 'buy', message: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setForm({ name: '', phone: '', email: '', interest: 'buy', message: '' });
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-emerald-800 mb-1">Mensagem enviada!</h3>
        <p className="text-emerald-600 text-sm">O Andryel entrará em contato em breve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nome</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Seu nome completo"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Telefone</label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">E-mail</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Interesse</label>
        <select
          value={form.interest}
          onChange={(e) => setForm({ ...form, interest: e.target.value })}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="buy">Quero Comprar</option>
          <option value="rent">Quero Alugar</option>
          <option value="sell">Quero Anunciar/Vender</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Mensagem</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={4}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          placeholder="Descreva o que procura..."
        />
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
      >
        <Send className="h-4 w-4" />
        Enviar Mensagem
      </button>
    </form>
  );
}
