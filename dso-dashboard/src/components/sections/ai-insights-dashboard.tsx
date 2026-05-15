"use client";

import { useDashboard } from "@/context/dashboard-context";
import { getEnabledKPIs } from "@/lib/kpi-registry";
import { useKPIData, useQuarterLabel } from "@/lib/use-kpi-data";
import { SectionHeader } from "@/components/ui/section-header";
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
  const gradeColor = score >= 80 ? "#16a34a" : score >= 65 ? "#3b82f6" : score >= 50 ? "#d97706" : "#dc2626";
  const label = grade === "A" ? "Excellent" : grade === "B" ? "Solid" : grade === "C" ? "Mixed" : grade === "D" ? "Needs Attention" : "Critical";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e6ed" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={gradeColor}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: gradeColor }}>
            {score}
          </span>
          <span className="text-xs text-muted">/ 100</span>
        </div>
      </div>
      <div className="mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ color: gradeColor, backgroundColor: gradeColor + "15" }}>
        Grade {grade} — {label}
      </div>
    </div>
  );
}

function HealthRadarChart({ data }: { data: { dim: string; value: number }[] }) {
  const chartData = data.map(d => ({ dimension: d.dim, value: d.value }));
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e2e6ed" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "#6b7280", fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
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
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 11 }} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.score > 500 ? "#16a34a" : d.score > 200 ? "#d97706" : "#dc2626"} fillOpacity={0.8} />
            ))}
            <LabelList dataKey="score" position="top" fill="#1a1d23" fontSize={10} fontWeight={600} />
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
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} margin={{ top: 12, right: 60, bottom: 0, left: 10 }} layout="vertical">
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={fmtCrore} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} width={120} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 11 }} formatter={(v) => [fmtCrore(Number(v)), "Impact"]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} fill="#0d9488" fillOpacity={0.8}>
            <LabelList dataKey="value" position="right" fill="#1a1d23" fontSize={10} fontWeight={600} formatter={(v) => fmtCrore(Number(v ?? 0))} />
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

  return (
    <div className={cn("glass-card p-5 space-y-4 border-l-4", sev.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-2 rounded-xl", sev.bg)}>
            {renderCardIcon(card.iconKey, cn("w-5 h-5", sev.accent))}
          </div>
          <div>
            <h3 className="text-sm font-semibold">{card.title}</h3>
            <SeverityBadge severity={card.severity} />
          </div>
        </div>
      </div>

      <p className="text-sm font-medium text-foreground leading-snug">{card.headline}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {card.metrics.map((m) => (
          <div key={m.label} className="p-2 rounded-lg bg-card-hover text-center">
            <span className="text-[10px] text-muted block">{m.label}</span>
            <span className={cn("text-sm font-bold", m.color || "text-foreground")}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-accent-purple/5 border border-accent-purple/10">
        <p className="text-xs text-foreground/80 leading-relaxed">{card.narrative}</p>
      </div>

      {card.keyObservations.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider">
              Key Observations
            </span>
          </div>
          <ul className="space-y-1">
            {card.keyObservations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/75">
                <span className="text-accent-blue/60 mt-1 shrink-0">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(risks.length > 0 || opps.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {risks.length > 0 && (
            <div className="p-2.5 rounded-lg bg-accent-red/5 border border-accent-red/10">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-accent-red" />
                <span className="text-[10px] font-bold text-accent-red uppercase tracking-wider">Risks</span>
              </div>
              <ul className="space-y-1">
                {risks.map((r, i) => (
                  <li key={i} className="text-[11px] text-foreground/75 leading-relaxed">{r.text}</li>
                ))}
              </ul>
            </div>
          )}
          {opps.length > 0 && (
            <div className="p-2.5 rounded-lg bg-accent-green/5 border border-accent-green/10">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                <span className="text-[10px] font-bold text-accent-green uppercase tracking-wider">Opportunities</span>
              </div>
              <ul className="space-y-1">
                {opps.map((o, i) => (
                  <li key={i} className="text-[11px] text-foreground/75 leading-relaxed">{o.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {card.actions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-accent-amber" />
            <span className="text-[10px] font-bold text-accent-amber uppercase tracking-wider">
              Recommended Actions
            </span>
          </div>
          {card.actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground/70">
              <ArrowRight className="w-3 h-3 text-accent-blue shrink-0 mt-0.5" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}
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

  return (
    <section className="space-y-6">
      <SectionHeader
        icon={Brain}
        title="AI Insights"
        subtitle={`Executive intelligence · ${quarterLabel}`}
        iconColor="text-accent-cyan"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <h4 className="text-sm font-medium text-muted mb-3">AR Health Score</h4>
          <HealthGauge score={ai.healthGauge.score} grade={ai.healthGauge.grade} />
        </div>
        <div className="glass-card p-5">
          <h4 className="text-sm font-medium text-muted mb-3">Health Dimensions</h4>
          <HealthRadarChart data={ai.healthRadar} />
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {ai.healthRadar.map((d) => {
              const color = d.value >= 70 ? "text-accent-green" : d.value >= 50 ? "text-accent-amber" : "text-accent-red";
              return (
                <div key={d.dim} className="text-center">
                  <span className="text-[9px] text-muted block">{d.dim}</span>
                  <span className={cn("text-xs font-bold", color)}>{d.value}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass-card p-5">
          <h4 className="text-sm font-medium text-muted mb-3">Segment Efficiency</h4>
          <SegmentComparison data={ai.segmentEfficiencyChart} />
          {ai.segmentEfficiencyChart.length >= 2 ? (
            <p className="text-[10px] text-muted text-center mt-1">
              {(() => {
                const sorted = [...ai.segmentEfficiencyChart].sort((a, b) => b.score - a.score);
                const best = sorted[0];
                const worst = sorted[sorted.length - 1];
                const ratio = worst.score > 0 ? best.score / worst.score : 0;
                return `${best.name} ${ratio.toFixed(1)}× more efficient than ${worst.name}`;
              })()}
            </p>
          ) : null}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent-teal" />
            Working Capital Release Roadmap
          </h4>
          <span className="text-lg font-bold text-accent-teal">{fmtCrore(totalUnlock)} releasable</span>
        </div>
        <OpportunityWaterfall data={ai.opportunityWaterfall} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleCards.map((card) => (
          <InsightCardComponent key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
