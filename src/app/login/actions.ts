"use server";
import { redirect } from "next/navigation";
import { validarCredenciales, MENSAJE_CREDENCIALES } from "@/lib/auth";
import { crearSesion, destruirSesion, rutaInicio } from "@/lib/session";
import { urlConAviso } from "@/lib/formato";

export async function iniciarSesionAccion(fd: FormData) {
  const login = String(fd.get("login") ?? "").trim();
  const clave = String(fd.get("contrasena") ?? "");
  let destino = urlConAviso("/login", { error: MENSAJE_CREDENCIALES });
  try {
    const datos = await validarCredenciales(login, clave);
    if (datos) {
      crearSesion(datos);
      destino = rutaInicio(datos.rol);
    }
  } catch (e) {
    console.error(e);
    destino = urlConAviso("/login", { error: "No se pudo conectar con el servidor." });
  }
  redirect(destino);
}

export async function cerrarSesionAccion() {
  destruirSesion();
  redirect("/login");
}
