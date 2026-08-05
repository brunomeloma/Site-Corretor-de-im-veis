"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { lavaJatoSupabase } from "@/lib/lavajato/supabase";

const NAV_ITEMS = [
  { href: "/lava-jato", label: "Painel" },
  { href: "/lava-jato/agenda", label: "Agenda" },
  { href: "/lava-jato/clientes", label: "Clientes" },
  { href: "/lava-jato/planos", label: "Planos" },
  { href: "/lava-jato/financeiro", label: "Financeiro" },
];

export default function LavaJatoLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    lavaJatoSupabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = lavaJatoSupabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null && pathname !== "/lava-jato/login") {
      router.replace("/lava-jato/login");
    }
  }, [session, pathname, router]);

  if (pathname === "/lava-jato/login") {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Carregando...
      </div>
    );
  }

  if (session === null) {
    return null;
  }

  async function handleSignOut() {
    await lavaJatoSupabase.auth.signOut();
    router.replace("/lava-jato/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-cyan-400">Carro Brilhante</span>
        <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-slate-100">
          Sair
        </button>
      </header>
      <nav className="flex gap-2 overflow-x-auto px-4 py-2 border-b border-slate-800">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              pathname === item.href
                ? "bg-cyan-500 text-slate-950 font-medium"
                : "bg-slate-900 text-slate-300"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
