"use server";
import { redirect } from "next/navigation";
import { requerirRol } from "@/lib/session";
import { rpc } from "@/lib/supabase";
import { mensajeError, urlConAviso } from "@/lib/formato";

const RUTA = "/almacen/despacho";

/** RNF-06 / RN-12: una sola transacción atómica en la BD (sp_despachar_pedido). */
export async function despacharPedidoAccion(fd: FormData) {
  const s = requerirRol("ENCARGADO_ALMACEN");
  const idPedido = Number(fd.get("idPedido"));
  let destino = urlConAviso(RUTA, { id: String(idPedido), ok: `Pedido #${idPedido} DESPACHADO. Stock descontado.` });
  try {
    await rpc("sp_despachar_pedido", { p_id_pedido: idPedido, p_id_usuario: s.idUsuario });
  } catch (e) {
    destino = urlConAviso(RUTA, { id: String(idPedido), error: mensajeError(e) });
  }
  redirect(destino);
}

export async function entregarPedidoAccion(fd: FormData) {
  const s = requerirRol("ENCARGADO_ALMACEN");
  const idPedido = Number(fd.get("idPedido"));
  let destino = urlConAviso(RUTA, { ok: `Pedido #${idPedido} ENTREGADO.` });
  try {
    await rpc("sp_entregar_pedido", { p_id_pedido: idPedido, p_id_usuario: s.idUsuario });
  } catch (e) {
    destino = urlConAviso(RUTA, { id: String(idPedido), error: mensajeError(e) });
  }
  redirect(destino);
}
