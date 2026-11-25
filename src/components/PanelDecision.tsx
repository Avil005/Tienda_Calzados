"use client";
import { useState } from "react";
import {
  confirmarPedidoAccion,
  liberarPedidoAccion,
  posponerPedidoAccion,
} from "@/app/pedidos/analisis/actions";

export interface AlmacenOpcion {
  id: number;
  nombre: string;
  cubre: boolean;
  faltantes: number;
}

export default function PanelDecision({
  idPedido,
  almacenes,
  sugerido,
  hoy,
}: {
  idPedido: number;
  almacenes: AlmacenOpcion[];
  sugerido: number | null;
  hoy: string;
}) {
  const [idAlmacen, setIdAlmacen] = useState<number>(sugerido ?? almacenes[0]?.id ?? 0);
  const elegido = almacenes.find((a) => a.id === idAlmacen);
  const cubre = !!elegido?.cubre;

  return (
    <div className="mt-5 space-y-5">
      <div>
        <label className="etiqueta" htmlFor="almacen">
          Almacén de entrega asignado
        </label>
        <select id="almacen" className="campo" value={idAlmacen} onChange={(e) => setIdAlmacen(Number(e.target.value))}>
          {almacenes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} {a.cubre ? "— Stock disponible (100%)" : `— Stock incompleto (${a.faltantes} línea(s) faltante(s))`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form action={confirmarPedidoAccion} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Confirmar disponibilidad</h3>
            <p className="mt-1 mb-4 text-xs text-slate-600">
              Asigna el almacén seleccionado para su posterior despacho en bodega.
            </p>
          </div>
          <div>
            <input type="hidden" name="idPedido" value={idPedido} />
            <input type="hidden" name="idAlmacen" value={idAlmacen} />
            <button className="btn w-full" disabled={!cubre}>
              Confirmar pedido
            </button>
            {!cubre && (
              <p className="mt-2 text-xs font-medium text-rose-600">
                El almacén elegido no cubre la totalidad del pedido.
              </p>
            )}
          </div>
        </form>

        <form action={posponerPedidoAccion} className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Posponer por stock insuficiente</h3>
            <div className="mt-2 mb-4">
              <label className="etiqueta" htmlFor="fechaAprox">Fecha aproximada de entrega</label>
              <input id="fechaAprox" name="fechaAprox" type="date" min={hoy} className="campo" required />
            </div>
          </div>
          <div>
            <input type="hidden" name="idPedido" value={idPedido} />
            <button className="btn-sec w-full">
              Marcar pendiente de stock
            </button>
          </div>
        </form>
      </div>

      <form action={liberarPedidoAccion} className="border-t border-slate-100 pt-3">
        <input type="hidden" name="idPedido" value={idPedido} />
        <button className="text-xs font-medium text-slate-500 underline hover:text-slate-800">
          Liberar pedido sin tomar decisión
        </button>
      </form>
    </div>
  );
}
