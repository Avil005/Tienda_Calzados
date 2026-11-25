import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { firmarSesion, verificarSesion, type Rol, type Sesion } from "./token";

export type { Rol, Sesion };

const COOKIE = "sesion_abc";
const DURACION_MS = 8 * 60 * 60 * 1000;

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Falta SESSION_SECRET (mínimo 16 caracteres) en .env.local");
  }
  return s;
}

export function obtenerSesion(): Sesion | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verificarSesion(token, secreto());
}

export function crearSesion(datos: Omit<Sesion, "exp">): void {
  const s: Sesion = { ...datos, exp: Date.now() + DURACION_MS };
  cookies().set(COOKIE, firmarSesion(s, secreto()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_MS / 1000,
  });
}

export function destruirSesion(): void {
  cookies().delete(COOKIE);
}

export function rutaInicio(rol: Rol): string {
  switch (rol) {
    case "ADMINISTRADOR":
      return "/admin/clientes";
    case "CLIENTE":
      return "/catalogo";
    case "ENCARGADO_PEDIDOS":
      return "/pedidos/analisis";
    case "ENCARGADO_ALMACEN":
      return "/almacen/despacho";
  }
}

/** Exige sesión y rol. Si no cumple, redirige (RF de control de acceso por rol). */
export function requerirRol(...roles: Rol[]): Sesion {
  const s = obtenerSesion();
  if (!s) return redirect("/login");
  if (!roles.includes(s.rol)) return redirect(rutaInicio(s.rol));
  return s;
}
