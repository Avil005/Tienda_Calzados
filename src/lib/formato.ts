/** "2026-11-23T10:30:00" -> "2026-11-23 10:30" */
export function fechaHora(s: string | null | undefined): string {
  return s ? s.slice(0, 16).replace("T", " ") : "—";
}

export function soloFecha(s: string | null | undefined): string {
  return s ? s.slice(0, 10) : "—";
}

/** Fecha de hoy (YYYY-MM-DD) en hora de Bolivia. */
export function hoyBolivia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}

export function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

export function urlConAviso(ruta: string, params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const q = u.toString();
  return q ? `${ruta}?${q}` : ruta;
}
