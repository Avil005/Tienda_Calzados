import Link from "next/link";
import { requerirRol } from "@/lib/session";
import { db, ok } from "@/lib/supabase";
import Encabezado from "@/components/Encabezado";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import PedidoCliente, { type PedidoFila } from "@/components/PedidoCliente";

export const dynamic = "force-dynamic";

export default async function PedidoPage() {
  const sesion = requerirRol("CLIENTE");
  const idCliente = sesion.idCliente ?? 0;

  const cliente = ok(
    await db().from("cliente").select("razon_social,estado").eq("id_cliente", idCliente).single()
  ) as { razon_social: string; estado: string };

  const pedidos = ok(
    await db()
      .from("pedido")
      .select("id_pedido,fecha_pedido,estado,fecha_aprox_entrega")
      .eq("id_cliente", idCliente)
      .order("id_pedido", { ascending: false })
      .limit(20)
  ) as unknown as PedidoFila[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Encabezado sesion={sesion} seccion="Registrar Pedido Mayorista">
        <Link href="/catalogo" className="btn-sec !px-3 !py-1.5 !text-xs">
          ← Volver al catálogo
        </Link>
        <EtiquetaEstado estado={cliente.estado} />
      </Encabezado>
      <PedidoCliente idCliente={idCliente} razonSocial={cliente.razon_social} estadoCliente={cliente.estado} pedidos={pedidos} />
    </main>
  );
}
