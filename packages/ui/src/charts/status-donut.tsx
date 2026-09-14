"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, type TooltipProps } from "recharts";

export interface StatusDonutProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  className?: string;
}

const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

function DonutTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-background p-3 text-xs shadow-md">
      <p className="font-medium">{item.name}</p>
      <p className="tabular-nums" style={{ color: item.payload.color }}>
        {item.value} ({((item.payload.percent ?? 0) * 100).toFixed(1)}%)
      </p>
    </div>
  );
}

export function StatusDonut({ data, height = 240, className }: StatusDonutProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
