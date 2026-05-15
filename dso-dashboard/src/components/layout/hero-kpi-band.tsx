"use client";

import { useKPIData } from "@/lib/use-kpi-data";
import { useDashboard } from "@/context/dashboard-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { COMPUTED_KPI_DATA, type FYKey, type QuarterKey } from "@/lib/computed-kpis";
import type { ActiveSection } from "@/context/dashboard-context";
import type { ReactNode } from "react";

type DeltaTone = "good" | "bad" | "neutral";

interface HeroMetric {
  label: string;
  value: string;
  sublabel?: string;
  delta?: { value: string; tone: DeltaTone };
  tooltip?: string;
}

function fmtINR(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Returns the slice immediately before the current selection. Within an FY
// Q4→Q3→Q2→Q1; Q1 falls back to previous FY's "All". "All" compares to prev FY's "All".
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
  // Q1: fall back to prev FY's "All"
  const pf = prevFY[fy];
  return pf ? all[pf]?.["All"] : undefined;
}

function deltaStr(curr: number, prev: number | undefined, suffix = "", goodIsDown = false): { value: string; tone: DeltaTone } | undefined {
  if (prev === undefined || prev === 0) return undefined;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05) return { value: "no change", tone: "neutral" };
  const sign = diff >= 0 ? "+" : "";
  const goingDown = diff < 0;
  const tone: DeltaTone = goodIsDown
    ? (goingDown ? "good" : "bad")
    : (goingDown ? "bad" : "good");
  return { value: `${sign}${diff.toFixed(1)}${suffix}`, tone };
}

function MetricCell({ metric }: { metric: HeroMetric }) {
  const toneClass: Record<DeltaTone, string> = {
    good: "text-accent-green",
    bad: "text-accent-red",
    neutral: "text-muted-foreground",
  };
  const toneIcon: Record<DeltaTone, ReactNode> = {
    good: <TrendingDown className="h-3 w-3" />,
    bad: <TrendingUp className="h-3 w-3" />,
    neutral: <Minus className="h-3 w-3" />,
  };

  return (
    <div className="flex-1 min-w-0 px-4 py-3 first:pl-5 last:pr-5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{metric.label}</span>
        {metric.tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex">
                <Info className="h-3 w-3 opacity-60" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{metric.tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight numeric text-foreground">{metric.value}</span>
        {metric.sublabel && <span className="text-xs text-muted-foreground">{metric.sublabel}</span>}
      </div>
      {metric.delta && (
        <div className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-medium", toneClass[metric.delta.tone])}>
          {toneIcon[metric.delta.tone]}
          <span className="numeric">{metric.delta.value}</span>
          <span className="text-muted-foreground font-normal">vs prev</span>
        </div>
      )}
    </div>
  );
}

function gradeTone(score: number): DeltaTone {
  if (score >= 65) return "good";
  if (score >= 35) return "neutral";
  return "bad";
}

export function HeroKPIBand({ section }: { section: ActiveSection }) {
  const slice = useKPIData();
  const { filters } = useDashboard();
  const prev = previousSlice(filters.fiscalYear, filters.quarter);

  // Build a section-tailored band of 4 headline metrics.
  let metrics: HeroMetric[] = [];

  if (section === "basic" || section === "advanced" || section === "ai-insights") {
    const dso = slice.executive.dso.overall;
    const overdue = slice.executive.overdueRatio.overall;
    const cei = slice.collection.cei.overall;
    const health = slice.advanced.arHealthScore;

    metrics = [
      {
        label: "DSO",
        value: `${dso.toFixed(1)}%`,
        sublabel: "of credit sales",
        delta: deltaStr(dso, prev?.executive.dso.overall, "pp", true),
        tooltip: "DSO = (Average AR / Total Credit Sales) × 100. Lower is better.",
      },
      {
        label: "Overdue Ratio",
        value: `${overdue.toFixed(1)}%`,
        delta: deltaStr(overdue, prev?.executive.overdueRatio.overall, "pp", true),
        tooltip: "Share of open AR past due date.",
      },
      {
        label: "CEI",
        value: `${cei.toFixed(0)}%`,
        delta: deltaStr(cei, prev?.collection.cei.overall, "pp", false),
        tooltip: "Collection Effectiveness Index. Higher is better.",
      },
      {
        label: "AR Health",
        value: `${health.score}`,
        sublabel: `/ 100 (${health.grade})`,
        delta: prev
          ? { value: `${health.score - prev.advanced.arHealthScore.score >= 0 ? "+" : ""}${health.score - prev.advanced.arHealthScore.score}`, tone: gradeTone(health.score) }
          : undefined,
        tooltip: "Composite score across DSO, CEI, Overdue, Aging, Concentration, Trend.",
      },
    ];
  }

  if (metrics.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
        {metrics.map((m) => (
          <MetricCell key={m.label} metric={m} />
        ))}
        <div className="flex items-center gap-2 px-4 py-3 sm:py-0 sm:px-5 bg-card-hover/40">
          <Badge variant="neutral">
            {filters.quarter === "All" ? "Full Year" : filters.quarter}
            <span className="ml-1 opacity-60">·</span>
            <span className="ml-1">FY {filters.fiscalYear - 1}-{String(filters.fiscalYear).slice(2)}</span>
          </Badge>
        </div>
      </div>
    </Card>
  );
}
