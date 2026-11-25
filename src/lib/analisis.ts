export interface LineaAnalisis {
  idCalzado: number;
  solicitada: number;
  stock: Record<number, number>; // idAlmacen -> pares disponibles
}

export const stockEn = (l: LineaAnalisis, idAlmacen: number) => l.stock[idAlmacen] ?? 0;

/** RN-06: un almacén "cubre" si alcanza para TODAS las líneas del pedido. */
export function cubre(lineas: LineaAnalisis[], idAlmacen: number): boolean {
  return lineas.length > 0 && lineas.every((l) => stockEn(l, idAlmacen) >= l.solicitada);
}

export function almacenesQueCubren(lineas: LineaAnalisis[], ids: number[]): number[] {
  return ids.filter((a) => cubre(lineas, a));
}

export function faltantes(lineas: LineaAnalisis[], idAlmacen: number): LineaAnalisis[] {
  return lineas.filter((l) => stockEn(l, idAlmacen) < l.solicitada);
}

export function sugerirAlmacen(lineas: LineaAnalisis[], ids: number[]): number | null {
  return almacenesQueCubren(lineas, ids)[0] ?? null;
}
