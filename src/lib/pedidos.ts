export interface ItemPedido {
  idCalzado: number;
  cantidad: number;
}

/** HU-05: cantidad > 0 y al menos un ítem. Devuelve el mensaje de error o null. */
export function validarItems(items: ItemPedido[]): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return "Agregue al menos un calzado al pedido.";
  }
  for (const it of items) {
    if (!Number.isInteger(it.idCalzado) || it.idCalzado <= 0) return "Calzado inválido.";
    if (!Number.isInteger(it.cantidad) || it.cantidad <= 0) {
      return "Las cantidades deben ser números enteros mayores a cero.";
    }
  }
  return null;
}

/** Une ítems repetidos del mismo calzado sumando cantidades. */
export function consolidarItems(items: ItemPedido[]): ItemPedido[] {
  const m = new Map<number, number>();
  for (const it of items) m.set(it.idCalzado, (m.get(it.idCalzado) ?? 0) + it.cantidad);
  return Array.from(m, ([idCalzado, cantidad]) => ({ idCalzado, cantidad }));
}

/** RN-08: la fecha aproximada de entrega debe ser >= hoy (ambas YYYY-MM-DD). */
export function validarFechaEntrega(fecha: string, hoy: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "Ingrese una fecha aproximada de entrega.";
  if (fecha < hoy) return "La fecha aproximada de entrega no puede ser anterior a hoy (RN-08).";
  return null;
}
