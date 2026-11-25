"use server";
import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/session";
import { db, rpc } from "@/lib/supabase";
import { mensajeError } from "@/lib/formato";
import { consolidarItems, validarItems, type ItemPedido } from "@/lib/pedidos";

export type ResultadoPedido =
  | { ok: true; idPedido: number; fecha: string }
  | { ok: false; error: string };

export async function registrarPedidoAccion(
  items: ItemPedido[],
  observacion: string
): Promise<ResultadoPedido> {
  const s = requerirRol("CLIENTE");
  const error = validarItems(items);
  if (error) return { ok: false, error };
  try {
    const idPedido = await rpc<number>("sp_registrar_pedido", {
      p_id_cliente: s.idCliente,
      p_id_usuario: s.idUsuario,
      p_observacion: observacion ?? "",
      p_items: consolidarItems(items).map((i) => ({ id_calzado: i.idCalzado, cantidad: i.cantidad })),
    });
    const { data } = await db().from("pedido").select("fecha_pedido").eq("id_pedido", idPedido).single();
    revalidatePath("/pedido");
    return { ok: true, idPedido, fecha: (data as { fecha_pedido: string } | null)?.fecha_pedido ?? "" };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
