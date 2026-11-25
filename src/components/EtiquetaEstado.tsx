export default function EtiquetaEstado({ estado }: { estado: string }) {
  const texto = estado.replaceAll("_", " ");
  const estilos: Record<string, string> = {
    REGISTRADO: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    EN_ANALISIS: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
    PENDIENTE_STOCK: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25",
    CONFIRMADO: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    DESPACHADO: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    ENTREGADO: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600/20",
    CANCELADO: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    ACTIVO: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    SUSPENDIDO: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    INACTIVO: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
  };

  return (
    <span className={`etq ${estilos[estado] ?? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20"}`}>
      {texto}
    </span>
  );
}
