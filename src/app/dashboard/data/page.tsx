"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/auth-client";

type WootricResponse = {
  id: number;
  survey_id: number;
  email?: string;
  score?: number;
  comment?: string;
  origin_url?: string;
  created_at: string;
  updated_at?: string;
  segment?: string;
  ip_address?: string;
  properties?: Record<string, string>;
};

type FetchMeta = {
  totalCount: number;
  page: number;
  totalPages: number;
  nextPage: number | null;
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

export default function DataExplorerPage() {
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(today());
  const [perPage, setPerPage] = useState(25);
  const [data, setData] = useState<WootricResponse[]>([]);
  const [meta, setMeta] = useState<FetchMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  const fetchData = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError("");
    setNotConfigured(false);
    try {
      const result = await apiFetch<{
        data: WootricResponse[];
        meta: FetchMeta;
      }>("/api/wootric/fetch", {
        method: "POST",
        body: JSON.stringify({
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
          page: pageNum,
          perPage,
        }),
      });
      setData(result.data);
      setMeta(result.meta);
      setPage(pageNum);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch";
      if (msg.includes("not configured")) {
        setNotConfigured(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, perPage]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Data Explorer</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Consulta respuestas de encuestas de Wootric.
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
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500">Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500">Por página</label>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          {loading ? "Fetching..." : "Fetch Data"}
        </button>
      </div>

      {error && !notConfigured && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {meta && (
        <div className="flex items-center justify-between text-sm text-zinc-700">
          <span>
            {meta.totalCount} responses — Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchData(page + 1)}
              disabled={page >= meta.totalPages || loading}
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
              <tr className="border-b bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
                <th className="px-4 py-3 text-zinc-600">Date</th>
                <th className="px-4 py-3 text-zinc-600">Score</th>
                <th className="px-4 py-3 text-zinc-600">Comment</th>
                <th className="px-4 py-3 text-zinc-600">Email</th>
                <th className="px-4 py-3 text-zinc-600">Survey</th>
                <th className="px-4 py-3 text-zinc-600">Segment</th>
                <th className="px-4 py-3 text-zinc-600">Origin</th>
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
                    {r.comment || <span className="text-zinc-400">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">
                    {r.email || <span className="text-zinc-400">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">
                    #{r.survey_id}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">
                    {r.segment || <span className="text-zinc-400">&mdash;</span>}
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
        <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400">
          No data yet. Select a date range and click "Fetch Data".
        </div>
      )}
    </div>
  );
}
