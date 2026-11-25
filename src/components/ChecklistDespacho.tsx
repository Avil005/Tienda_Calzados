"use client";
import { useState } from "react";
import { despacharPedidoAccion } from "@/app/almacen/despacho/actions";

const PASOS = [
  "Verificar código de fábrica y modelo Pampili en etiquetas de caja.",
  "Confirmar color y numeración (talla) de cada par solicitado.",
  "Adjuntar comprobante de salida a la guía.",
];

export default function ChecklistDespacho({
  idPedido,
  stockOk,
  comprobante,
}: {
  idPedido: number;
  stockOk: boolean;
  comprobante: string;
}) {
  const [marcas, setMarcas] = useState<boolean[]>(PASOS.map(() => false));
  const completo = marcas.every(Boolean);
  return (
    <div className="space-y-4">
      <section className="caja">
        <div className="titulo-caja">
          <span>Checklist de verificación física</span>
          <span className="etq bg-slate-100 text-slate-700">Almacén</span>
        </div>
        <ul className="space-y-3 text-sm text-slate-700">
          {PASOS.map((p, i) => (
            <li key={p}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  checked={marcas[i]}
                  onChange={(e) => setMarcas(marcas.map((m, j) => (j === i ? e.target.checked : m)))}
                />
                <span>{p.replace("comprobante de salida", `comprobante ${comprobante}`)}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <form action={despacharPedidoAccion}>
        <input type="hidden" name="idPedido" value={idPedido} />
        <button className="btn w-full" disabled={!completo || !stockOk}>
          Registrar salida y despachar pedido
        </button>
        {!completo && (
          <p className="mt-2 text-xs text-slate-500">
            Marque los 3 puntos de verificación para habilitar el despacho.
          </p>
        )}
        {!stockOk && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            Stock insuficiente en almacén: no es posible despachar este pedido.
          </p>
        )}
      </form>
    </div>
  );
}
