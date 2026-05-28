"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getNpsColor } from "@/lib/wootric/nps-utils";
import type { ScoreDistribution } from "@/lib/wootric/nps-utils";

type Props = { data: ScoreDistribution };

export function ScoreDistributionChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-zinc-500">Score Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ bottom: 0, left: -10, right: 0 }}>
          <XAxis
            dataKey="score"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#71717a" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#71717a" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(value: unknown) => [value, "responses"] as [string, string]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry) => (
              <Cell key={entry.score} fill={getNpsColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
