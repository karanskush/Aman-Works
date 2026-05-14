"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { MiniSparkline } from "@/components/charts/mini-sparkline";
import {
  ceiInsight,
  onTimePaymentInsight,
  collectionEffectivenessInsight,
  collectionPeriodEffectivenessInsight,
} from "@/lib/data";
import { useKPIData, useQuarterLabel } from "@/lib/use-kpi-data";
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
  const kpiData = useKPIData();
  const data = kpiData.collection.onTimePayment.weekly;

  if (data.length === 0) {
    return <div className="text-xs text-muted text-center py-8">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ed" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 12, color: "#1a1d23" }}
          formatter={(value) => [`${value}%`, "On-Time Rate"]}
          labelStyle={{ color: "#6b7280" }}
        />
        <ReferenceLine y={85} stroke="#16a34a" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#3b82f6" fillOpacity={0.85}>
          <LabelList dataKey="value" position="top" fill="#6b7280" fontSize={10} formatter={(v) => `${v}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CollectionEffectivenessChart() {
  const kpiData = useKPIData();
  const data = kpiData.collection.collectionEffectiveness.weekly;

  if (data.length === 0) {
    return <div className="text-xs text-muted text-center py-8">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ed" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 12, color: "#1a1d23" }}
          formatter={(value) => [`${value}%`, "Effectiveness"]}
          labelStyle={{ color: "#6b7280" }}
        />
        <ReferenceLine y={70} stroke="#d97706" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={{ r: 3, fill: "#7c3aed", stroke: "#ffffff", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        >
          <LabelList dataKey="value" position="top" fill="#6b7280" fontSize={10} formatter={(v) => `${v}%`} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

function CollectionPeriodChart() {
  const kpiData = useKPIData();
  const data = kpiData.collection.creditPeriodEffectiveness.data;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ed" vertical={false} />
        <XAxis dataKey="creditPeriod" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 12, color: "#1a1d23" }}
          formatter={(value) => [`${value}%`, "Effectiveness"]}
          labelStyle={{ color: "#6b7280" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => {
            const color = entry.value > 60 ? "#16a34a" : entry.value > 40 ? "#d97706" : "#dc2626";
            return <Cell key={i} fill={color} fillOpacity={0.85} />;
          })}
          <LabelList dataKey="value" position="top" fill="#1a1d23" fontSize={11} fontWeight={600} formatter={(v) => `${v}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CollectionEfficiency() {
  const kpiData = useKPIData();
  const quarterLabel = useQuarterLabel();

  return (
    <section>
      <SectionHeader
        icon={PiggyBank}
        title="Collection Efficiency"
        subtitle="How effectively are we converting receivables to cash?"
        iconColor="text-accent-green"
      />

      {/* Row 1: CEI (smaller) + On-Time Payment Rate (larger) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <KPICard
          title="Collection Effectiveness Index (CEI)"
          value={kpiData.collection.cei.overall}
          suffix="%"
          valueLabel={quarterLabel}
          insight={ceiInsight}
          glowClass="glow-green"
          className="md:col-span-2"
        >
          <MiniSparkline data={kpiData.collection.cei.monthly} color="#16a34a" />
        </KPICard>

        <KPICard
          title="On-Time Payment Rate %"
          value=""
          insight={onTimePaymentInsight}
          compact
          className="md:col-span-3"
        >
          <OnTimePaymentChart />
        </KPICard>
      </div>

      {/* Row 2: Weekly Collection Effectiveness + Credit Period Effectiveness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="Collection Effectiveness (Weekly)"
          value=""
          insight={collectionEffectivenessInsight}
          compact
        >
          <CollectionEffectivenessChart />
        </KPICard>

        <KPICard
          title="Credit Period Effectiveness"
          value=""
          insight={collectionPeriodEffectivenessInsight}
          compact
        >
          <CollectionPeriodChart />
        </KPICard>
      </div>
    </section>
  );
}
