"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { CompositionItem } from "@/types";

const COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#e11d48", // rose
  "#84cc16", // lime
  "#a855f7", // purple
];

interface Props {
  compositions: CompositionItem[];
}

export function CompositionPieChart({ compositions }: Props) {
  const data = compositions.map((c, i) => ({
    name: `${c.asset.symbol}`,
    displayName: c.asset.displayName,
    description: c.asset.description,
    value: c.weight * 100,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="pie-tooltip max-w-[220px]">
                  <p className="text-sm font-semibold text-gray-100">
                    {d.displayName}{" "}
                    <span className="text-gray-400 font-normal">({d.name})</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {d.description}
                  </p>
                  <p className="text-sm font-mono text-brand-400 mt-1.5">
                    {d.value.toFixed(1)}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
