"use client";

import { useEffect, useState } from "react";
import { lavaJatoSupabase } from "@/lib/lavajato/supabase";
import type { Agendamento, Cliente, Veiculo } from "@/lib/lavajato/types";

const STATUS_LABEL: Record<Agendamento["status"], string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [inicio, setInicio] = useState("");
  const [duracaoMin, setDuracaoMin] = useState(30);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const [{ data: agendamentosData }, { data: clientesData }, { data: veiculosData }] =
      await Promise.all([
        lavaJatoSupabase.from("agendamentos").select("*").order("inicio"),
        lavaJatoSupabase.from("clientes").select("*").order("nome"),
        lavaJatoSupabase.from("veiculos").select("*"),
      ]);
    setAgendamentos(agendamentosData ?? []);
    setClientes(clientesData ?? []);
    setVeiculos(veiculosData ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarAgendamento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!clienteId || !inicio) return;

    const dataInicio = new Date(inicio);
    const dataFim = new Date(dataInicio.getTime() + duracaoMin * 60_000);

    const { error } = await lavaJatoSupabase.from("agendamentos").insert({
      cliente_id: clienteId,
      veiculo_id: veiculoId || null,
      inicio: dataInicio.toISOString(),
      fim: dataFim.toISOString(),
    });

    if (error) {
      setErro(
        error.code === "23P01"
          ? "Já existe um agendamento nesse horário."
          : error.message
      );
      return;
    }

    setClienteId("");
    setVeiculoId("");
    setInicio("");
    carregar();
  }

  async function mudarStatus(id: string, status: Agendamento["status"]) {
    await lavaJatoSupabase.from("agendamentos").update({ status }).eq("id", id);
    carregar();
  }

  function nomeCliente(id: string) {
    return clientes.find((c) => c.id === id)?.nome ?? "—";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Agenda</h1>

      <form onSubmit={criarAgendamento} className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
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
        <select
          className="flex-1 min-w-[120px] rounded-lg bg-slate-800 px-3 py-2"
          value={veiculoId}
          onChange={(e) => setVeiculoId(e.target.value)}
        >
          <option value="">Veículo (opcional)</option>
          {veiculos
            .filter((v) => v.cliente_id === clienteId)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa}
              </option>
            ))}
        </select>
        <input
          className="rounded-lg bg-slate-800 px-3 py-2"
          type="datetime-local"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
        />
        <input
          className="w-24 rounded-lg bg-slate-800 px-3 py-2"
          type="number"
          min={10}
          step={5}
          value={duracaoMin}
          onChange={(e) => setDuracaoMin(Number(e.target.value))}
        />
        <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950">
          Agendar
        </button>
      </form>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <div className="space-y-2">
        {agendamentos.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
            <div>
              <span className="font-medium">{nomeCliente(a.cliente_id)}</span>{" "}
              <span className="text-slate-400">
                {new Date(a.inicio).toLocaleString("pt-BR")}
              </span>
            </div>
            <select
              value={a.status}
              onChange={(e) => mudarStatus(a.id, e.target.value as Agendamento["status"])}
              className="rounded-lg bg-slate-800 px-2 py-1"
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
