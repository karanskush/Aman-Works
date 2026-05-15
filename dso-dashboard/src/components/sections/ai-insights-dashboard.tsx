"use client";

import { useDashboard } from "@/context/dashboard-context";
import { getEnabledKPIs } from "@/lib/kpi-registry";
import { useKPIData, useQuarterLabel } from "@/lib/use-kpi-data";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  Shield,
  Zap,
  DollarSign,
  Target,
  ArrowRight,
  Clock,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import type { AIInsightCard } from "@/lib/computed-kpis";

// ============================================================
// AI INSIGHTS — entirely rendered from useKPIData().aiInsights.
// Values, narratives, observations, risks/opportunities, and
// actions all change with the active (FY, quarter) filter.
// Generation logic lives in prisma/compute-dashboard-data.ts.
// No external/AI APIs.
// ============================================================

function renderCardIcon(iconKey: string, className: string): ReactNode {
  switch (iconKey) {
    case "summary": return <BarChart3 className={className} />;
    case "drivers": return <TrendingDown className={className} />;
    case "risk": return <AlertTriangle className={className} />;
    case "aging": return <Clock className={className} />;
    case "collections": return <Zap className={className} />;
    case "forecast": return <Target className={className} />;
    case "working-capital": return <DollarSign className={className} />;
    case "benchmark": return <Shield className={className} />;
    default: return <Sparkles className={className} />;
  }
}

function severityStyles(severity: AIInsightCard["severity"]) {
  return {
    critical: { label: "Critical", bg: "bg-accent-red/10", text: "text-accent-red", border: "border-accent-red/20", accent: "text-accent-red" },
    warning: { label: "Warning", bg: "bg-accent-amber/10", text: "text-accent-amber", border: "border-accent-amber/20", accent: "text-accent-amber" },
    info: { label: "Insight", bg: "bg-accent-blue/10", text: "text-accent-blue", border: "border-accent-blue/20", accent: "text-accent-blue" },
    positive: { label: "Positive", bg: "bg-accent-green/10", text: "text-accent-green", border: "border-accent-green/20", accent: "text-accent-green" },
  }[severity];
}

function SeverityBadge({ severity }: { severity: AIInsightCard["severity"] }) {
  const c = severityStyles(severity);
  return (
    <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", c.bg, c.text, c.border)}>
      {c.label}
    </span>
  );
}

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const progress = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const gradeColor =
    score >= 80 ? "var(--accent-green)" :
    score >= 65 ? "var(--primary)" :
    score >= 50 ? "var(--accent-amber)" :
    "var(--accent-red)";
  const label = grade === "A" ? "Excellent" : grade === "B" ? "Solid" : grade === "C" ? "Mixed" : grade === "D" ? "Needs Attention" : "Critical";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={gradeColor}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display text-[40px] font-semibold numeric leading-none tracking-[-0.02em]" style={{ color: gradeColor }}>
            {score}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 numeric">/ 100</span>
        </div>
      </div>
      <div
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
        style={{ color: gradeColor, backgroundColor: `color-mix(in oklab, ${gradeColor} 12%, transparent)` }}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: gradeColor }} />
        Grade {grade} · {label}
      </div>
    </div>
  );
}

