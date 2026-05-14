"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import {
  dsoInsight,
  overdueRatioInsight,
  revenueAtRiskInsight,
  receivablesTurnoverInsight,
  netARMovementInsight,
} from "@/lib/data";
import { useKPIData, useQuarterLabel } from "@/lib/use-kpi-data";
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

function WaterfallChart() {
  const kpiData = useKPIData();
  const data = kpiData.executive.netARMovement.monthly.map((d) => ({
    name: d.label,
    value: d.value,
    displayValue: formatCurrency(d.value),
  }));

  if (data.length === 0) {
    return <div className="text-xs text-muted text-center py-8">No data for this period</div>;
  }

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
          {data.map((d, index) => (
            <Cell key={index} fill={d.value >= 0 ? "#3b82f6" : "#dc2626"} fillOpacity={0.85} />
          ))}
          <LabelList dataKey="displayValue" position="top" fill="#1a1d23" fontSize={10} fontWeight={600} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExecutiveKPIs() {
  const kpiData = useKPIData();
  const quarterLabel = useQuarterLabel();
  const { executive } = kpiData;

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
          value={executive.dso.overall}
          suffix="days"
          valueLabel={quarterLabel}
          insight={dsoInsight}
          glowClass="glow-amber"
        >
          <MiniSparkline data={executive.dso.monthly} color="#d97706" />
        </KPICard>

        <KPICard
          title="Overdue Ratio"
          value={executive.overdueRatio.overall}
          suffix="%"
          valueLabel={quarterLabel}
          insight={overdueRatioInsight}
          glowClass="glow-red"
        >
          <MiniSparkline data={executive.overdueRatio.monthly} color="#dc2626" />
        </KPICard>

        <KPICard
          title="Revenue at Risk"
          value={executive.revenueAtRisk.value}
          suffix="%"
          insight={revenueAtRiskInsight}
          glowClass="glow-red"
        >
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 text-accent-red pulse-alert" />
            <span className="text-xs text-accent-red">of open AR at risk</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-red to-accent-amber transition-all duration-1000"
              style={{ width: `${Math.min(executive.revenueAtRisk.value, 100)}%` }}
            />
          </div>
        </KPICard>
      </div>

      {/* Row 2: Receivables Turnover + Net AR Movement */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Receivables Turnover Ratio"
          value={executive.receivablesTurnover.overall}
          suffix="x"
          valueLabel={quarterLabel}
          insight={receivablesTurnoverInsight}
          className="md:col-span-2"
        >
          <MiniSparkline data={executive.receivablesTurnover.monthly} color="#dc2626" />
        </KPICard>

        <KPICard
          title="Net AR Movement (Waterfall)"
          value=""
          insight={netARMovementInsight}
          compact
          className="md:col-span-3"
        >
          <WaterfallChart />
        </KPICard>
      </div>
    </section>
  );
}
