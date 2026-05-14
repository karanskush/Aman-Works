"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import {
  ceiData,
  onTimePaymentData,
  collectionEffectivenessWeeklyData,
  collectionPeriodEffectivenessData,
} from "@/lib/data";
import { PiggyBank } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";

function OnTimePaymentChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={onTimePaymentData.weekly} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12, color: "#e4e8ef" }}
          formatter={(value) => [`${value}%`, "On-Time Rate"]}
          labelStyle={{ color: "#8b949e" }}
        />
        <ReferenceLine y={85} stroke="#3fb950" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#58a6ff" fillOpacity={0.8}>
          <LabelList dataKey="value" position="top" fill="#8b949e" fontSize={10} formatter={(v) => `${v}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CollectionEffectivenessChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={collectionEffectivenessWeeklyData.weekly} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12, color: "#e4e8ef" }}
          formatter={(value) => [`${value}%`, "CEI"]}
          labelStyle={{ color: "#8b949e" }}
        />
        <ReferenceLine y={70} stroke="#d29922" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#bc8cff"
          strokeWidth={2}
          dot={{ r: 3, fill: "#bc8cff", stroke: "#0d1117", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        >
          <LabelList dataKey="value" position="top" fill="#8b949e" fontSize={10} formatter={(v) => `${v}%`} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

function CollectionPeriodChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={collectionPeriodEffectivenessData.data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
        <XAxis dataKey="creditPeriod" axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b949e", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12, color: "#e4e8ef" }}
          formatter={(value) => [`${value}%`, "Effectiveness"]}
          labelStyle={{ color: "#8b949e" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {collectionPeriodEffectivenessData.data.map((entry, i) => {
            const color = entry.value > 60 ? "#3fb950" : entry.value > 40 ? "#d29922" : "#f85149";
            return <Cell key={i} fill={color} fillOpacity={0.8} />;
          })}
          <LabelList dataKey="value" position="top" fill="#e4e8ef" fontSize={11} fontWeight={600} formatter={(v) => `${v}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CollectionEfficiency() {
  return (
    <section>
      <SectionHeader
        icon={PiggyBank}
        title="Collection Efficiency"
        subtitle="How effectively are we converting receivables to cash?"
        iconColor="text-accent-green"
      />

      {/* CEI Overall */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <KPICard
          title="Collection Effectiveness Index (CEI)"
          value={ceiData.overall}
          suffix="%"
          valueLabel="Overall Avg (Q1 2026)"
          insight={ceiData.insight}
          glowClass="glow-green"
        >
          <MiniSparkline data={ceiData.monthly} color="#3fb950" />
        </KPICard>

        {/* On-Time Payment Rate */}
        <KPICard
          title="On-Time Payment Rate %"
          value=""
          insight={onTimePaymentData.insight}
          compact
          className="xl:col-span-2"
        >
          <OnTimePaymentChart />
        </KPICard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Collection Effectiveness */}
        <KPICard
          title="Collection Effectiveness (Weekly)"
          value=""
          insight={collectionEffectivenessWeeklyData.insight}
          compact
        >
          <CollectionEffectivenessChart />
        </KPICard>

        {/* Credit Period Effectiveness */}
        <KPICard
          title="Credit Period Effectiveness"
          value=""
          insight={collectionPeriodEffectivenessData.insight}
          compact
        >
          <CollectionPeriodChart />
        </KPICard>
      </div>
    </section>
  );
}
