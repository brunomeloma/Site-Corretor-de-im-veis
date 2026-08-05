"use client";

import { useEffect, useState } from "react";
import { lavaJatoSupabase } from "@/lib/lavajato/supabase";
import type { Assinatura, Cliente, Plano } from "@/lib/lavajato/types";

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);

  const [nome, setNome] = useState("");
  const [lavagens, setLavagens] = useState(4);
  const [preco, setPreco] = useState(0);

  const [clienteId, setClienteId] = useState("");
  const [planoId, setPlanoId] = useState("");

  async function carregar() {
    const [{ data: planosData }, { data: clientesData }, { data: assinaturasData }] =
      await Promise.all([
        lavaJatoSupabase.from("planos").select("*").eq("ativo", true).order("preco_mensal"),
        lavaJatoSupabase.from("clientes").select("*").order("nome"),
        lavaJatoSupabase.from("assinaturas").select("*").eq("status", "ativo"),
      ]);
    setPlanos(planosData ?? []);
    setClientes(clientesData ?? []);
    setAssinaturas(assinaturasData ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarPlano(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || lavagens <= 0 || preco < 0) return;
    await lavaJatoSupabase
      .from("planos")
      .insert({ nome, lavagens_por_mes: lavagens, preco_mensal: preco });
    setNome("");
    setLavagens(4);
    setPreco(0);
    carregar();
  }

  async function assinarPlano(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !planoId) return;
    const dataRenovacao = new Date();
    dataRenovacao.setMonth(dataRenovacao.getMonth() + 1);
    await lavaJatoSupabase.from("assinaturas").insert({
      cliente_id: clienteId,
      plano_id: planoId,
      data_renovacao: dataRenovacao.toISOString().slice(0, 10),
    });
    setClienteId("");
    setPlanoId("");
    carregar();
  }

  function nomeCliente(id: string) {
    return clientes.find((c) => c.id === id)?.nome ?? "—";
  }
  function planoDoAssinante(id: string) {
    return planos.find((p) => p.id === id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Planos e Combos Mensais</h1>

      <form onSubmit={criarPlano} className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <input
          className="flex-1 min-w-[150px] rounded-lg bg-slate-800 px-3 py-2"
          placeholder="Nome do combo (ex: 4 lavagens/mês)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          className="w-28 rounded-lg bg-slate-800 px-3 py-2"
          type="number"
          min={1}
          placeholder="Lavagens/mês"
          value={lavagens}
          onChange={(e) => setLavagens(Number(e.target.value))}
        />
        <input
          className="w-28 rounded-lg bg-slate-800 px-3 py-2"
          type="number"
          min={0}
          step="0.01"
          placeholder="Preço R$"
          value={preco}
          onChange={(e) => setPreco(Number(e.target.value))}
        />
        <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          Criar combo
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {planos.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">{p.nome}</p>
            <p className="text-sm text-slate-400">
              {p.lavagens_por_mes}x/mês · R$ {Number(p.preco_mensal).toFixed(2)} · R${" "}
              {(Number(p.preco_mensal) / p.lavagens_por_mes).toFixed(2)}/lavagem
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={assinarPlano} className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <select
          className="flex-1 min-w-[150px] rounded-lg bg-slate-800 px-3 py-2"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
        >
          <option value="">Selecione o cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          className="flex-1 min-w-[150px] rounded-lg bg-slate-800 px-3 py-2"
          value={planoId}
          onChange={(e) => setPlanoId(e.target.value)}
        >
          <option value="">Selecione o combo</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          Assinar plano
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-slate-400">Assinaturas ativas</h2>
        {assinaturas.map((a) => {
          const plano = planoDoAssinante(a.plano_id);
          return (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
              <span className="font-medium">{nomeCliente(a.cliente_id)}</span> — {plano?.nome} ·{" "}
              {a.lavagens_usadas}/{plano?.lavagens_por_mes} usadas · renova em{" "}
              {new Date(a.data_renovacao).toLocaleDateString("pt-BR")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
