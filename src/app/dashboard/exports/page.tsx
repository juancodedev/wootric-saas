"use client";

export default function ExportsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Exportaciones
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Historial de exportaciones de datos descargadas.
        </p>
      </div>

      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400">
        Próximamente — Historial de exportaciones
      </div>
    </div>
  );
}
