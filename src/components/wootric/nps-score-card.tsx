"use client";

import type { NpsCalculation } from "@/lib/wootric/nps-utils";

type Props = NpsCalculation;

export function NpsScoreCard(nps: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-500">NPS Score</h3>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-4xl font-bold ${
            nps.npsScore >= 50
              ? "text-green-600"
              : nps.npsScore >= 0
                ? "text-yellow-500"
                : "text-red-500"
          }`}
        >
          {nps.npsScore}
        </span>
        <span className="text-sm text-zinc-400">
          de {nps.total} respuestas
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-lg font-bold text-green-700">{nps.promoters.count}</div>
          <div className="text-xs text-green-600">Promoters</div>
          <div className="text-xs text-green-500">{nps.promoters.pct}%</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-center">
          <div className="text-lg font-bold text-yellow-700">{nps.passives.count}</div>
          <div className="text-xs text-yellow-600">Passives</div>
          <div className="text-xs text-yellow-500">{nps.passives.pct}%</div>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <div className="text-lg font-bold text-red-700">{nps.detractors.count}</div>
          <div className="text-xs text-red-600">Detractors</div>
          <div className="text-xs text-red-500">{nps.detractors.pct}%</div>
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-zinc-400">
        Score promedio: {nps.averageScore.toFixed(1)}
      </div>
    </div>
  );
}
