"use client";

import { Suspense } from "react";
import type { NpsCalculation, ScoreDistribution, DailyTrend } from "@/lib/wootric/nps-utils";
import { NpsScoreCard } from "./nps-score-card";
import dynamic from "next/dynamic";

const ScoreDistributionChart = dynamic(
  () => import("./score-distribution-chart").then((m) => m.ScoreDistributionChart),
  { ssr: false },
);
const NpsDonutChart = dynamic(
  () => import("./nps-donut-chart").then((m) => m.NpsDonutChart),
  { ssr: false },
);
const TrendChart = dynamic(
  () => import("./trend-chart").then((m) => m.TrendChart),
  { ssr: false },
);
const VolumeChart = dynamic(
  () => import("./volume-chart").then((m) => m.VolumeChart),
  { ssr: false },
);

function ChartFallback() {
  return (
    <div className="flex items-center justify-center rounded-xl border bg-white p-5 shadow-sm h-[220px]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
    </div>
  );
}

export type AnalyticsData = {
  nps: NpsCalculation;
  distribution: ScoreDistribution;
  trend: DailyTrend;
  volume: { date: string; count: number }[];
  totalCount: number;
};

type Props = {
  data: AnalyticsData;
};

export function DashboardCharts({ data }: Props) {
  if (data.totalCount === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-500">
        No data to chart. Fetch responses first.
      </div>
    );
  }

  const { nps, distribution, trend, volume } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <NpsScoreCard {...nps} />
        <Suspense fallback={<ChartFallback />}>
          <ScoreDistributionChart data={distribution} />
        </Suspense>
        <Suspense fallback={<ChartFallback />}>
          <NpsDonutChart promoters={nps.promoters} passives={nps.passives} detractors={nps.detractors} />
        </Suspense>
        <Suspense fallback={<ChartFallback />}>
          <VolumeChart data={volume} />
        </Suspense>
      </div>
      <Suspense fallback={<ChartFallback />}>
        <TrendChart data={trend} />
      </Suspense>
    </div>
  );
}
