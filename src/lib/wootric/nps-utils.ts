export type NpsCalculation = {
  npsScore: number;
  promoters: { count: number; pct: number };
  passives: { count: number; pct: number };
  detractors: { count: number; pct: number };
  total: number;
  averageScore: number;
};

export type ScoreDistribution = { score: number; count: number }[];

export type DailyTrend = { date: string; avgScore: number; count: number }[];

export function calculateNps(responses: { score?: number; created_at: string }[]): NpsCalculation {
  const total = responses.length;
  const promoters = responses.filter((r) => r.score != null && r.score >= 9).length;
  const passives = responses.filter((r) => r.score != null && r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter((r) => r.score != null && r.score <= 6).length;

  return {
    npsScore: total > 0 ? Math.round(((promoters / total) - (detractors / total)) * 100) : 0,
    promoters: { count: promoters, pct: total > 0 ? Math.round((promoters / total) * 100) : 0 },
    passives: { count: passives, pct: total > 0 ? Math.round((passives / total) * 100) : 0 },
    detractors: { count: detractors, pct: total > 0 ? Math.round((detractors / total) * 100) : 0 },
    total,
    averageScore: total > 0 ? responses.reduce((s, r) => s + (r.score ?? 0), 0) / total : 0,
  };
}

export function calculateDistribution(responses: { score?: number }[]): ScoreDistribution {
  const buckets: Record<number, number> = {};
  for (let i = 0; i <= 10; i++) buckets[i] = 0;
  for (const r of responses) {
    if (r.score != null) {
      const key = r.score;
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
  }
  return Array.from({ length: 11 }, (_, i) => ({ score: i, count: buckets[i] ?? 0 }));
}

export function calculateDailyTrend(responses: { score?: number; created_at: string }[]): DailyTrend {
  const byDay: Record<string, { total: number; count: number }> = {};

  for (const r of responses) {
    if (r.score == null) continue;
    const day = r.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
    byDay[day].total += r.score;
    byDay[day].count++;
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, count }]) => ({
      date,
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    }));
}

export function calculateVolumeTrend(responses: { created_at: string }[]): { date: string; count: number }[] {
  const byDay: Record<string, number> = {};
  for (const r of responses) {
    const day = r.created_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

const NPS_COLORS = { promoters: "#22c55e", passives: "#eab308", detractors: "#ef4444" };

export function getNpsColor(score: number): string {
  if (score >= 9) return NPS_COLORS.promoters;
  if (score >= 7) return NPS_COLORS.passives;
  return NPS_COLORS.detractors;
}

export { NPS_COLORS };
