"use client";

import type { WootricResponseItem } from "@/application/services/WootricService";
import {
  calculateNps,
  calculateDistribution,
  calculateDailyTrend,
  calculateVolumeTrend,
} from "@/lib/wootric/nps-utils";
import { NpsScoreCard } from "./nps-score-card";
import { ScoreDistributionChart } from "./score-distribution-chart";
import { NpsDonutChart } from "./nps-donut-chart";
import { TrendChart } from "./trend-chart";
import { VolumeChart } from "./volume-chart";

type Props = {
  responses: WootricResponseItem[];
};

export function DashboardCharts({ responses }: Props) {
  if (responses.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-500">
        No data to chart. Fetch responses first.
      </div>
    );
  }

  const nps = calculateNps(responses);
  const distribution = calculateDistribution(responses);
  const trend = calculateDailyTrend(responses);
  const volume = calculateVolumeTrend(responses);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <NpsScoreCard {...nps} />
        <ScoreDistributionChart data={distribution} />
        <NpsDonutChart promoters={nps.promoters} passives={nps.passives} detractors={nps.detractors} />
        <VolumeChart data={volume} />
      </div>
      <TrendChart data={trend} />
    </div>
  );
}
