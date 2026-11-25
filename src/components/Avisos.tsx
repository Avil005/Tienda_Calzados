export default function Avisos({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={
        "mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium " +
        (error
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800")
      }
    >
      <span
        className={
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
          (error ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800")
        }
      >
        {error ? "!" : "✓"}
      </span>
      <span>{error ?? ok}</span>
    </div>
  );
}
