import { redirect } from "next/navigation";
import { obtenerSesion, rutaInicio } from "@/lib/session";

export const dynamic = "force-dynamic";

export default function Inicio() {
  const s = obtenerSesion();
  redirect(s ? rutaInicio(s.rol) : "/login");
}
