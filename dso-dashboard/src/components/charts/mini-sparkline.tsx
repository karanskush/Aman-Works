"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

interface MiniSparklineProps {
  data: { month?: string; week?: string; value: number }[];
  color?: string;
  height?: number;
  xKey?: string;
}

export function MiniSparkline({ data, color = "#58a6ff", height = 60, xKey = "month" }: MiniSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} hide />
        <Tooltip
          contentStyle={{
            background: "#0d1117",
            border: "1px solid #1e2a3a",
            borderRadius: 8,
            fontSize: 12,
            color: "#e4e8ef",
          }}
          labelStyle={{ color: "#8b949e" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace("#", "")})`}
          dot={{ r: 3, fill: color, stroke: "#0d1117", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color, stroke: "#0d1117", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
