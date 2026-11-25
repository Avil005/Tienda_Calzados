import { createHmac, timingSafeEqual } from "crypto";

export type Rol =
  | "ADMINISTRADOR"
  | "CLIENTE"
  | "ENCARGADO_ALMACEN"
  | "ENCARGADO_PEDIDOS";

export interface Sesion {
  idUsuario: number;
  nombre: string;
  login: string;
  rol: Rol;
  idCliente: number | null;
  exp: number; // epoch ms
}

export function firmarSesion(s: Sesion, secreto: string): string {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  const sig = createHmac("sha256", secreto).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verificarSesion(
  token: string,
  secreto: string,
  ahora: number = Date.now()
): Sesion | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const esperado = createHmac("sha256", secreto).update(body).digest();
  const recibido = Buffer.from(sig, "base64url");
  if (recibido.length !== esperado.length) return null;
  if (!timingSafeEqual(recibido, esperado)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Sesion;
    if (typeof s.exp !== "number" || s.exp < ahora) return null;
    return s;
  } catch {
    return null;
  }
}
