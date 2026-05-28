"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

type Props = { data: { date: string; count: number }[] };

export function VolumeChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-zinc-500">Response Volume</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ bottom: 0, left: -10, right: 0 }}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#71717a" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(value: unknown) => [value, "responses"] as [string, string]}
          />
          <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
