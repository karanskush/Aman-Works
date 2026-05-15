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
import { useDashboard } from "@/context/dashboard-context";
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

function isOn(map: Record<string, boolean>, id: string): boolean {
  return map[id] !== false;
}

export function ExecutiveKPIs() {
  const kpiData = useKPIData();
  const quarterLabel = useQuarterLabel();
  const { kpiEnabled } = useDashboard();
  const { executive } = kpiData;

  const tiles = [
    isOn(kpiEnabled, "basic-dso") && (
      <KPICard
        key="dso"
        kpiId="basic-dso"
        title="DSO"
        value={executive.dso.overall.toFixed(1)}
        suffix="%"
        valueLabel={`Avg AR / Credit Sales · ${quarterLabel}`}
        insight={dsoInsight}
        glowClass="glow-amber"
      >
        <MiniSparkline data={executive.dso.monthly} color="#d97706" />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-overdue-ratio") && (
      <KPICard
        key="overdue-ratio"
        kpiId="basic-overdue-ratio"
        title="Overdue Ratio"
        value={executive.overdueRatio.overall}
        suffix="%"
        valueLabel={quarterLabel}
        insight={overdueRatioInsight}
        glowClass="glow-red"
      >
        <MiniSparkline data={executive.overdueRatio.monthly} color="#dc2626" />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-revenue-at-risk") && (
      <KPICard
        key="revenue-at-risk"
        kpiId="basic-revenue-at-risk"
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
    ),
    isOn(kpiEnabled, "basic-receivables-turnover") && (
      <KPICard
        key="receivables-turnover"
        kpiId="basic-receivables-turnover"
        title="Receivables Turnover Ratio"
        value={executive.receivablesTurnover.overall}
        suffix="x"
        valueLabel={quarterLabel}
        insight={receivablesTurnoverInsight}
      >
        <MiniSparkline data={executive.receivablesTurnover.monthly} color="#dc2626" />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-net-ar-movement") && (
      <KPICard
        key="net-ar-movement"
        kpiId="basic-net-ar-movement"
        title="Net AR Movement (Waterfall)"
        value=""
        insight={netARMovementInsight}
        compact
        className="md:col-span-2"
      >
        <WaterfallChart />
      </KPICard>
    ),
  ].filter(Boolean);

  if (tiles.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={BarChart3}
        title="Executive KPIs"
        subtitle="C-suite visibility into receivables health"
      />
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {tiles}
      </div>
    </section>
  );
}
