import { describe, it, expect } from "vitest";
import { generarClaveTemporal, generarLogin, validarNuevoCliente } from "../clientes";

const valido = {
  nit: "4589210019", razonSocial: "Zapatería Pasitos S.R.L.", direccion: "Av. Banzer 3er Anillo",
  telefono: "77012345", correo: "compras@zapateria.bo", nroDocumento: "COMP-2026-004", fechaFirma: "2026-11-23",
};

describe("HU-02 registro de cliente", () => {
  it("acepta datos completos", () => {
    expect(validarNuevoCliente(valido)).toEqual([]);
  });
  it("exige documento de compromiso y fecha (RN-03)", () => {
    const e = validarNuevoCliente({ ...valido, nroDocumento: "", fechaFirma: "" });
    expect(e.length).toBe(2);
  });
  it("rechaza NIT no numérico y correo inválido", () => {
    const e = validarNuevoCliente({ ...valido, nit: "ABC", correo: "sin-arroba" });
    expect(e.length).toBe(2);
  });
  it("genera login con prefijo cli_ sin tildes ni sufijos societarios", () => {
    expect(generarLogin("Zapatería Pasitos S.R.L.")).toMatch(/^cli_zapateriapasit\d$|^cli_[a-z0-9]+\d$/);
    expect(generarLogin("Calzados Mundo Kids S.R.L.")).not.toMatch(/srl/);
  });
  it("genera clave temporal con formato Pmp#NNNN", () => {
    expect(generarClaveTemporal()).toMatch(/^Pmp#\d{4}$/);
  });
});
