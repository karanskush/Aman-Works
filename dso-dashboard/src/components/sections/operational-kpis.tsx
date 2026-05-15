"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import {
  invoiceToCashInsight,
  creditPeriodUtilizationInsight,
  daysToClearBacklogInsight,
} from "@/lib/data";
import { useKPIData, useQuarterLabel } from "@/lib/use-kpi-data";
import { useDashboard } from "@/context/dashboard-context";
import { Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

function InvoiceToCashGauge() {
  const kpiData = useKPIData();
  const { p50, p90 } = kpiData.operational.invoiceToCash;

  return (
    <div className="flex items-center gap-6 justify-center py-2">
      <div className="text-center">
        <div className="text-xs text-muted mb-1">P50 (Median)</div>
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e6ed" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="#16a34a" strokeWidth="6"
              strokeDasharray={`${(p50 / Math.max(p90, 60)) * 213.6} 213.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-bold text-accent-green">{p50}</span>
        </div>
        <div className="text-xs text-accent-green mt-1">days</div>
      </div>

      <div className="h-16 w-px bg-border" />

      <div className="text-center">
        <div className="text-xs text-muted mb-1">P90 (Worst 10%)</div>
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e6ed" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="#dc2626" strokeWidth="6"
              strokeDasharray={`${(p90 / Math.max(p90, 60)) * 213.6} 213.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-bold text-accent-red">{p90}</span>
        </div>
        <div className="text-xs text-accent-red mt-1">days</div>
      </div>
    </div>
  );
}

function BacklogChart() {
  const kpiData = useKPIData();
  const data = kpiData.operational.daysToClearBacklog.weekly;

  if (data.length === 0) {
    return <div className="text-xs text-muted text-center py-8">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ed" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 12, color: "#1a1d23" }}
          formatter={(value) => [`${value} days`, "Backlog"]}
          labelStyle={{ color: "#6b7280" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.value > 5 ? "#dc2626" : d.value > 3 ? "#d97706" : "#16a34a"}
              fillOpacity={0.85}
            />
          ))}
          <LabelList dataKey="value" position="top" fill="#6b7280" fontSize={9} formatter={(v) => `${v}d`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function isOn(map: Record<string, boolean>, id: string): boolean {
  return map[id] !== false;
}

export function OperationalKPIs() {
  const kpiData = useKPIData();
  const quarterLabel = useQuarterLabel();
  const { kpiEnabled } = useDashboard();

  const tiles = [
    isOn(kpiEnabled, "basic-invoice-to-cash") && (
      <KPICard
        key="invoice-to-cash"
        title="Invoice to Cash Cycle Time"
        value=""
        insight={invoiceToCashInsight}
        compact
      >
        <InvoiceToCashGauge />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-credit-period-utilization") && (
      <KPICard
        key="cpu"
        title="Credit Period Utilization"
        value={kpiData.operational.creditPeriodUtilization.overall}
        suffix="%"
        valueLabel={quarterLabel}
        insight={creditPeriodUtilizationInsight}
        glowClass="glow-amber"
      >
        <MiniSparkline data={kpiData.operational.creditPeriodUtilization.monthly} color="#d97706" />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-days-to-clear-backlog") && (
      <KPICard
        key="backlog"
        title="Days to Clear Backlog"
        value=""
        insight={daysToClearBacklogInsight}
        compact
        className="md:col-span-2"
      >
        <BacklogChart />
      </KPICard>
    ),
  ].filter(Boolean);

  if (tiles.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Activity}
        title="Operational KPIs"
        subtitle="Process efficiency and backlog health metrics"
        iconColor="text-accent-purple"
      />
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        {tiles}
      </div>
    </section>
  );
}
