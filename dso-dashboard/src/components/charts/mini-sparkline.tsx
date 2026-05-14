"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, LabelList } from "recharts";

interface MiniSparklineProps {
  data: { month?: string; week?: string; value: number }[];
  color?: string;
  height?: number;
  xKey?: string;
}

export function MiniSparkline({ data, color = "#3b82f6", height = 90, xKey = "month" }: MiniSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e2e6ed",
            borderRadius: 8,
            fontSize: 12,
            color: "#1a1d23",
          }}
          labelStyle={{ color: "#6b7280" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace("#", "")})`}
          dot={{ r: 3, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
        >
          <LabelList dataKey="value" position="top" fill="#1a1d23" fontSize={10} fontWeight={600} offset={8} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
