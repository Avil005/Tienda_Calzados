import { redirect } from "next/navigation";
import { obtenerSesion, rutaInicio } from "@/lib/session";
import { param } from "@/lib/formato";
import Avisos from "@/components/Avisos";
import { iniciarSesionAccion } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const s = obtenerSesion();
  if (s) redirect(rutaInicio(s.rol));
  const error = param(searchParams.error);

  return (
    <main className="flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 shadow-lg shadow-slate-200/60">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-3.5 py-1.5 text-xs font-bold tracking-wider text-white shadow-sm">
            IMPORTADORA ABC · PAMPILI
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Portal de distribución mayorista de calzados
          </p>
        </div>

        <Avisos error={error} />

        <form action={iniciarSesionAccion} className="space-y-4">
          <div>
            <label className="etiqueta" htmlFor="login">Usuario</label>
            <input
              id="login"
              name="login"
              className="campo"
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              className="campo"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn mt-2 w-full py-2.5">
            Iniciar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
