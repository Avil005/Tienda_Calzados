"use client";
import Link from "next/link";
import { useCarrito } from "./useCarrito";

export default function BotonMiPedido({ idCliente }: { idCliente: number }) {
  const items = useCarrito(idCliente);
  return (
    <Link
      href="/pedido"
      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
    >
      <span>Mi pedido</span>
      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold">
        {items.length}
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
