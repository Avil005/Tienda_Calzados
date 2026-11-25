"use client";
import { useEffect, useState } from "react";
import { EVENTO_CARRITO, leerCarrito, type ItemCarrito } from "@/lib/carrito";

export function useCarrito(idCliente: number) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  useEffect(() => {
    const sync = () => setItems(leerCarrito(idCliente));
    sync();
    window.addEventListener(EVENTO_CARRITO, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENTO_CARRITO, sync);
      window.removeEventListener("storage", sync);
    };
  }, [idCliente]);
  return items;
}
