"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  agingBucketInsight,
  overdueInvoiceDensityInsight,
  peakOverdueExposureInsight,
} from "@/lib/data";
import { useKPIData, useQuarterLabel } from "@/lib/use-kpi-data";
import { useDashboard } from "@/context/dashboard-context";
import { formatCurrency } from "@/lib/utils";
import { ShieldAlert, FileWarning, DollarSign, Hash, Building2, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  CartesianGrid,
  PieChart,
  Pie,
} from "recharts";

function AgingBucketChart() {
  const kpiData = useKPIData();
  const buckets = kpiData.aging.buckets;
  const totalAR = buckets.reduce((s, b) => s + b.amount, 0);

  const chartData = buckets.map((b) => ({
    name: b.bucket,
    amount: b.amount,
    percentage: b.percentage,
    color: b.color,
    count: b.count,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 24, right: 10, bottom: 4, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ed" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e6ed",
              borderRadius: 10,
              fontSize: 12,
              color: "#1a1d23",
              padding: "10px 14px",
            }}
            formatter={(value, _name, props) => {
              const d = (props as any)?.payload;
              const v = value as number;
              if (!d) return [`${formatCurrency(v)}`, "Amount"];
              return [
                `${formatCurrency(v)} (${d.percentage}%) — ${d.count} invoices`,
                d.name,
              ];
            }}
            labelStyle={{ color: "#6b7280", fontWeight: 600 }}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.9} />
            ))}
            <LabelList
              dataKey="percentage"
              position="top"
              fill="#1a1d23"
              fontSize={11}
              fontWeight={700}
              formatter={(v) => `${v}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/50 bg-card-hover/50"
          >
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
            <span className="text-[10px] text-muted">{b.bucket}</span>
            <span className="text-[10px] font-bold" style={{ color: b.color }}>
              {b.count}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[10px] text-muted">Total Open AR: </span>
        <span className="text-xs font-bold">{formatCurrency(totalAR)}</span>
      </div>
    </div>
  );
}

function AgingDonut() {
  const kpiData = useKPIData();
  const buckets = kpiData.aging.buckets.filter((b) => b.percentage > 0);

  const RADIAN = Math.PI / 180;
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props;
    if (percentage < 2) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <div className="flex items-center justify-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={buckets}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            dataKey="percentage"
            nameKey="bucket"
            label={renderLabel}
            labelLine={false}
          >
            {buckets.map((b, i) => (
              <Cell key={i} fill={b.color} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e6ed",
              borderRadius: 8,
              fontSize: 12,
              color: "#1a1d23",
            }}
            formatter={(value, name) => [`${value}%`, name as string]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DualTile() {
  const kpiData = useKPIData();
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Hash className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-xs text-muted">By Count</span>
        </div>
        <span className="text-2xl font-bold text-accent-amber">{kpiData.aging.overdueDensity.count}%</span>
      </div>
      <div className="p-4 rounded-xl bg-accent-red/5 border border-accent-red/20 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <DollarSign className="w-3.5 h-3.5 text-accent-red" />
          <span className="text-xs text-muted">By Value</span>
        </div>
        <span className="text-2xl font-bold text-accent-red">{kpiData.aging.overdueDensity.value}%</span>
      </div>
    </div>
  );
}

function PeakExposureCard() {
  const kpiData = useKPIData();
  const peak = kpiData.aging.peakExposure;

  if (!peak.invoiceNo) {
    return <div className="text-xs text-muted text-center py-4">No overdue invoices in this period</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-center p-4 rounded-xl bg-accent-red/5 border border-accent-red/20">
        <span className="text-3xl font-bold text-accent-red">
          {formatCurrency(peak.amount)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-card-hover text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <FileWarning className="w-3 h-3 text-muted" />
          </div>
          <span className="text-[10px] text-muted block">Invoice</span>
          <span className="text-xs font-semibold">{peak.invoiceNo}</span>
        </div>
        <div className="p-2 rounded-lg bg-card-hover text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Building2 className="w-3 h-3 text-muted" />
          </div>
          <span className="text-[10px] text-muted block">Company</span>
          <span className="text-xs font-semibold">{peak.companyCode}</span>
        </div>
        <div className="p-2 rounded-lg bg-card-hover text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-muted" />
          </div>
          <span className="text-[10px] text-muted block">Days Overdue</span>
          <span className="text-xs font-semibold text-accent-red">{peak.daysOverdue}</span>
        </div>
      </div>
    </div>
  );
}

function isOn(map: Record<string, boolean>, id: string): boolean {
  return map[id] !== false;
}

export function AgingRisk() {
  const { kpiEnabled } = useDashboard();
  const quarterLabel = useQuarterLabel();

  const tiles = [
    isOn(kpiEnabled, "basic-aging-buckets") && (
      <KPICard
        key="aging-buckets"
        title="Aging Bucket Distribution"
        value=""
        valueLabel={quarterLabel}
        insight={agingBucketInsight}
        compact
        className="md:col-span-2"
      >
        <AgingBucketChart />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-aging-donut") && (
      <KPICard
        key="aging-donut"
        title="Aging Composition"
        value=""
        insight={{
          ...agingBucketInsight,
          aiInsight: "Donut view shows the proportional weight of each aging bucket. A healthy portfolio has the majority in green (Not Due) with minimal red (60+ days).",
        }}
        compact
      >
        <AgingDonut />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-overdue-density") && (
      <KPICard
        key="overdue-density"
        title="Overdue Invoice Density vs Value Split"
        value=""
        insight={overdueInvoiceDensityInsight}
        compact
      >
        <DualTile />
      </KPICard>
    ),
    isOn(kpiEnabled, "basic-peak-exposure") && (
      <KPICard
        key="peak-exposure"
        title="Peak Overdue Exposure"
        value=""
        insight={peakOverdueExposureInsight}
        compact
        glowClass="glow-red"
      >
        <PeakExposureCard />
      </KPICard>
    ),
  ].filter(Boolean);

  if (tiles.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={ShieldAlert}
        title="Aging & Risk KPIs"
        subtitle="Credit risk exposure and overdue concentration analysis"
        iconColor="text-accent-amber"
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
