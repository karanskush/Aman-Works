"use client";

import { useKPIData } from "@/lib/use-kpi-data";
import { useDashboard } from "@/context/dashboard-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeltaInline, type Tone } from "@/components/ui/status";
import { cn } from "@/lib/utils";
import { Info, Sparkles } from "lucide-react";
import { COMPUTED_KPI_DATA, type FYKey, type QuarterKey } from "@/lib/computed-kpis";
import type { ActiveSection } from "@/context/dashboard-context";

interface HeroMetric {
  label: string;
  value: string;
  sublabel?: string;
  delta?: { value: string; tone: Tone };
  tooltip?: string;
  accent: string;
}

function fmtINR(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function previousSlice(fy: FYKey, q: QuarterKey) {
  const all = COMPUTED_KPI_DATA;
  const prevFY: Record<FYKey, FYKey | null> = { 2024: null, 2025: 2024, 2026: 2025 };
  if (q === "All") {
    const pf = prevFY[fy];
    return pf ? all[pf]?.["All"] : undefined;
  }
  const order: QuarterKey[] = ["Q1", "Q2", "Q3", "Q4"];
  const idx = order.indexOf(q);
  if (idx > 0) return all[fy]?.[order[idx - 1]];
  const pf = prevFY[fy];
  return pf ? all[pf]?.["All"] : undefined;
}

function deltaStr(
  curr: number,
  prev: number | undefined,
  suffix = "",
  goodIsDown = false,
): { value: string; tone: Tone } | undefined {
  if (prev === undefined || prev === 0) return undefined;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05) return { value: `0${suffix}`, tone: "neutral" };
  const sign = diff >= 0 ? "+" : "";
  const goingDown = diff < 0;
  const tone: Tone = goodIsDown ? (goingDown ? "success" : "danger") : goingDown ? "danger" : "success";
  return { value: `${sign}${diff.toFixed(1)}${suffix}`, tone };
}

function MetricCell({ metric, index, total }: { metric: HeroMetric; index: number; total: number }) {
  return (
    <div
      className={cn(
        "relative flex-1 min-w-0 px-5 py-5 first:pl-6 last:pr-6",
        "transition-colors hover:bg-card-hover/40"
      )}
    >
      {/* Accent stripe on top */}
      <div
        aria-hidden
        className="absolute left-5 right-5 top-0 h-px"
        style={{ background: `linear-gradient(to right, ${metric.accent}, transparent)`, opacity: 0.65 }}
      />

      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
        <span>{metric.label}</span>
        {metric.tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex" aria-label="Details">
                <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px]">
              {metric.tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="display text-3xl md:text-[34px] font-semibold tracking-tight text-foreground numeric">
          {metric.value}
        </span>
        {metric.sublabel && <span className="text-xs text-muted-foreground">{metric.sublabel}</span>}
      </div>

      {metric.delta ? (
        <div className="mt-2 flex items-center gap-2">
          <DeltaInline value={metric.delta.value} tone={metric.delta.tone} />
          <span className="text-[10px] text-muted-foreground">vs prev period</span>
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-muted-foreground/70">no prior period</div>
      )}

      {/* Faint vertical divider on right (except last) */}
      {index < total - 1 && (
        <div aria-hidden className="hidden md:block absolute right-0 top-5 bottom-5 w-px bg-border" />
      )}
    </div>
  );
}

export function HeroKPIBand({ section }: { section: ActiveSection }) {
  const slice = useKPIData();
  const { filters } = useDashboard();
  const prev = previousSlice(filters.fiscalYear, filters.quarter);

  let metrics: HeroMetric[] = [];

  if (section === "basic" || section === "advanced" || section === "ai-insights") {
    const dso = slice.executive.dso.overall;
    const overdue = slice.executive.overdueRatio.overall;
    const cei = slice.collection.cei.overall;
    const health = slice.advanced.arHealthScore;

    const healthDelta = prev
      ? {
          value: `${health.score - prev.advanced.arHealthScore.score >= 0 ? "+" : ""}${health.score - prev.advanced.arHealthScore.score}`,
          tone: (health.score - prev.advanced.arHealthScore.score >= 0 ? "success" : "danger") as Tone,
        }
      : undefined;

    metrics = [
      {
        label: "DSO",
        value: `${dso.toFixed(1)}%`,
        sublabel: "of credit sales",
        delta: deltaStr(dso, prev?.executive.dso.overall, "pp", true),
        tooltip: "DSO = (Average AR / Total Credit Sales) × 100. Lower is better.",
        accent: "var(--accent-blue)",
      },
      {
        label: "Overdue Ratio",
        value: `${overdue.toFixed(1)}%`,
        delta: deltaStr(overdue, prev?.executive.overdueRatio.overall, "pp", true),
        tooltip: "Share of open AR past due date. < 20% is healthy.",
        accent: "var(--accent-red)",
      },
      {
        label: "CEI",
        value: `${cei.toFixed(0)}%`,
        delta: deltaStr(cei, prev?.collection.cei.overall, "pp", false),
        tooltip: "Collection Effectiveness Index. > 85% is strong.",
        accent: "var(--accent-green)",
      },
      {
        label: "AR Health",
        value: String(health.score),
        sublabel: `/ 100 · ${health.grade}`,
        delta: healthDelta,
        tooltip: "Composite score: DSO · CEI · Overdue · Aging · Concentration · Trend.",
        accent: "var(--primary)",
      },
    ];
  }

  if (metrics.length === 0) return null;

  return (
    <Card className="overflow-hidden bg-dot-grid">
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 divide-border">
        {metrics.map((m, i) => (
          <MetricCell key={m.label} metric={m} index={i} total={metrics.length} />
        ))}
        <div className="hidden md:flex flex-col items-end justify-center gap-2 px-5 py-4 border-l border-border bg-secondary/40">
          <Badge variant="primary" size="lg" className="rounded-md">
            <Sparkles className="h-3 w-3" />
            {filters.quarter === "All" ? "Full Year" : filters.quarter}
            <span className="opacity-50 mx-0.5">·</span>
            <span className="font-semibold">FY{String(filters.fiscalYear).slice(2)}</span>
          </Badge>
          <span className="text-[10px] text-muted-foreground/80 numeric">
            {slice.summary.totalInvoices.toLocaleString("en-IN")} invoices · {fmtINR(slice.summary.totalSales)} billed
          </span>
        </div>
      </div>
    </Card>
  );
}
