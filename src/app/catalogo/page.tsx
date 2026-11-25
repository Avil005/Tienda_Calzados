import { requerirRol } from "@/lib/session";
import { db, ok, uno } from "@/lib/supabase";
import { param } from "@/lib/formato";
import Encabezado from "@/components/Encabezado";
import BotonMiPedido from "@/components/BotonMiPedido";
import TarjetaCalzado, { type CalzadoVista } from "@/components/TarjetaCalzado";

export const dynamic = "force-dynamic";

type Fila = {
  id_calzado: number;
  codigo_fabrica: string;
  color: string;
  numero: number;
  modelo: {
    codigo_modelo: string;
    descripcion: string;
    tipo_calzado: { nombre: string } | { nombre: string }[];
    marca: { nombre: string } | { nombre: string }[];
  };
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sesion = requerirRol("CLIENTE");
  const idCliente = sesion.idCliente ?? 0;

  const cliente = ok(
    await db().from("cliente").select("razon_social,estado").eq("id_cliente", idCliente).single()
  ) as { razon_social: string; estado: string };

  const filas = ok(
    await db()
      .from("calzado")
      .select("id_calzado,codigo_fabrica,color,numero,modelo(codigo_modelo,descripcion,tipo_calzado(nombre),marca(nombre))")
      .eq("estado", "ACTIVO")
      .order("codigo_fabrica")
  ) as unknown as Fila[];

  const todos: CalzadoVista[] = filas.map((f) => ({
    id: f.id_calzado,
    codigo: f.codigo_fabrica,
    marca: uno(f.modelo.marca)?.nombre ?? "",
    descripcion: f.modelo.descripcion,
    tipo: uno(f.modelo.tipo_calzado)?.nombre ?? "",
    modelo: f.modelo.codigo_modelo,
    color: f.color,
    numero: f.numero,
  }));

  const q = (param(searchParams.q) ?? "").trim().toLowerCase();
  const tipo = param(searchParams.tipo) ?? "";
  const marca = param(searchParams.marca) ?? "";
  const color = param(searchParams.color) ?? "";
  const numero = param(searchParams.numero) ?? "";

  const visibles = todos.filter(
    (c) =>
      (!q || [c.codigo, c.modelo, c.descripcion].some((t) => t.toLowerCase().includes(q))) &&
      (!tipo || c.tipo === tipo) &&
      (!marca || c.marca === marca) &&
      (!color || c.color === color) &&
      (!numero || String(c.numero) === numero)
  );

  const opciones = (f: (c: CalzadoVista) => string | number) =>
    Array.from(new Set(todos.map(f))).sort((a, b) => String(a).localeCompare(String(b), "es", { numeric: true }));

  const Select = ({ nombre, valor, lista }: { nombre: string; valor: string; lista: (string | number)[] }) => (
    <select name={nombre} defaultValue={valor} className="campo">
      <option value="">Todos</option>
      {lista.map((o) => (
        <option key={o} value={String(o)}>{o}</option>
      ))}
    </select>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Encabezado sesion={sesion} seccion="Catálogo Mayorista">
        <span className="hidden font-medium text-slate-700 sm:inline">{cliente.razon_social}</span>
        <BotonMiPedido idCliente={idCliente} />
      </Encabezado>

      {cliente.estado !== "ACTIVO" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
            !
          </span>
          <span>
            Su cuenta se encuentra en estado <strong>{cliente.estado}</strong>: puede explorar el catálogo pero no registrar pedidos.
          </span>
        </div>
      )}

      <form className="caja mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Filtros de búsqueda
          </h2>
          <span className="text-xs text-slate-400">
            {visibles.length} {visibles.length === 1 ? "producto" : "productos"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="etiqueta">Buscar código o modelo</label>
            <input name="q" defaultValue={param(searchParams.q) ?? ""} className="campo" placeholder="Ej. FAB-101, Sandalia..." />
          </div>
          <div><label className="etiqueta">Tipo</label><Select nombre="tipo" valor={tipo} lista={opciones((c) => c.tipo)} /></div>
          <div><label className="etiqueta">Marca</label><Select nombre="marca" valor={marca} lista={opciones((c) => c.marca)} /></div>
          <div><label className="etiqueta">Color</label><Select nombre="color" valor={color} lista={opciones((c) => c.color)} /></div>
          <div><label className="etiqueta">Talla</label><Select nombre="numero" valor={numero} lista={opciones((c) => c.numero)} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
          <button className="btn">Filtrar resultados</button>
          <a href="/catalogo" className="btn-sec">Limpiar</a>
        </div>
      </form>

      {visibles.length === 0 ? (
        <div className="caja-punteada py-10 text-center">
          No se encontraron calzados con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visibles.map((c) => (
            <TarjetaCalzado key={c.id} idCliente={idCliente} calzado={c} puedeAgregar={cliente.estado === "ACTIVO"} />
          ))}
        </div>
      )}
    </main>
  );
}
