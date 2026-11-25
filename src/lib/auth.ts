import bcrypt from "bcryptjs";
import { db, uno } from "./supabase";
import type { Rol, Sesion } from "./token";

export const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos.";

type FilaUsuario = {
  id_usuario: number;
  nombre_completo: string;
  login: string;
  contrasena: string;
  rol: Rol;
  estado: string;
  cliente: { id_cliente: number } | { id_cliente: number }[] | null;
};

/** HU-01: valida login + hash bcrypt (RNF-02). Devuelve null si falla. */
export async function validarCredenciales(
  login: string,
  clave: string
): Promise<Omit<Sesion, "exp"> | null> {
  if (!login || !clave) return null;
  const { data, error } = await db()
    .from("usuario")
    .select(
      "id_usuario,nombre_completo,login,contrasena,rol,estado,cliente(id_cliente)"
    )
    .eq("login", login)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const u = data as unknown as FilaUsuario | null;
  if (!u || u.estado !== "ACTIVO") return null;
  const coincide = await bcrypt.compare(clave, u.contrasena);
  if (!coincide) return null;
  return {
    idUsuario: u.id_usuario,
    nombre: u.nombre_completo,
    login: u.login,
    rol: u.rol,
    idCliente: uno(u.cliente)?.id_cliente ?? null,
  };
}
