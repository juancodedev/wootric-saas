"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/auth-client";
import { ExportModal } from "@/components/wootric/export-modal";
import { DashboardCharts } from "@/components/wootric/dashboard-charts";
import type { WootricResponseItem } from "@/application/services/WootricService";

type WootricResponse = WootricResponseItem;

type LocalResult = {
  data: WootricResponse[];
  meta: {
    totalCount: number;
    page: number;
    totalPages: number;
    nextPage: number | null;
  };
  source: "local" | "empty";
};

type FetchResult = {
  source: "fetched";
  recordsSynced: number;
};

const PAGE_SIZES = [10, 25, 50];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function getScoreColor(score?: number): string {
  if (score === undefined) return "bg-zinc-100 text-zinc-500";
  if (score >= 9) return "bg-green-100 text-green-700";
  if (score >= 7) return "bg-lime-100 text-lime-700";
  if (score >= 4) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

async function queryLocal(startDate: string, endDate: string, page: number, perPage: number): Promise<LocalResult> {
  return apiFetch<LocalResult>("/api/wootric/local", {
    method: "POST",
    body: JSON.stringify({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate + "T23:59:59").toISOString(),
      page,
      perPage,
    }),
  });
}

async function fetchFromWootric(startDate: string, endDate: string): Promise<FetchResult> {
  return apiFetch<FetchResult>("/api/wootric/fetch", {
    method: "POST",
    body: JSON.stringify({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate + "T23:59:59").toISOString(),
    }),
  });
}

export default function DataExplorerPage() {
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(today());
  const [perPage, setPerPage] = useState(25);
  const [data, setData] = useState<WootricResponse[]>([]);
  const [meta, setMeta] = useState<LocalResult["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [tab, setTab] = useState<"data" | "analytics">("data");
  const [allResponses, setAllResponses] = useState<WootricResponse[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Load local data on mount and when date range or pagination changes
  const loadLocalData = useCallback(async (pageNum: number) => {
    try {
      const local = await queryLocal(startDate, endDate, pageNum, perPage);
      setData(local.data);
      setMeta(local.meta);
      setPage(pageNum);
      setHasLocalData(local.source === "local");
    } catch {
      // Silently fail — user can click Fetch Data
    }
  }, [startDate, endDate, perPage]);

  // Initial load on mount + reload when date range changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocalData(1);
  }, [startDate, endDate, perPage, loadLocalData]);

  const fetchData = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError("");
    setNotConfigured(false);
    try {
      await fetchFromWootric(startDate, endDate);
      const local = await queryLocal(startDate, endDate, pageNum, perPage);
      setData(local.data);
      setMeta(local.meta);
      setPage(pageNum);
      setHasLocalData(local.source === "local");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch";
      if (msg.includes("not configured")) setNotConfigured(true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, perPage]);

  const loadAllForAnalytics = useCallback(async () => {
    setLoadingAll(true);
    try {
      const local = await queryLocal(startDate, endDate, 1, 9999);
      setAllResponses(local.data);
    } catch {
      // ignore
    } finally {
      setLoadingAll(false);
    }
  }, [startDate, endDate]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Data Explorer</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Consulta y visualiza respuestas de encuestas de Wootric.
          {hasLocalData && (
            <span className="ml-2 text-xs text-zinc-400">(datos locales)</span>
          )}
        </p>
      </div>

      {notConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Wootric no está configurado.{" "}
          <a href="/dashboard/settings/wootric" className="font-medium underline">
            Configurar ahora
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500">Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500">Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500">Por p&aacute;gina</label>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => fetchData(1)}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Fetch Data"}
        </button>

        {meta && tab === "data" && (
          <button
            onClick={() => setShowExport(true)}
            className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Export
          </button>
        )}
      </div>

      {error && !notConfigured && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-zinc-100 p-1">
        <button
          onClick={() => setTab("data")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "data" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          📋 Data
        </button>
        <button
          onClick={() => {
            setTab("analytics");
            if (allResponses.length === 0 && !loadingAll) {
              loadAllForAnalytics();
            }
          }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "analytics" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          📊 Analytics
        </button>
      </div>

      {/* Data Tab */}
      {tab === "data" && (
        <>
          {meta && (
            <div className="flex items-center justify-between text-sm text-zinc-700">
              <span>
                {meta.totalCount} responses — Page {meta.page} of {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadLocalData(page - 1)}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadLocalData(page + 1)}
                  disabled={page >= (meta?.totalPages ?? 1) || loading}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {data.length > 0 && (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50 text-xs font-medium uppercase text-zinc-600">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Survey</th>
                    <th className="px-4 py-3">Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {r.score !== undefined ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getScoreColor(r.score)}`}>
                            {r.score}
                          </span>
                        ) : (
                          <span className="text-zinc-400">&mdash;</span>
                        )}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-zinc-900">
                        {r.text || <span className="text-zinc-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {r.email || <span className="text-zinc-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        #{r.survey_id}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-zinc-700">
                        {r.origin_url ? (
                          <a href={r.origin_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                            {new URL(r.origin_url).hostname}
                          </a>
                        ) : (
                          <span className="text-zinc-400">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && data.length === 0 && !error && (
            <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-500">
              No hay datos locales para este rango. Haz clic en &quot;Fetch Data&quot; para sincronizar desde Wootric.
            </div>
          )}
        </>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <>
          {loadingAll && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
                <p className="text-sm text-zinc-500">Cargando datos locales...</p>
              </div>
            </div>
          )}

          {!loadingAll && allResponses.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Analizando {allResponses.length} respuestas del {startDate} al {endDate}
              </p>
              <button
                onClick={loadAllForAnalytics}
                className="rounded-lg border px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Recargar
              </button>
            </div>
          )}

          {!loadingAll && allResponses.length > 0 && (
            <DashboardCharts responses={allResponses} />
          )}

          {!loadingAll && allResponses.length === 0 && !error && (
            <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-500">
              No hay datos locales para este rango. Primero sincroniza desde la vista Data.
            </div>
          )}
        </>
      )}

      {showExport && (
        <ExportModal
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
