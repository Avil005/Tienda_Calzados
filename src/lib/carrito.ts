export interface ItemCarrito {
  idCalzado: number;
  codigo: string;
  descripcion: string;
  color: string;
  numero: number;
  cantidad: number;
}

const EVENTO = "carrito-abc";
const clave = (idCliente: number) => `carrito_abc_${idCliente}`;

export function leerCarrito(idCliente: number): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(clave(idCliente));
    const d = raw ? JSON.parse(raw) : [];
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export function guardarCarrito(idCliente: number, items: ItemCarrito[]): void {
  try {
    window.localStorage.setItem(clave(idCliente), JSON.stringify(items));
  } catch {
    /* almacenamiento no disponible */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function agregarAlCarrito(idCliente: number, item: ItemCarrito): void {
  const items = leerCarrito(idCliente);
  const existente = items.find((i) => i.idCalzado === item.idCalzado);
  if (existente) existente.cantidad += item.cantidad;
  else items.push(item);
  guardarCarrito(idCliente, items);
}

export const EVENTO_CARRITO = EVENTO;
