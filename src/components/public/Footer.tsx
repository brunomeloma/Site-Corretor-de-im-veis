import { Building2, Phone, Mail, MapPin, AtSign } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-7 w-7 text-emerald-500" />
              <span className="text-xl font-bold text-white">Andryel</span>
            </div>
            <p className="text-sm leading-relaxed">
              Corretor de imóveis certificado, dedicado a encontrar a melhor oportunidade para você com transparência e profissionalismo.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-emerald-400 transition-colors">Início</Link></li>
              <li><Link href="/imoveis" className="hover:text-emerald-400 transition-colors">Imóveis</Link></li>
              <li><Link href="/contato" className="hover:text-emerald-400 transition-colors">Contato</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" />
                (00) 00000-0000
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500" />
                contato@andryel.com.br
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                São Paulo, SP
              </li>
              <li className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-emerald-500" />
                @andryel.imoveis
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Andryel Imóveis. Todos os direitos reservados. | CRECI 00000-F
        </div>
      </div>
    </footer>
  );
}
