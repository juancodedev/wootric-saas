"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DailyTrend } from "@/lib/wootric/nps-utils";

type Props = { data: DailyTrend };

export function TrendChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-zinc-500">Score Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ bottom: 0, left: -10, right: 0 }}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            domain={[0, 10]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#71717a" }}
          />
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(value: unknown) => [(Number(value) || 0).toFixed(1), "avg score"] as [string, string]}
          />
          <Line
            type="monotone"
            dataKey="avgScore"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
