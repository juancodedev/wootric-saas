"use client";

export default function ExportsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Exportaciones</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Descargá respuestas de Wootric desde el Data Explorer.
        </p>
      </div>

      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center">
        <p className="text-zinc-500">
          No hay exportaciones aún. Andá a{" "}
          <a href="/dashboard/data" className="font-medium text-blue-600 hover:underline">
            Data Explorer
          </a>
          , seleccioná un rango de fechas y hace clic en "Export".
        </p>
      </div>
    </div>
  );
}
