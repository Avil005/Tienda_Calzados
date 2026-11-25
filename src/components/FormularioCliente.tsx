"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  registrarClienteAccion,
  type ResultadoRegistro,
} from "@/app/admin/clientes/actions";

export default function FormularioCliente() {
  const router = useRouter();
  const [pendiente, setPendiente] = useState(false);
  const [resultado, setResultado] = useState<ResultadoRegistro | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPendiente(true);
    const r = await registrarClienteAccion(new FormData(form));
    setResultado(r);
    setPendiente(false);
    if (r.ok) {
      form.reset();
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={enviar} className="caja space-y-4">
        <div className="titulo-caja">
          <span>Alta de cliente avalado</span>
          <span className="etq bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            Estado: Activo
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta" htmlFor="nit">NIT *</label>
            <input id="nit" name="nit" className="campo" placeholder="Ej: 4589210019" required />
          </div>
          <div>
            <label className="etiqueta" htmlFor="telefono">Teléfono *</label>
            <input id="telefono" name="telefono" className="campo" placeholder="Ej: 77012345" required />
          </div>
        </div>
        <div>
          <label className="etiqueta" htmlFor="razonSocial">Razón Social *</label>
          <input id="razonSocial" name="razonSocial" className="campo" placeholder="Ej: Zapatería Pasitos S.R.L." required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="direccion">Dirección Comercial *</label>
          <input id="direccion" name="direccion" className="campo" placeholder="Av. Banzer 3er Anillo..." required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="correo">Correo Electrónico *</label>
          <input id="correo" name="correo" type="email" className="campo" placeholder="compras@zapateria.bo" required />
        </div>
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <legend className="px-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Documento de compromiso firmado
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="etiqueta" htmlFor="nroDocumento">Nro. Documento *</label>
              <input id="nroDocumento" name="nroDocumento" className="campo" placeholder="COMP-2026-004" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="fechaFirma">Fecha de Firma *</label>
              <input id="fechaFirma" name="fechaFirma" type="date" className="campo" required />
            </div>
          </div>
        </fieldset>
        {resultado && !resultado.ok && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {resultado.error}
          </p>
        )}
        <button className="btn w-full" disabled={pendiente}>
          {pendiente ? "Registrando cliente..." : "Registrar y generar credenciales"}
        </button>
      </form>

      <section className="caja self-start">
        <div className="titulo-caja">
          <span>Credenciales generadas</span>
          <span className="etq bg-slate-900 text-white">Acceso inmediato</span>
        </div>
        {resultado && resultado.ok ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              Cliente registrado correctamente: <strong>{resultado.razonSocial}</strong>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Usuario asignado
                </div>
                <div className="mt-1 font-mono text-base font-bold text-slate-900">
                  {resultado.login}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Contraseña temporal
                </div>
                <div className="mt-1 font-mono text-base font-bold text-rose-600">
                  {resultado.clave}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Entregue estas credenciales al cliente ahora: la contraseña se almacena cifrada y no volverá a mostrarse.
            </p>
          </div>
        ) : (
          <div className="caja-punteada py-8 text-center">
            Aquí aparecerán el usuario y la contraseña temporal una vez que registre un nuevo cliente.
          </div>
        )}
      </section>
    </div>
  );
}
