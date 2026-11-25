"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/session";
import { db, rpc } from "@/lib/supabase";
import { mensajeError } from "@/lib/formato";
import {
  generarClaveTemporal,
  generarLogin,
  validarNuevoCliente,
} from "@/lib/clientes";

export type ResultadoRegistro =
  | { ok: true; razonSocial: string; login: string; clave: string }
  | { ok: false; error: string };

const DEBERES_POR_DEFECTO =
  "Cumplir los plazos de pago y las condiciones de compra mayorista de Importadora ABC.";

export async function registrarClienteAccion(fd: FormData): Promise<ResultadoRegistro> {
  const admin = requerirRol("ADMINISTRADOR");
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  const datos = {
    nit: g("nit"),
    razonSocial: g("razonSocial"),
    direccion: g("direccion"),
    telefono: g("telefono"),
    correo: g("correo"),
    nroDocumento: g("nroDocumento"),
    fechaFirma: g("fechaFirma"),
  };
  const errores = validarNuevoCliente(datos);
  if (errores.length) return { ok: false, error: errores.join(" ") };

  try {
    // RN-02: NIT único
    const { data: existente } = await db()
      .from("cliente")
      .select("id_cliente")
      .eq("nit", datos.nit)
      .maybeSingle();
    if (existente) return { ok: false, error: "El cliente ya está registrado (NIT duplicado)." };

    // login único (reintenta con otro sufijo si choca)
    let login = "";
    for (let i = 0; i < 10; i++) {
      const candidato = generarLogin(datos.razonSocial);
      const { data } = await db().from("usuario").select("id_usuario").eq("login", candidato).maybeSingle();
      if (!data) { login = candidato; break; }
    }
    if (!login) return { ok: false, error: "No se pudo generar un login único. Intente de nuevo." };

    const clave = generarClaveTemporal();
    const hash = await bcrypt.hash(clave, 10); // RNF-02

    await rpc("sp_registrar_cliente", {
      p_nit: datos.nit,
      p_razon_social: datos.razonSocial,
      p_direccion: datos.direccion,
      p_telefono: datos.telefono,
      p_correo: datos.correo,
      p_login: login,
      p_contrasena_hash: hash,
      p_nro_documento: datos.nroDocumento,
      p_fecha_firma: datos.fechaFirma,
      p_deberes: DEBERES_POR_DEFECTO,
      p_id_admin: admin.idUsuario,
    });
    revalidatePath("/admin/clientes");
    return { ok: true, razonSocial: datos.razonSocial, login, clave };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

/** RN-04: no hay borrado físico; solo cambia el estado. */
export async function cambiarEstadoClienteAccion(
  idCliente: number,
  estado: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = requerirRol("ADMINISTRADOR");
  if (!["ACTIVO", "SUSPENDIDO", "INACTIVO"].includes(estado)) {
    return { ok: false, error: "Estado inválido." };
  }
  try {
    const { error } = await db().from("cliente").update({ estado }).eq("id_cliente", idCliente);
    if (error) throw new Error(error.message);
    await db().from("bitacora_auditoria").insert({
      id_usuario: admin.idUsuario,
      accion: "CAMBIO_ESTADO_CLIENTE",
      entidad: "cliente",
      detalle: `Cliente #${idCliente} -> ${estado}`,
    });
    revalidatePath("/admin/clientes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
