"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoClienteAccion } from "@/app/admin/clientes/actions";

export default function SelectorEstadoCliente({
  idCliente,
  estado,
}: {
  idCliente: number;
  estado: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(estado);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(nuevo: string) {
    const previo = valor;
    setValor(nuevo);
    const r = await cambiarEstadoClienteAccion(idCliente, nuevo);
    if (!r.ok) {
      setValor(previo);
      setError(r.error ?? "No se pudo cambiar el estado.");
    } else {
      setError(null);
      router.refresh();
    }
  }

  return (
    <div>
      <select
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        className="border-2 border-slate-800 bg-white px-2 py-1 font-mono text-xs font-bold"
        aria-label="Estado del cliente"
      >
        <option value="ACTIVO">ACTIVO</option>
        <option value="SUSPENDIDO">SUSPENDIDO</option>
        <option value="INACTIVO">INACTIVO</option>
      </select>
      {error && <div className="text-xs text-red-700">{error}</div>}
    </div>
  );
}
