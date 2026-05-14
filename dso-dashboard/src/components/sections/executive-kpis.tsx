"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import {
  dsoData,
  overdueRatioData,
  revenueAtRiskData,
  receivablesTurnoverData,
  netARMovementData,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const waterfallColors = ["#58a6ff", "#79c0ff", "#58a6ff"];

function WaterfallChart() {
  const data = netARMovementData.monthly.map((d) => ({
    name: d.label,
    value: d.value,
    displayValue: formatCurrency(d.value),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8b949e", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8b949e", fontSize: 11 }}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            background: "#0d1117",
            border: "1px solid #1e2a3a",
            borderRadius: 8,
            fontSize: 12,
            color: "#e4e8ef",
          }}
          formatter={(value) => [`${formatCurrency(value as number)}`, "Net AR"]}
          labelStyle={{ color: "#8b949e" }}
        />
        <ReferenceLine y={0} stroke="#1e2a3a" />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((_, index) => (
            <Cell key={index} fill={waterfallColors[index]} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExecutiveKPIs() {
  return (
    <section>
      <SectionHeader
        icon={BarChart3}
        title="Executive KPIs"
        subtitle="C-suite visibility into receivables health"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        {/* DSO */}
        <KPICard
          title="Days Sales Outstanding"
          value={dsoData.overall}
          suffix="days"
          insight={dsoData.insight}
          glowClass="glow-amber"
        >
          <MiniSparkline data={dsoData.monthly} color="#d29922" />
        </KPICard>

        {/* Overdue Ratio */}
        <KPICard
          title="Overdue Ratio"
          value={overdueRatioData.overall}
          suffix="%"
          insight={overdueRatioData.insight}
          glowClass="glow-red"
        >
          <MiniSparkline data={overdueRatioData.monthly} color="#f85149" />
        </KPICard>

        {/* Revenue at Risk */}
        <KPICard
          title="Revenue at Risk"
          value={revenueAtRiskData.value}
          suffix="%"
          insight={revenueAtRiskData.insight}
          glowClass="glow-red"
        >
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 text-accent-red pulse-alert" />
            <span className="text-xs text-accent-red">{revenueAtRiskData.changeLabel}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-red to-accent-amber transition-all duration-1000"
              style={{ width: `${revenueAtRiskData.value}%` }}
            />
          </div>
        </KPICard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receivables Turnover */}
        <KPICard
          title="Receivables Turnover Ratio"
          value={receivablesTurnoverData.overall}
          suffix="x"
          insight={receivablesTurnoverData.insight}
        >
          <MiniSparkline data={receivablesTurnoverData.monthly} color="#f85149" />
        </KPICard>

        {/* Net AR Movement — Waterfall */}
        <KPICard
          title="Net AR Movement (Waterfall)"
          value=""
          insight={netARMovementData.insight}
          compact
        >
          <WaterfallChart />
        </KPICard>
      </div>
    </section>
  );
}
