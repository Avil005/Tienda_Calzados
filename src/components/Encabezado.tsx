import { cerrarSesionAccion } from "@/app/login/actions";
import type { Sesion } from "@/lib/session";

export default function Encabezado({
  sesion,
  seccion,
  children,
}: {
  sesion: Sesion;
  seccion: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 rounded-xl border border-slate-200/90 bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-1.5 text-xs font-bold tracking-wider text-white shadow-sm">
            ABC · PAMPILI
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <h1 className="text-sm font-semibold text-slate-800">{seccion}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          {children}
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{sesion.login}</span>
            <span className="text-slate-400">·</span>
            <span className="capitalize text-slate-500">
              {sesion.rol.replaceAll("_", " ").toLowerCase()}
            </span>
          </div>
          <form action={cerrarSesionAccion}>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
