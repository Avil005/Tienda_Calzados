"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCarrito } from "./useCarrito";
import { guardarCarrito } from "@/lib/carrito";
import { fechaHora, soloFecha } from "@/lib/formato";
import { registrarPedidoAccion, type ResultadoPedido } from "@/app/pedido/actions";
import EtiquetaEstado from "./EtiquetaEstado";

export interface PedidoFila {
  id_pedido: number;
  fecha_pedido: string;
  estado: string;
  fecha_aprox_entrega: string | null;
}

export default function PedidoCliente({
  idCliente,
  razonSocial,
  estadoCliente,
  pedidos,
}: {
  idCliente: number;
  razonSocial: string;
  estadoCliente: string;
  pedidos: PedidoFila[];
}) {
  const router = useRouter();
  const items = useCarrito(idCliente);
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);

  const totalPares = items.reduce((a, i) => a + (i.cantidad || 0), 0);
  const cantidadesValidas = items.every((i) => Number.isInteger(i.cantidad) && i.cantidad > 0);
  const puedeEnviar = items.length > 0 && cantidadesValidas && estadoCliente === "ACTIVO" && !enviando;

  function cambiarCantidad(idCalzado: number, cantidad: number) {
    guardarCarrito(idCliente, items.map((i) => (i.idCalzado === idCalzado ? { ...i, cantidad } : i)));
  }
  function quitar(idCalzado: number) {
    guardarCarrito(idCliente, items.filter((i) => i.idCalzado !== idCalzado));
  }

  async function enviar() {
    setEnviando(true);
    const r = await registrarPedidoAccion(
      items.map((i) => ({ idCalzado: i.idCalzado, cantidad: i.cantidad })),
      observacion
    );
    setResultado(r);
    setEnviando(false);
    if (r.ok) {
      guardarCarrito(idCliente, []);
      setObservacion("");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="caja self-start">
        <div className="titulo-caja">
          <span>Resumen del pedido mayorista</span>
          <span className="text-xs font-medium text-slate-500">
            {items.length} {items.length === 1 ? "ítem" : "ítems"}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="caja-punteada py-8 text-center">
            Su pedido está vacío.{" "}
            <Link href="/catalogo" className="font-semibold text-rose-600 underline hover:text-rose-700">
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Calzado / Color / Talla</th>
                  <th>Cantidad (pares)</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.idCalzado}>
                    <td className="font-mono text-xs text-slate-600">{i.codigo}</td>
                    <td className="font-medium text-slate-900">
                      {i.descripcion}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({i.color} · Talla {i.numero})
                      </span>
                    </td>
                    <td>
                      <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-l-lg"
                          aria-label="Disminuir"
                          onClick={() => cambiarCantidad(i.idCalzado, Math.max(0, i.cantidad - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={Number.isNaN(i.cantidad) ? "" : i.cantidad}
                          onChange={(e) => cambiarCantidad(i.idCalzado, parseInt(e.target.value, 10))}
                          className="w-14 border-x border-slate-200 py-1 text-center text-sm font-semibold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          className="px-2.5 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-r-lg"
                          aria-label="Aumentar"
                          onClick={() => cambiarCantidad(i.idCalzado, (i.cantidad || 0) + 1)}
                        >
                          +
                        </button>
                      </div>
                      {!(i.cantidad > 0) && (
                        <div className="mt-1 text-xs font-medium text-rose-600">Debe ser mayor a 0</div>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => quitar(i.idCalzado)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5">
          <label className="etiqueta" htmlFor="obs">
            Observación del pedido <span className="font-normal lowercase text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="obs"
            rows={3}
            className="campo"
            placeholder="Instrucciones de entrega, horarios o notas adicionales..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>

        {resultado && !resultado.ok && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {resultado.error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="text-sm text-slate-600">
            Total ítems: <strong className="text-slate-900">{items.length}</strong> · Total pares:{" "}
            <strong className="text-slate-900">{totalPares}</strong>
          </div>
          <button className="btn" onClick={enviar} disabled={!puedeEnviar}>
            {enviando ? "Enviando pedido..." : "Confirmar y enviar pedido"}
          </button>
        </div>

        {estadoCliente !== "ACTIVO" && (
          <p className="mt-3 text-xs font-medium text-rose-600">
            Su cuenta se encuentra en estado {estadoCliente}: no puede registrar nuevos pedidos.
          </p>
        )}
      </section>

      <aside className="space-y-6">
        <section className="caja">
          <div className="titulo-caja">
            <span>Confirmación de registro</span>
          </div>
          {resultado && resultado.ok ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
              <div className="font-semibold text-emerald-900">✓ Pedido #{resultado.idPedido} generado</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                <span>Estado:</span>
                <EtiquetaEstado estado="REGISTRADO" />
              </div>
              <div className="mt-2 text-xs text-slate-500">Registrado el {fechaHora(resultado.fecha)}</div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Cuando envíe su pedido verá aquí el comprobante y número de seguimiento.
            </p>
          )}
        </section>

        <section className="caja">
          <div className="titulo-caja">
            <span>Historial de pedidos</span>
          </div>
          <p className="mb-3 text-xs font-medium text-slate-500">{razonSocial}</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-xs text-slate-400">
                      Sin pedidos registrados aún.
                    </td>
                  </tr>
                )}
                {pedidos.map((p) => (
                  <tr key={p.id_pedido}>
                    <td className="font-mono text-xs font-bold text-slate-900">#{p.id_pedido}</td>
                    <td className="text-xs text-slate-500">{soloFecha(p.fecha_pedido)}</td>
                    <td>
                      <EtiquetaEstado estado={p.estado} />
                      {p.estado === "PENDIENTE_STOCK" && p.fecha_aprox_entrega && (
                        <div className="mt-1 text-[11px] font-medium text-amber-700">
                          Entrega aprox.: {soloFecha(p.fecha_aprox_entrega)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </div>
  );
}
