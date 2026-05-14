"use client";

import { KPICard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  agingBucketData,
  overdueInvoiceDensityData,
  peakOverdueExposureData,
} from "@/lib/data";
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
} from "recharts";

function AgingStackedBar() {
  const data = [{ name: "Distribution", ...Object.fromEntries(agingBucketData.data.map(d => [d.bucket, d.percentage])) }];
  return (
    <div>
      <ResponsiveContainer width="100%" height={56}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12, color: "#e4e8ef" }}
            formatter={(value) => [`${value}%`]}
          />
          {agingBucketData.data.map((d) => (
            <Bar key={d.bucket} dataKey={d.bucket} stackId="aging" fill={d.color} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3">
        {agingBucketData.data.map((d) => (
          <div key={d.bucket} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-xs text-muted">{d.bucket}</span>
            <span className="text-xs font-semibold" style={{ color: d.color }}>{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualTile() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Hash className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-xs text-muted">By Count</span>
        </div>
        <span className="text-2xl font-bold text-accent-amber">{overdueInvoiceDensityData.count}%</span>
      </div>
      <div className="p-4 rounded-xl bg-accent-red/5 border border-accent-red/20 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <DollarSign className="w-3.5 h-3.5 text-accent-red" />
          <span className="text-xs text-muted">By Value</span>
        </div>
        <span className="text-2xl font-bold text-accent-red">{overdueInvoiceDensityData.value}%</span>
      </div>
    </div>
  );
}

function PeakExposureCard() {
  return (
    <div className="space-y-3">
      <div className="text-center p-4 rounded-xl bg-accent-red/5 border border-accent-red/20">
        <span className="text-3xl font-bold text-accent-red">
          {formatCurrency(peakOverdueExposureData.amount)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-card-hover text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <FileWarning className="w-3 h-3 text-muted" />
          </div>
          <span className="text-[10px] text-muted block">Invoice</span>
          <span className="text-xs font-semibold">{peakOverdueExposureData.invoiceNo}</span>
        </div>
        <div className="p-2 rounded-lg bg-card-hover text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Building2 className="w-3 h-3 text-muted" />
          </div>
          <span className="text-[10px] text-muted block">Company</span>
          <span className="text-xs font-semibold">{peakOverdueExposureData.companyCode}</span>
        </div>
        <div className="p-2 rounded-lg bg-card-hover text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-muted" />
          </div>
          <span className="text-[10px] text-muted block">Days Overdue</span>
          <span className="text-xs font-semibold text-accent-red">{peakOverdueExposureData.daysOverdue}</span>
        </div>
      </div>
    </div>
  );
}

export function AgingRisk() {
  return (
    <section>
      <SectionHeader
        icon={ShieldAlert}
        title="Aging & Risk KPIs"
        subtitle="Credit risk exposure and overdue concentration analysis"
        iconColor="text-accent-amber"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Aging Buckets */}
        <KPICard
          title="Aging Bucket Distribution"
          value=""
          insight={agingBucketData.insight}
          compact
        >
          <AgingStackedBar />
        </KPICard>

        {/* Overdue Invoice Density */}
        <KPICard
          title="Overdue Invoice Density vs Value Split"
          value=""
          insight={overdueInvoiceDensityData.insight}
          compact
        >
          <DualTile />
        </KPICard>

        {/* Peak Overdue Exposure */}
        <KPICard
          title="Peak Overdue Exposure"
          value=""
          insight={peakOverdueExposureData.insight}
          compact
          glowClass="glow-red"
        >
          <PeakExposureCard />
        </KPICard>
      </div>
    </section>
  );
}
