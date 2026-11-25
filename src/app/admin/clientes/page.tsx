import { requerirRol } from "@/lib/session";
import { db, ok, uno } from "@/lib/supabase";
import Encabezado from "@/components/Encabezado";
import FormularioCliente from "@/components/FormularioCliente";
import SelectorEstadoCliente from "@/components/SelectorEstadoCliente";

export const dynamic = "force-dynamic";

type Fila = {
  id_cliente: number;
  nit: string;
  razon_social: string;
  estado: string;
  documento_compromiso: { nro_documento: string } | { nro_documento: string }[] | null;
  usuario: { login: string } | { login: string }[] | null;
};

export default async function ClientesPage() {
  const sesion = requerirRol("ADMINISTRADOR");
  const filas = ok(
    await db()
      .from("cliente")
      .select("id_cliente,nit,razon_social,estado,documento_compromiso(nro_documento),usuario(login)")
      .order("id_cliente", { ascending: false })
  ) as unknown as Fila[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Encabezado sesion={sesion} seccion="Administración · Clientes Mayoristas" />
      <FormularioCliente />

      <section className="caja mt-6">
        <div className="titulo-caja">
          <span>Clientes mayoristas registrados</span>
          <span className="text-xs font-medium text-slate-500">
            {filas.length} {filas.length === 1 ? "registrado" : "registrados"}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="tabla">
            <thead>
              <tr>
                <th>NIT</th>
                <th>Razón social</th>
                <th>Compromiso</th>
                <th>Usuario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    Aún no hay clientes registrados.
                  </td>
                </tr>
              )}
              {filas.map((c) => (
                <tr key={c.id_cliente}>
                  <td className="font-mono text-xs text-slate-600">{c.nit}</td>
                  <td className="font-medium text-slate-900">{c.razon_social}</td>
                  <td className="font-mono text-xs text-slate-600">{uno(c.documento_compromiso)?.nro_documento ?? "—"}</td>
                  <td className="font-mono text-xs text-slate-600">{uno(c.usuario)?.login ?? "—"}</td>
                  <td><SelectorEstadoCliente idCliente={c.id_cliente} estado={c.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