function HealthRadarChart({ data }: { data: { dim: string; value: number }[] }) {
  const chartData = data.map(d => ({ dimension: d.dim, value: d.value }));
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SegmentComparison({ data }: { data: { name: string; score: number; dso: number }[] }) {
  return (
    <div className="w-full h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.score > 500 ? "var(--accent-green)" : d.score > 200 ? "var(--accent-amber)" : "var(--accent-red)"} fillOpacity={0.85} />
            ))}
            <LabelList dataKey="score" position="top" fill="var(--foreground)" fontSize={10} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmtCrore(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function OpportunityWaterfall({ data }: { data: { name: string; value: number }[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} margin={{ top: 12, right: 70, bottom: 0, left: 10 }} layout="vertical">
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} tickFormatter={fmtCrore} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} width={140} />
          <Tooltip formatter={(v) => [fmtCrore(Number(v)), "Impact"]} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} fill="var(--accent-teal)" fillOpacity={0.85}>
            <LabelList dataKey="value" position="right" fill="var(--foreground)" fontSize={11} fontWeight={600} formatter={(v) => fmtCrore(Number(v ?? 0))} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InsightCardComponent({ card }: { card: AIInsightCard }) {
  const sev = severityStyles(card.severity);
  const risks = card.risksAndOpportunities.filter(r => r.type === "risk");
  const opps = card.risksAndOpportunities.filter(r => r.type === "opportunity");
  const stripeColor =
    card.severity === "critical" ? "var(--accent-red)" :
    card.severity === "warning" ? "var(--accent-amber)" :
    card.severity === "positive" ? "var(--accent-green)" :
    "var(--primary)";

  return (
    <div
      className="rounded-xl bg-card border border-border shadow-[var(--shadow-sm)] overflow-hidden fade-in"
    >
      {/* Header band with severity accent */}
      <div
        className="px-5 py-4 border-b border-border bg-secondary/30"
        style={{ boxShadow: `inset 0 2px 0 0 ${stripeColor}` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
              style={{ background: `color-mix(in oklab, ${stripeColor} 12%, transparent)` }}
            >
              {renderCardIcon(card.iconKey, cn("h-4 w-4", sev.accent))}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground truncate">
                {card.title}
              </h3>
              <div className="mt-0.5">
                <SeverityBadge severity={card.severity} />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground/90 leading-snug">{card.headline}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Metric strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {card.metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-secondary/50 ring-1 ring-inset ring-border px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">{m.label}</span>
              <span className={cn("display text-base font-semibold numeric block mt-1", m.color || "text-foreground")}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Narrative */}
        <div className="rounded-lg bg-primary-soft/40 ring-1 ring-inset ring-[color-mix(in_oklab,var(--primary)_18%,transparent)] p-3.5">
          <p className="text-xs text-foreground/85 leading-relaxed">{card.narrative}</p>
        </div>

        {/* Key observations */}
        {card.keyObservations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-blue">
              <Sparkles className="w-3 h-3" />
              Key Observations
            </div>
            <ul className="space-y-1.5">
              {card.keyObservations.map((obs, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                  <span className="text-accent-blue/70 mt-1.5 inline-block h-1 w-1 rounded-full bg-current shrink-0" />
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks & opportunities side by side */}
        {(risks.length > 0 || opps.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {risks.length > 0 && (
              <div className="rounded-lg ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-red)_24%,transparent)] bg-[color-mix(in_oklab,var(--accent-red)_5%,transparent)] p-3">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-red">
                  <AlertCircle className="w-3 h-3" />
                  Risks
                </div>
                <ul className="space-y-1">
                  {risks.map((r, i) => (
                    <li key={i} className="text-[11px] text-foreground/80 leading-relaxed">{r.text}</li>
                  ))}
                </ul>
              </div>
            )}
            {opps.length > 0 && (
              <div className="rounded-lg ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-green)_24%,transparent)] bg-[color-mix(in_oklab,var(--accent-green)_5%,transparent)] p-3">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-green">
                  <CheckCircle2 className="w-3 h-3" />
                  Opportunities
                </div>
                <ul className="space-y-1">
                  {opps.map((o, i) => (
                    <li key={i} className="text-[11px] text-foreground/80 leading-relaxed">{o.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions list — bottom block, amber-toned */}
        {card.actions.length > 0 && (
          <div className="rounded-lg ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-amber)_24%,transparent)] bg-[color-mix(in_oklab,var(--accent-amber)_5%,transparent)] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-amber">
              <Lightbulb className="w-3 h-3" />
              Recommended Actions
            </div>
            <ul className="space-y-1">
              {card.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                  <ArrowRight className="w-3 h-3 text-accent-amber shrink-0 mt-1" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Map insight card IDs to the KPI registry IDs that toggle their visibility.
const CARD_TO_KPI: Record<string, string> = {
  "exec-summary": "executive-summary",
  "risk-alerts": "risk-heatmap",
  "cash-forecast": "cash-forecast",
  "working-capital": "working-capital-opportunity",
  "collections-deep-dive": "collections-efficiency-trend",
};

export function AIInsightsDashboard() {
  const { kpiEnabled } = useDashboard();
  const enabledKPIs = getEnabledKPIs("ai-insights", kpiEnabled);
  const enabledIds = new Set(enabledKPIs.map(k => k.id));
  const slice = useKPIData();
  const ai = slice.aiInsights;
  const quarterLabel = useQuarterLabel();

  const visibleCards = ai.cards.filter(card => {
    const kpiId = CARD_TO_KPI[card.id];
    return !kpiId || enabledIds.has(kpiId);
  });

  const totalUnlock = ai.opportunityWaterfall.reduce((s, o) => s + o.value, 0);
  const defaultTab = visibleCards[0]?.id ?? "exec-summary";

  return (
    <section className="space-y-5">
      <SectionHeader
        icon={Brain}
        title="AI Insights"
        subtitle={`Executive intelligence · ${quarterLabel}`}
        iconColor="text-accent-cyan"
      />

      {/* Always-on summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col items-center justify-center">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            AR Health Score
          </h4>
          <HealthGauge score={ai.healthGauge.score} grade={ai.healthGauge.grade} />
        </Card>
        <Card className="p-5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Health Dimensions
          </h4>
          <HealthRadarChart data={ai.healthRadar} />
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {ai.healthRadar.map((d) => {
              const color = d.value >= 70 ? "text-accent-green" : d.value >= 50 ? "text-accent-amber" : "text-accent-red";
              return (
                <div key={d.dim} className="text-center">
                  <span className="text-[10px] text-muted-foreground block">{d.dim}</span>
                  <span className={cn("text-xs font-semibold numeric", color)}>{d.value}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Segment Efficiency
          </h4>
          <SegmentComparison data={ai.segmentEfficiencyChart} />
          {ai.segmentEfficiencyChart.length >= 2 ? (
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              {(() => {
                const sorted = [...ai.segmentEfficiencyChart].sort((a, b) => b.score - a.score);
                const best = sorted[0];
                const worst = sorted[sorted.length - 1];
                const ratio = worst.score > 0 ? best.score / worst.score : 0;
                return `${best.name} ${ratio.toFixed(1)}× more efficient than ${worst.name}`;
              })()}
            </p>
          ) : null}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-accent-teal" />
            Working Capital Release Roadmap
          </h4>
          <span className="text-sm font-semibold text-accent-teal numeric">
            {fmtCrore(totalUnlock)} releasable
          </span>
        </div>
        <OpportunityWaterfall data={ai.opportunityWaterfall} />
      </Card>

      {/* Tabbed deep dive — one insight at a time replaces 8 stacked cards */}
      {visibleCards.length > 0 && (
        <Tabs defaultValue={defaultTab} className="space-y-3">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            {visibleCards.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="gap-1.5">
                {renderCardIcon(c.iconKey, "h-3.5 w-3.5")}
                <span>{c.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {visibleCards.map((c) => (
            <TabsContent key={c.id} value={c.id}>
              <InsightCardComponent card={c} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
}
