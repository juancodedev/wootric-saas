"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { NpsCalculation } from "@/lib/wootric/nps-utils";

type Props = Pick<NpsCalculation, "promoters" | "passives" | "detractors">;

const COLORS = { promoters: "#22c55e", passives: "#eab308", detractors: "#ef4444" };

export function NpsDonutChart({ promoters, passives, detractors }: Props) {
  const data = [
    { name: "Promoters", value: promoters.count, color: COLORS.promoters, pct: promoters.pct },
    { name: "Passives", value: passives.count, color: COLORS.passives, pct: passives.pct },
    { name: "Detractors", value: detractors.count, color: COLORS.detractors, pct: detractors.pct },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-zinc-500">NPS Breakdown</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e4e4e7" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs text-zinc-500">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name} {d.pct}%
          </div>
        ))}
      </div>
    </div>
  );
}
