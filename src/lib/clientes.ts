import { randomInt } from "crypto";

export interface DatosCliente {
  nit: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  correo: string;
  nroDocumento: string;
  fechaFirma: string; // YYYY-MM-DD
}

/** HU-02: devuelve la lista de errores de validación (vacía si todo está bien). */
export function validarNuevoCliente(d: DatosCliente): string[] {
  const e: string[] = [];
  if (!/^\d{5,20}$/.test(d.nit)) e.push("El NIT debe tener solo dígitos (5 a 20).");
  if (d.razonSocial.trim().length < 3) e.push("Ingrese la razón social.");
  if (d.direccion.trim().length < 3) e.push("Ingrese la dirección comercial.");
  if (!/^[0-9+\-\s]{6,20}$/.test(d.telefono)) e.push("Teléfono inválido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo)) e.push("Correo electrónico inválido.");
  if (d.nroDocumento.trim().length < 3) e.push("Ingrese el número del documento de compromiso (RN-03).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fechaFirma)) e.push("Ingrese la fecha de firma del compromiso (RN-03).");
  return e;
}

const SUFIJOS_SOCIETARIOS = new Set(["srl", "sa", "ltda", "sociedad", "limitada", "de", "la", "el"]);

/** Genera un login tipo "cli_mundokids4" a partir de la razón social. */
export function generarLogin(razonSocial: string): string {
  const limpio = razonSocial
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !SUFIJOS_SOCIETARIOS.has(p));
  const base = (limpio.slice(0, 2).join("") || "cliente").slice(0, 12);
  return `cli_${base}${randomInt(1, 10)}`;
}

/** Contraseña temporal con el formato del mockup (Pmp#8492). */
export function generarClaveTemporal(): string {
  return `Pmp#${randomInt(1000, 10000)}`;
}
