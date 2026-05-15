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
import { useDashboard } from "@/context/dashboard-context";
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
  const data = kpiData.collection.onTimePayment.monthly;

  if (data.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-8">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          formatter={(value) => [`${value}%`, "On-Time Rate"]}
        />
        <ReferenceLine y={85} stroke="var(--accent-green)" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} fill="var(--accent-blue)" fillOpacity={0.85}>
          <LabelList dataKey="value" position="top" fill="var(--muted)" fontSize={10} formatter={(v) => `${v}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CollectionEffectivenessChart() {
  const kpiData = useKPIData();
  const data = kpiData.collection.collectionEffectiveness.monthly;

  if (data.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-8">No data for this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip
          formatter={(value) => [`${value}%`, "Effectiveness"]}
        />
        <ReferenceLine y={70} stroke="var(--accent-amber)" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--accent-purple)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--accent-purple)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        >
          <LabelList dataKey="value" position="top" fill="var(--muted)" fontSize={10} formatter={(v) => `${v}%`} />
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

function isOn(map: Record<string, boolean>, id: string): boolean {
  return map[id] !== false;
}

export function CollectionEfficiency() {
  const kpiData = useKPIData();
  const quarterLabel = useQuarterLabel();
  const { kpiEnabled } = useDashboard();

  const tiles = [
    isOn(kpiEnabled, "basic-cei") && (
      <KPICard
        key="cei"
        kpiId="basic-cei"
        title="Collection Effectiveness Index (CEI)"
        value={kpiData.collection.cei.overall}
        suffix="%"
        valueLabel={quarterLabel}
        insight={ceiInsight}
        glowClass="glow-green"
      >
        <MiniSparkline data={kpiData.collection.cei.monthly} color="#16a34a" />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-on-time-payment") && (
      <KPICard
        key="on-time"
        kpiId="basic-on-time-payment"
        title="On-Time Payment Rate (Monthly)"
        value=""
        insight={onTimePaymentInsight}
        compact
        className="md:col-span-2"
      >
        <OnTimePaymentChart />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-collection-effectiveness-weekly") && (
      <KPICard
        key="coll-eff"
        kpiId="basic-collection-effectiveness-weekly"
        title="Collection Effectiveness (Monthly)"
        value=""
        insight={collectionEffectivenessInsight}
        compact
      >
        <CollectionEffectivenessChart />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-credit-period-effectiveness") && (
      <KPICard
        key="cp-eff"
        kpiId="basic-credit-period-effectiveness"
        title="Credit Period Effectiveness"
        value=""
        insight={collectionPeriodEffectivenessInsight}
        compact
      >
        <CollectionPeriodChart />
      </KPICard>
    ),
  ].filter(Boolean);

  if (tiles.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={PiggyBank}
        title="Collection Efficiency"
        subtitle="How effectively are we converting receivables to cash?"
        iconColor="text-accent-green"
      />
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        {tiles}
      </div>
    </section>
  );
}
