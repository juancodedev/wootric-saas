"use client";

import { useState } from "react";

type Props = {
  startDate: string;
  endDate: string;
  onClose: () => void;
};

export function ExportModal({ startDate, endDate, onClose }: Props) {
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch("/api/wootric/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
          format,
        }),
      });

      if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body && typeof body === "object" && "error" in body) {
          errorMsg = (body as { error: string }).error;
        }
      } catch {}
      throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const ext = format === "csv" ? "csv" : "xlsx";
      const filename = `wootric-responses-${new Date().toISOString().slice(0, 10)}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">Export Responses</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Download Wootric responses as {format === "csv" ? "CSV" : "Excel"}.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setFormat("csv")}
            className={`flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors ${
              format === "csv"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <div className="text-lg">📄</div>
            CSV
          </button>
          <button
            onClick={() => setFormat("excel")}
            className={`flex-1 rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors ${
              format === "excel"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <div className="text-lg">📊</div>
            Excel
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={exporting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
