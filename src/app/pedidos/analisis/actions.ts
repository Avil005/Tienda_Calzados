"use server";
import { redirect } from "next/navigation";
import { requerirRol } from "@/lib/session";
import { rpc } from "@/lib/supabase";
import { hoyBolivia, mensajeError, urlConAviso } from "@/lib/formato";
import { validarFechaEntrega } from "@/lib/pedidos";

const RUTA = "/pedidos/analisis";
const id = (fd: FormData) => Number(fd.get("idPedido"));

export async function tomarPedidoAccion(fd: FormData) {
  const s = requerirRol("ENCARGADO_PEDIDOS");
  const idPedido = id(fd);
  let destino = urlConAviso(RUTA, { id: String(idPedido) });
  try {
    await rpc("sp_tomar_pedido", { p_id_pedido: idPedido, p_id_usuario: s.idUsuario });
  } catch (e) {
    destino = urlConAviso(RUTA, { id: String(idPedido), error: mensajeError(e) });
  }
  redirect(destino);
}

export async function liberarPedidoAccion(fd: FormData) {
  const s = requerirRol("ENCARGADO_PEDIDOS");
  const idPedido = id(fd);
  let destino = urlConAviso(RUTA, { ok: `Pedido #${idPedido} liberado.` });
  try {
    await rpc("sp_liberar_pedido", { p_id_pedido: idPedido, p_id_usuario: s.idUsuario });
  } catch (e) {
    destino = urlConAviso(RUTA, { id: String(idPedido), error: mensajeError(e) });
  }
  redirect(destino);
}

/** Opción A (RN-06, RN-07): asigna almacén y confirma. NO descuenta stock. */
export async function confirmarPedidoAccion(fd: FormData) {
  const s = requerirRol("ENCARGADO_PEDIDOS");
  const idPedido = id(fd);
  const idAlmacen = Number(fd.get("idAlmacen"));
  let destino = urlConAviso(RUTA, { ok: `Pedido #${idPedido} CONFIRMADO. El stock se descontará al despachar.` });
  try {
    if (!idAlmacen) throw new Error("Seleccione un almacén de entrega.");
    await rpc("sp_confirmar_pedido", {
      p_id_pedido: idPedido,
      p_id_usuario: s.idUsuario,
      p_id_almacen: idAlmacen,
    });
  } catch (e) {
    destino = urlConAviso(RUTA, { id: String(idPedido), error: mensajeError(e) });
  }
  redirect(destino);
}

/** Opción B (RN-08): stock insuficiente -> PENDIENTE_STOCK con fecha >= hoy. */
export async function posponerPedidoAccion(fd: FormData) {
  const s = requerirRol("ENCARGADO_PEDIDOS");
  const idPedido = id(fd);
  const fecha = String(fd.get("fechaAprox") ?? "");
  let destino = urlConAviso(RUTA, { ok: `Pedido #${idPedido} pasó a PENDIENTE_STOCK.` });
  try {
    const err = validarFechaEntrega(fecha, hoyBolivia());
    if (err) throw new Error(err);
    await rpc("sp_posponer_pedido", { p_id_pedido: idPedido, p_id_usuario: s.idUsuario, p_fecha: fecha });
  } catch (e) {
    destino = urlConAviso(RUTA, { id: String(idPedido), error: mensajeError(e) });
  }
  redirect(destino);
}
