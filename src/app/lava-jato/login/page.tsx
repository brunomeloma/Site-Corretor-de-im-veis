"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lavaJatoSupabase } from "@/lib/lavajato/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const result =
      mode === "login"
        ? await lavaJatoSupabase.auth.signInWithPassword({ email, password: senha })
        : await lavaJatoSupabase.auth.signUp({
            email,
            password: senha,
            options: { data: { nome } },
          });

    setLoading(false);

    if (result.error) {
      setErro(result.error.message);
      return;
    }

    router.replace("/lava-jato");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold text-cyan-400">Carro Brilhante</h1>
        <p className="text-sm text-slate-400">
          {mode === "login" ? "Entrar no sistema" : "Criar conta"}
        </p>

        {mode === "signup" && (
          <input
            className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={6}
          required
        />

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-500 py-2 font-medium text-slate-950 disabled:opacity-50"
        >
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full text-center text-sm text-slate-400"
        >
          {mode === "login" ? "Criar uma conta nova" : "Já tenho conta"}
        </button>
      </form>
    </div>
  );
}
