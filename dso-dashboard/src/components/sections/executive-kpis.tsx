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
  LabelList,
} from "recharts";

const waterfallColors = ["#3b82f6", "#60a5fa", "#3b82f6"];

function WaterfallChart() {
  const data = netARMovementData.monthly.map((d) => ({
    name: d.label,
    value: d.value,
    displayValue: formatCurrency(d.value),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 24, right: 10, bottom: 0, left: 10 }}>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e2e6ed",
            borderRadius: 8,
            fontSize: 12,
            color: "#1a1d23",
          }}
          formatter={(value) => [`${formatCurrency(value as number)}`, "Net AR"]}
          labelStyle={{ color: "#6b7280" }}
        />
        <ReferenceLine y={0} stroke="#e2e6ed" />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((_, index) => (
            <Cell key={index} fill={waterfallColors[index]} fillOpacity={0.85} />
          ))}
          <LabelList dataKey="displayValue" position="top" fill="#1a1d23" fontSize={10} fontWeight={600} />
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

      {/* Row 1: DSO, Overdue Ratio, Revenue at Risk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <KPICard
          title="Days Sales Outstanding"
          value={dsoData.overall}
          suffix="days"
          valueLabel="Overall Avg (Q1 2026)"
          insight={dsoData.insight}
          glowClass="glow-amber"
        >
          <MiniSparkline data={dsoData.monthly} color="#d97706" />
        </KPICard>

        <KPICard
          title="Overdue Ratio"
          value={overdueRatioData.overall}
          suffix="%"
          valueLabel="Overall Avg (Q1 2026)"
          insight={overdueRatioData.insight}
          glowClass="glow-red"
        >
          <MiniSparkline data={overdueRatioData.monthly} color="#dc2626" />
        </KPICard>

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

      {/* Row 2: Receivables Turnover + Net AR Movement */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Receivables Turnover Ratio"
          value={receivablesTurnoverData.overall}
          suffix="x"
          valueLabel="Overall Avg (Q1 2026)"
          insight={receivablesTurnoverData.insight}
          className="md:col-span-2"
        >
          <MiniSparkline data={receivablesTurnoverData.monthly} color="#dc2626" />
        </KPICard>

        <KPICard
          title="Net AR Movement (Waterfall)"
          value=""
          insight={netARMovementData.insight}
          compact
          className="md:col-span-3"
        >
          <WaterfallChart />
        </KPICard>
      </div>
    </section>
  );
}
