"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import {
  invoiceToCashData,
  creditPeriodUtilizationData,
  daysToClearBacklogData,
} from "@/lib/data";
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
  return (
    <div className="flex items-center gap-6 justify-center py-2">
      <div className="text-center">
        <div className="text-xs text-muted mb-1">P50 (Median)</div>
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1e2a3a" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="#3fb950" strokeWidth="6"
              strokeDasharray={`${(8 / 30) * 213.6} 213.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-bold text-accent-green">{invoiceToCashData.p50}</span>
        </div>
        <div className="text-xs text-accent-green mt-1">days</div>
      </div>

      <div className="h-16 w-px bg-border" />

      <div className="text-center">
        <div className="text-xs text-muted mb-1">P90 (Worst 10%)</div>
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1e2a3a" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="#f85149" strokeWidth="6"
              strokeDasharray={`${(30 / 60) * 213.6} 213.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-bold text-accent-red">{invoiceToCashData.p90}</span>
        </div>
        <div className="text-xs text-accent-red mt-1">days</div>
      </div>
    </div>
  );
}

function BacklogChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={daysToClearBacklogData.weekly} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12, color: "#e4e8ef" }}
          formatter={(value) => [`${value} days`, "Backlog"]}
          labelStyle={{ color: "#8b949e" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {daysToClearBacklogData.weekly.map((d, i) => (
            <Cell
              key={i}
              fill={d.value > 5 ? "#f85149" : d.value > 3 ? "#d29922" : "#3fb950"}
              fillOpacity={0.8}
            />
          ))}
          <LabelList dataKey="value" position="top" fill="#8b949e" fontSize={9} formatter={(v) => `${v}d`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OperationalKPIs() {
  return (
    <section>
      <SectionHeader
        icon={Activity}
        title="Operational KPIs"
        subtitle="Process efficiency and backlog health metrics"
        iconColor="text-accent-purple"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Invoice to Cash Cycle */}
        <KPICard
          title="Invoice to Cash Cycle Time"
          value=""
          insight={invoiceToCashData.insight}
          compact
        >
          <InvoiceToCashGauge />
        </KPICard>

        {/* Credit Period Utilization */}
        <KPICard
          title="Credit Period Utilization"
          value={creditPeriodUtilizationData.overall}
          suffix="%"
          valueLabel="Overall Avg (Q1 2026)"
          insight={creditPeriodUtilizationData.insight}
          glowClass="glow-amber"
        >
          <MiniSparkline data={creditPeriodUtilizationData.monthly} color="#d29922" />
        </KPICard>

        {/* Days to Clear Backlog */}
        <KPICard
          title="Days to Clear Backlog"
          value=""
          insight={daysToClearBacklogData.insight}
          compact
        >
          <BacklogChart />
        </KPICard>
      </div>
    </section>
  );
}
