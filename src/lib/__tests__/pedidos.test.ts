import { describe, it, expect } from "vitest";
import { consolidarItems, validarFechaEntrega, validarItems } from "../pedidos";
import { almacenesQueCubren, cubre, faltantes, sugerirAlmacen, type LineaAnalisis } from "../analisis";

describe("HU-05 registrar pedido", () => {
  it("CP-07: rechaza pedido vacío", () => {
    expect(validarItems([])).not.toBeNull();
  });
  it("CP-07: rechaza cantidad 0, negativa o decimal", () => {
    expect(validarItems([{ idCalzado: 1, cantidad: 0 }])).not.toBeNull();
    expect(validarItems([{ idCalzado: 1, cantidad: -3 }])).not.toBeNull();
    expect(validarItems([{ idCalzado: 1, cantidad: 2.5 }])).not.toBeNull();
  });
  it("acepta cantidades enteras positivas", () => {
    expect(validarItems([{ idCalzado: 1, cantidad: 10 }, { idCalzado: 3, cantidad: 12 }])).toBeNull();
  });
  it("suma ítems repetidos del mismo calzado", () => {
    expect(consolidarItems([{ idCalzado: 1, cantidad: 5 }, { idCalzado: 1, cantidad: 7 }])).toEqual([{ idCalzado: 1, cantidad: 12 }]);
  });
});

describe("HU-08 análisis de pedido", () => {
  // Pedido #101 del mockup: 25 pares FAB-101-ROSA-28 y 15 FAB-101-BLANCO-30
  const lineas: LineaAnalisis[] = [
    { idCalzado: 1, solicitada: 25, stock: { 1: 120, 2: 30 } },
    { idCalzado: 2, solicitada: 15, stock: { 1: 85, 2: 0 } },
  ];
  it("CP-08: el almacén central cubre el pedido completo (RN-06)", () => {
    expect(cubre(lineas, 1)).toBe(true);
    expect(sugerirAlmacen(lineas, [1, 2])).toBe(1);
  });
  it("CP-09: el almacén de mercado no cubre y reporta faltantes", () => {
    expect(cubre(lineas, 2)).toBe(false);
    expect(faltantes(lineas, 2).map((l) => l.idCalzado)).toEqual([2]);
    expect(almacenesQueCubren(lineas, [1, 2])).toEqual([1]);
  });
  it("sin almacén que cubra no hay sugerencia", () => {
    expect(sugerirAlmacen([{ idCalzado: 1, solicitada: 500, stock: { 1: 120 } }], [1])).toBeNull();
  });
  it("CP-09 (parte fecha): la fecha aproximada no puede ser anterior a hoy (RN-08)", () => {
    expect(validarFechaEntrega("2026-11-23", "2026-11-24")).not.toBeNull();
    expect(validarFechaEntrega("2026-11-24", "2026-11-24")).toBeNull();
    expect(validarFechaEntrega("", "2026-11-24")).not.toBeNull();
  });
});
