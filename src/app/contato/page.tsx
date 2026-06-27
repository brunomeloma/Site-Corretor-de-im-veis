'use client';

import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import ContactForm from '@/components/public/ContactForm';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-16 bg-slate-50 min-h-screen">
        <div className="bg-slate-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white mb-2">Entre em Contato</h1>
            <p className="text-slate-400">Tire suas dúvidas ou agende uma visita</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                <h3 className="font-bold text-slate-800 text-lg">Informações de Contato</h3>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">(00) 00000-0000</p>
                    <p className="text-xs text-slate-400">Seg - Sáb, 8h às 20h</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">contato@andryel.com.br</p>
                    <p className="text-xs text-slate-400">Resposta em até 24h</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">São Paulo, SP</p>
                    <p className="text-xs text-slate-400">Atendimento presencial e online</p>
                  </div>
                </div>
              </div>

              <a
                href="https://api.whatsapp.com/send?phone=5500000000000&text=Ol%C3%A1%20Andryel%2C%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es!"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-2xl transition-colors shadow-sm w-full"
              >
                <MessageCircle className="h-6 w-6" />
                Falar Diretamente no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
