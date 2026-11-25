import Link from "next/link";
import { requerirRol } from "@/lib/session";
import { db, ok, uno } from "@/lib/supabase";
import { hoyBolivia, param } from "@/lib/formato";
import { cubre, faltantes, sugerirAlmacen, stockEn, type LineaAnalisis } from "@/lib/analisis";
import Encabezado from "@/components/Encabezado";
import Avisos from "@/components/Avisos";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import PanelDecision from "@/components/PanelDecision";
import { tomarPedidoAccion } from "./actions";

export const dynamic = "force-dynamic";

type PedidoLista = {
  id_pedido: number;
  estado: string;
  id_usuario_analista: number | null;
  fecha_aprox_entrega: string | null;
  cliente: { razon_social: string; nit: string; estado: string } | { razon_social: string; nit: string; estado: string }[];
  analista: { nombre_completo: string } | { nombre_completo: string }[] | null;
  detalle_pedido: { cantidad_solicitada: number }[];
};

type Detalle = {
  id_calzado: number;
  cantidad_solicitada: number;
  calzado: {
    codigo_fabrica: string;
    color: string;
    numero: number;
    modelo: { descripcion: string } | { descripcion: string }[];
  } | null;
};

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sesion = requerirRol("ENCARGADO_PEDIDOS");
  const idSel = Number(param(searchParams.id)) || 0;

  const todos = ok(
    await db()
      .from("pedido")
      .select(
        "id_pedido,estado,id_usuario_analista,fecha_aprox_entrega,cliente(razon_social,nit,estado),analista:usuario!id_usuario_analista(nombre_completo),detalle_pedido(cantidad_solicitada)"
      )
      .in("estado", ["REGISTRADO", "EN_ANALISIS", "PENDIENTE_STOCK"])
      .order("id_pedido")
  ) as unknown as PedidoLista[];

  const pendientes = todos.filter((p) => uno(p.cliente)?.estado === "ACTIVO");
  const sel = pendientes.find((p) => p.id_pedido === idSel) ?? null;
  const miBloqueo = !!sel && sel.estado === "EN_ANALISIS" && sel.id_usuario_analista === sesion.idUsuario;
  const bloqueadoPorOtro = !!sel && sel.estado === "EN_ANALISIS" && !miBloqueo;

  let lineas: LineaAnalisis[] = [];
  let detalles: Detalle[] = [];
  let almacenes: { id_almacen: number; nombre: string }[] = [];
  if (miBloqueo && sel) {
    detalles = ok(
      await db()
        .from("detalle_pedido")
        .select("id_calzado,cantidad_solicitada,calzado(codigo_fabrica,color,numero,modelo(descripcion))")
        .eq("id_pedido", sel.id_pedido)
        .order("id_detalle")
    ) as unknown as Detalle[];
    almacenes = ok(
      await db().from("almacen").select("id_almacen,nombre").eq("estado", "ACTIVO").order("id_almacen")
    ) as { id_almacen: number; nombre: string }[];
    const exist = ok(
      await db()
        .from("existencia")
        .select("id_almacen,id_calzado,cantidad")
        .in("id_calzado", detalles.map((d) => d.id_calzado))
    ) as { id_almacen: number; id_calzado: number; cantidad: number }[];
    lineas = detalles.map((d) => ({
      idCalzado: d.id_calzado,
      solicitada: d.cantidad_solicitada,
      stock: Object.fromEntries(
        exist.filter((e) => e.id_calzado === d.id_calzado).map((e) => [e.id_almacen, e.cantidad])
      ),
    }));
  }
  const idsAlm = almacenes.map((a) => a.id_almacen);
  const sugerido = sugerirAlmacen(lineas, idsAlm);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Encabezado sesion={sesion} seccion="Bandeja de Análisis de Pedidos">
        <span className="hidden font-medium text-slate-700 sm:inline">{sesion.nombre}</span>
      </Encabezado>
      <Avisos error={param(searchParams.error)} ok={param(searchParams.ok)} />

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <section className="caja self-start">
          <div className="titulo-caja">
            <span>Pedidos pendientes</span>
            <span className="etq bg-slate-100 text-slate-700">{pendientes.length}</span>
          </div>
          <div className="space-y-3">
            {pendientes.length === 0 && (
              <p className="text-sm text-slate-500">No hay pedidos pendientes de análisis.</p>
            )}
            {pendientes.map((p) => {
              const c = uno(p.cliente)!;
              const pares = p.detalle_pedido.reduce((a, d) => a + d.cantidad_solicitada, 0);
              const analista = uno(p.analista)?.nombre_completo;
              return (
                <Link
                  key={p.id_pedido}
                  href={`/pedidos/analisis?id=${p.id_pedido}`}
                  className={
                    "block rounded-xl border p-3.5 transition " +
                    (p.id_pedido === idSel
                      ? "border-rose-400 bg-rose-50/40 ring-1 ring-rose-400/40"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white")
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">Pedido #{p.id_pedido}</span>
                    <EtiquetaEstado estado={p.estado} />
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-slate-900">{c.razon_social}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    NIT: {c.nit} · <strong className="text-slate-700">{pares} pares</strong>
                  </div>
                  {p.estado === "EN_ANALISIS" && analista && (
                    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700">
                      <span>🔒 En análisis por {analista}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Mostrando únicamente pedidos de clientes con cuenta activa.
          </p>
        </section>

        <section className="caja self-start">
          {!sel ? (
            <div className="caja-punteada py-12 text-center">
              Seleccione un pedido de la bandeja izquierda para revisar su disponibilidad en almacenes.
            </div>
          ) : (
            <>
              <div className="titulo-caja">
                <span>Comparativa de stock · Pedido #{sel.id_pedido}</span>
                <EtiquetaEstado estado={sel.estado} />
              </div>

              {!miBloqueo && !bloqueadoPorOtro && (
                <form action={tomarPedidoAccion} className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Al iniciar el análisis, el pedido quedará asignado a su usuario para evitar ediciones simultáneas.
                  </p>
                  <input type="hidden" name="idPedido" value={sel.id_pedido} />
                  <button className="btn">Iniciar análisis del pedido</button>
                </form>
              )}

              {bloqueadoPorOtro && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                  Este pedido está siendo analizado actualmente por{" "}
                  <strong>{uno(sel.analista)?.nombre_completo ?? "otro encargado"}</strong>.
                </div>
              )}

              {miBloqueo && (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Calzado</th>
                          <th>Solicitado</th>
                          {almacenes.map((a) => (
                            <th key={a.id_almacen}>Stock {a.nombre}</th>
                          ))}
                          <th>Disponibilidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((d, i) => {
                          const l = lineas[i];
                          const algunoCubre = idsAlm.some((a) => stockEn(l, a) >= l.solicitada);
                          const c = d.calzado;
                          return (
                            <tr key={d.id_calzado}>
                              <td>
                                <div className="font-mono text-xs text-slate-600">{c?.codigo_fabrica}</div>
                                <div className="text-xs font-medium text-slate-800">
                                  {uno(c?.modelo)?.descripcion} (Talla {c?.numero})
                                </div>
                              </td>
                              <td className="font-bold text-slate-900">{d.cantidad_solicitada} pares</td>
                              {almacenes.map((a) => (
                                <td
                                  key={a.id_almacen}
                                  className={
                                    stockEn(l, a.id_almacen) < l.solicitada
                                      ? "font-medium text-rose-600"
                                      : "text-slate-700"
                                  }
                                >
                                  {stockEn(l, a.id_almacen)} pares
                                </td>
                              ))}
                              <td>
                                <span
                                  className={
                                    "etq " +
                                    (algunoCubre
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                      : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20")
                                  }
                                >
                                  {algunoCubre ? "Disponible" : "Faltante"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PanelDecision
                    idPedido={sel.id_pedido}
                    sugerido={sugerido}
                    hoy={hoyBolivia()}
                    almacenes={almacenes.map((a) => ({
                      id: a.id_almacen,
                      nombre: a.nombre,
                      cubre: cubre(lineas, a.id_almacen),
                      faltantes: faltantes(lineas, a.id_almacen).length,
                    }))}
                  />
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
