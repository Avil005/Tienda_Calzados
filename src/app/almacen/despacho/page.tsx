import Link from "next/link";
import { requerirRol } from "@/lib/session";
import { db, ok, uno } from "@/lib/supabase";
import { hoyBolivia, param, soloFecha } from "@/lib/formato";
import Encabezado from "@/components/Encabezado";
import Avisos from "@/components/Avisos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import ChecklistDespacho from "@/components/ChecklistDespacho";
import { entregarPedidoAccion } from "./actions";

export const dynamic = "force-dynamic";

type Fila = {
  id_pedido: number;
  estado: string;
  id_almacen: number | null;
  fecha_aprox_entrega: string | null;
  cliente: { razon_social: string } | { razon_social: string }[];
  almacen: { nombre: string } | { nombre: string }[] | null;
};
type Detalle = {
  id_calzado: number;
  cantidad_solicitada: number;
  cantidad_confirmada: number | null;
  calzado: { codigo_fabrica: string; color: string; numero: number; modelo: { descripcion: string } | { descripcion: string }[] } | null;
};

export default async function DespachoPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sesion = requerirRol("ENCARGADO_ALMACEN");
  const idSel = Number(param(searchParams.id)) || 0;

  const pedidos = ok(
    await db()
      .from("pedido")
      .select("id_pedido,estado,id_almacen,fecha_aprox_entrega,cliente(razon_social),almacen(nombre)")
      .in("estado", ["CONFIRMADO", "DESPACHADO"])
      .order("id_pedido")
  ) as unknown as Fila[];

  const sel = pedidos.find((p) => p.id_pedido === idSel) ?? null;
  const comprobante = `SAL-${hoyBolivia().replaceAll("-", "")}-${idSel}`;

  let detalles: Detalle[] = [];
  let stock: Record<number, number> = {};
  let nroSalida: string | null = null;
  if (sel) {
    detalles = ok(
      await db()
        .from("detalle_pedido")
        .select("id_calzado,cantidad_solicitada,cantidad_confirmada,calzado(codigo_fabrica,color,numero,modelo(descripcion))")
        .eq("id_pedido", sel.id_pedido)
        .order("id_detalle")
    ) as unknown as Detalle[];
    if (sel.estado === "CONFIRMADO" && sel.id_almacen) {
      const ex = ok(
        await db()
          .from("existencia")
          .select("id_calzado,cantidad")
          .eq("id_almacen", sel.id_almacen)
          .in("id_calzado", detalles.map((d) => d.id_calzado))
      ) as { id_calzado: number; cantidad: number }[];
      stock = Object.fromEntries(ex.map((e) => [e.id_calzado, e.cantidad]));
    } else if (sel.estado === "DESPACHADO") {
      const { data } = await db()
        .from("movimiento_inventario")
        .select("nro_documento")
        .eq("id_pedido", sel.id_pedido)
        .eq("tipo", "SALIDA")
        .limit(1);
      nroSalida = (data as { nro_documento: string }[] | null)?.[0]?.nro_documento ?? null;
    }
  }
  const cantidad = (d: Detalle) => d.cantidad_confirmada ?? d.cantidad_solicitada;
  const stockOk = detalles.every((d) => (stock[d.id_calzado] ?? 0) - cantidad(d) >= 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Encabezado sesion={sesion} seccion="Control de Salidas y Despacho de Almacén">
        <span className="hidden font-medium text-slate-700 sm:inline">{sesion.nombre}</span>
      </Encabezado>
      <Avisos error={param(searchParams.error)} ok={param(searchParams.ok)} />

      <section className="caja mb-6">
        <div className="titulo-caja">
          <span>Pedidos confirmados para despacho</span>
          {sel && (
            <span className="etq bg-slate-100 font-mono text-slate-700">
              Comprobante: {comprobante}
            </span>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="tabla">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente mayorista</th>
                <th>Almacén asignado</th>
                <th>Fecha aprox.</th>
                <th>Estado actual</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    No hay pedidos confirmados ni despachados.
                  </td>
                </tr>
              )}
              {pedidos.map((p) => (
                <tr key={p.id_pedido} className={p.id_pedido === idSel ? "bg-rose-50/50" : ""}>
                  <td>
                    <Link
                      className="font-mono text-xs font-bold text-rose-600 underline hover:text-rose-700"
                      href={`/almacen/despacho?id=${p.id_pedido}`}
                    >
                      #{p.id_pedido}
                    </Link>
                  </td>
                  <td className="font-medium text-slate-900">{uno(p.cliente)?.razon_social}</td>
                  <td className="text-xs text-slate-600">{uno(p.almacen)?.nombre ?? "—"}</td>
                  <td className="text-xs text-slate-500">{soloFecha(p.fecha_aprox_entrega)}</td>
                  <td><EtiquetaEstado estado={p.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sel && (
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <section className="caja self-start">
            <div className="titulo-caja">
              <span>Detalle de salida · Pedido #{sel.id_pedido}</span>
              <span className="etq bg-slate-100 text-slate-700">Control de inventario</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="tabla">
                <thead>
                  {sel.estado === "CONFIRMADO" ? (
                    <tr>
                      <th>Calzado</th>
                      <th>Stock actual</th>
                      <th>Cant. salida</th>
                      <th>Stock final</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Calzado</th>
                      <th>Cant. despachada</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {detalles.map((d) => {
                    const actual = stock[d.id_calzado] ?? 0;
                    const final = actual - cantidad(d);
                    const c = d.calzado;
                    return (
                      <tr key={d.id_calzado}>
                        <td>
                          <div className="font-mono text-xs text-slate-600">{c?.codigo_fabrica}</div>
                          <div className="text-xs font-medium text-slate-800">
                            {uno(c?.modelo)?.descripcion} (Talla {c?.numero})
                          </div>
                        </td>
                        {sel.estado === "CONFIRMADO" ? (
                          <>
                            <td>{actual} pares</td>
                            <td className="font-bold text-slate-900">−{cantidad(d)}</td>
                            <td>
                              <span
                                className={
                                  "etq " +
                                  (final < 0
                                    ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                                    : "bg-slate-100 text-slate-700")
                                }
                              >
                                {final} pares
                              </span>
                            </td>
                          </>
                        ) : (
                          <td className="font-bold text-slate-900">{cantidad(d)} pares</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs leading-relaxed text-slate-600">
              <strong className="font-semibold text-slate-800">Nota operativa:</strong> Al confirmar el despacho se descuenta el stock del almacén asignado, se genera el comprobante de salida y se registra el movimiento en la bitácora del sistema.
            </div>

            {sel.estado === "DESPACHADO" && (
              <p className="mt-4 text-sm text-slate-700">
                Comprobante de salida registrado: <strong className="font-mono text-slate-900">{nroSalida ?? "—"}</strong>
              </p>
            )}
            {sel.estado === "DESPACHADO" && (
              <form action={entregarPedidoAccion} className="mt-4">
                <input type="hidden" name="idPedido" value={sel.id_pedido} />
                <button className="btn">Confirmar entrega al cliente</button>
              </form>
            )}
          </section>

          {sel.estado === "CONFIRMADO" && (
            <ChecklistDespacho idPedido={sel.id_pedido} stockOk={stockOk} comprobante={comprobante} />
          )}
        </div>
      )}
    </main>
  );
}
