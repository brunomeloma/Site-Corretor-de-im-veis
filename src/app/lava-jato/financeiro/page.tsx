"use client";

import { useEffect, useState } from "react";
import { lavaJatoSupabase } from "@/lib/lavajato/supabase";
import type { Cliente, Venda } from "@/lib/lavajato/types";

const FORMAS = ["dinheiro", "pix", "debito", "credito"] as const;

export default function FinanceiroPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [valor, setValor] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState<(typeof FORMAS)[number]>("pix");

  async function carregar() {
    const [{ data: vendasData }, { data: clientesData }] = await Promise.all([
      lavaJatoSupabase.from("vendas").select("*").order("created_at", { ascending: false }),
      lavaJatoSupabase.from("clientes").select("*").order("nome"),
    ]);
    setVendas(vendasData ?? []);
    setClientes(clientesData ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function registrarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || valor <= 0) return;
    await lavaJatoSupabase
      .from("vendas")
      .insert({ cliente_id: clienteId, valor, forma_pagamento: formaPagamento });
    setClienteId("");
    setValor(0);
    carregar();
  }

  function nomeCliente(id: string) {
    return clientes.find((c) => c.id === id)?.nome ?? "—";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const totalHoje = vendas
    .filter((v) => new Date(v.created_at) >= hoje)
    .reduce((sum, v) => sum + Number(v.valor), 0);

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const totalMes = vendas
    .filter((v) => new Date(v.created_at) >= inicioMes)
    .reduce((sum, v) => sum + Number(v.valor), 0);

  const porForma = FORMAS.map((forma) => ({
    forma,
    total: vendas
      .filter((v) => v.forma_pagamento === forma && new Date(v.created_at) >= inicioMes)
      .reduce((sum, v) => sum + Number(v.valor), 0),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Financeiro</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Faturamento hoje</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-400">R$ {totalHoje.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Faturamento do mês</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-400">R$ {totalMes.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {porForma.map((f) => (
          <div key={f.forma} className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-xs">
            {f.forma}: R$ {f.total.toFixed(2)}
          </div>
        ))}
      </div>

      <form onSubmit={registrarVenda} className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <select
          className="flex-1 min-w-[150px] rounded-lg bg-slate-800 px-3 py-2"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
        >
          <option value="">Cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <input
          className="w-28 rounded-lg bg-slate-800 px-3 py-2"
          type="number"
          min={0}
          step="0.01"
          placeholder="Valor R$"
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
        />
        <select
          className="rounded-lg bg-slate-800 px-3 py-2"
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as (typeof FORMAS)[number])}
        >
          {FORMAS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          Registrar venda
        </button>
      </form>

      <div className="space-y-2">
        {vendas.map((v) => (
          <div key={v.id} className="flex justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
            <span>{nomeCliente(v.cliente_id)}</span>
            <span className="text-slate-400">
              R$ {Number(v.valor).toFixed(2)} · {v.forma_pagamento}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
