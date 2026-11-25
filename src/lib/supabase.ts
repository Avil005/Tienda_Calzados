import { createClient } from "@supabase/supabase-js";

/** Cliente de servidor con service_role. NUNCA importar desde componentes "use client". */
export function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function ok<T>(r: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function rpc<T = unknown>(
  fn: string,
  args: Record<string, unknown>
): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** PostgREST devuelve objeto o arreglo según la relación; normaliza a un objeto. */
export function uno<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}
