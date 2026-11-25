"use client";
import { useState } from "react";
import { agregarAlCarrito } from "@/lib/carrito";

export interface CalzadoVista {
  id: number;
  codigo: string;
  marca: string;
  descripcion: string;
  tipo: string;
  modelo: string;
  color: string;
  numero: number;
}

const COLOR_DOT: Record<string, string> = {
  rosa: "bg-pink-400",
  blanco: "bg-white border border-slate-300",
  lila: "bg-purple-400",
  negro: "bg-slate-900",
  azul: "bg-blue-500",
  rojo: "bg-rose-600",
  beige: "bg-amber-200",
  dorado: "bg-yellow-400",
  plateado: "bg-slate-300",
};

export default function TarjetaCalzado({
  idCliente,
  calzado: c,
  puedeAgregar,
}: {
  idCliente: number;
  calzado: CalzadoVista;
  puedeAgregar: boolean;
}) {
  const [cantidad, setCantidad] = useState(12);
  const [agregado, setAgregado] = useState(false);
  const valida = Number.isInteger(cantidad) && cantidad > 0;
  const dotClass = COLOR_DOT[c.color.trim().toLowerCase()] ?? "bg-rose-500";

  function agregar() {
    if (!valida) return;
    agregarAlCarrito(idCliente, {
      idCalzado: c.id,
      codigo: c.codigo,
      descripcion: c.descripcion,
      color: c.color,
      numero: c.numero,
      cantidad,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1500);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition hover:border-rose-200 hover:shadow-md">
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50 px-4">
        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70">
          {c.codigo}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-rose-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          {c.marca}
        </span>
        <svg
          viewBox="0 0 64 40"
          className="h-14 w-20 text-rose-400/80 transition duration-300 group-hover:scale-105 group-hover:text-rose-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 28h50c1.7 0 3-1.3 3-3 0-2.8-2.1-5.1-4.9-5.4l-13.6-1.6c-3.1-.4-6-1.9-8-4.3L26 6l-7 4c-2.5 1.4-5.6 1.2-7.9-.5L9 8 5 18.5C4.3 20.3 4 22.2 4 24.1V26c0 1.1.9 2 2 2Z" />
          <path d="M4 31h55" />
        </svg>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-xs font-medium text-slate-400">
          {c.tipo} · Mod. {c.modelo}
        </div>
        <h3 className="text-base font-bold leading-snug text-slate-900">
          {c.descripcion}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
            {c.color}
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
            Talla {c.numero}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                value={Number.isNaN(cantidad) ? "" : cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value, 10))}
                className="w-16 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-center text-sm font-semibold text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                aria-label="Cantidad de pares"
              />
            </div>
            <button
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                agregado
                  ? "bg-emerald-600 hover:bg-emerald-600"
                  : "bg-slate-900 hover:bg-rose-600"
              }`}
              onClick={agregar}
              disabled={!valida || !puedeAgregar}
            >
              {agregado ? "✓ Agregado" : "+ Agregar"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
