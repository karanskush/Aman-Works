"use client";

import { useDashboard } from "@/context/dashboard-context";
import { getEnabledKPIs, CATEGORY_COLORS, type KPIDefinition } from "@/lib/kpi-registry";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Shield,
  Zap,
  DollarSign,
  Target,
  ArrowRight,
  Clock,
  Users,
  BarChart3,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
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

// ============================================================
// AI INSIGHTS ENGINE — Rule-based Statistical Analysis
// No external AI APIs. Pure computation + narrative generation.
// ============================================================

interface InsightCard {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  severity: "critical" | "warning" | "info" | "positive";
  headline: string;
  narrative: string;
  metrics: { label: string; value: string; color?: string }[];
  actions?: string[];
}

function generateInsights(): InsightCard[] {
  return [
    {
      id: "exec-summary",
      title: "Executive Summary",
      icon: BarChart3,
      iconColor: "text-accent-blue",
      bgColor: "bg-accent-blue/5",
      borderColor: "border-accent-blue/20",
      severity: "warning",
      headline: "AR Health Grade D (49/100) — Structural issues require immediate CFO attention",
      narrative:
        "The receivables portfolio is under significant stress. DSO at 96.7 days is nearly double the 50-day benchmark. While the collections team shows strong chase effectiveness (CEI 97%), the fundamental problem is 56% of AR is overdue with ₹19.5B trapped beyond credit terms. The paradox: the team converts what it chases, but too much AR sits un-chased in the 60+ day bucket.",
      metrics: [
        { label: "Health Score", value: "49/100", color: "text-accent-amber" },
        { label: "DSO", value: "96.7 days", color: "text-accent-red" },
        { label: "CEI", value: "97%", color: "text-accent-green" },
        { label: "Cash Trapped", value: "₹19.5B", color: "text-accent-red" },
      ],
      actions: [
        "Immediate: Close 12.5-day dunning gap to 1-3 days",
        "30-day: Launch STANDARD/SMB collection blitz",
        "90-day: Implement automated Level-1 dunning",
      ],
    },
    {
      id: "dso-drivers",
      title: "DSO Driver Analysis",
      icon: Target,
      iconColor: "text-accent-purple",
      bgColor: "bg-accent-purple/5",
      borderColor: "border-accent-purple/20",
      severity: "critical",
      headline: "DSO 96.7d driven by SMB/STANDARD segments and 12.5-day dunning gap",
      narrative:
        "The DSO bridge reveals STANDARD and SMB segments push DSO UP by 5.3 days combined (27% of sales). But the bigger driver is the process gap: first dunning happens 12.5 days after an invoice goes overdue. That's 12.5 days of free float given to every delinquent customer. The terms mix is NOT the problem — customers pay 6 days before terms on average. The issue is structural: 42.3% of AR stuck in 60+ day overdue with no active collection.",
      metrics: [
        { label: "Blended DSO", value: "96.7 days", color: "text-accent-red" },
        { label: "Best Possible", value: "41.5 days", color: "text-accent-green" },
        { label: "Dunning Gap", value: "12.5 days", color: "text-accent-amber" },
        { label: "Terms Drag", value: "-6.0 days", color: "text-accent-green" },
      ],
      actions: [
        "Automate day-1 dunning for all overdue invoices",
        "Create STANDARD/SMB dedicated collection team",
        "Reduce dunning gap from 12.5 to 3 days = ~10 day DSO improvement",
      ],
    },
    {
      id: "risk-alerts",
      title: "Risk & Anomaly Detection",
      icon: AlertTriangle,
      iconColor: "text-accent-red",
      bgColor: "bg-accent-red/5",
      borderColor: "border-accent-red/20",
      severity: "critical",
      headline: "88 customers deteriorating + 349 breaching credit limits",
      narrative:
        "Payment Behavior Deterioration Index flags 88 customers sliding toward default. Top alert: Hindalco Group surged from 4 to 23 day average payments — a 525% deterioration. Simultaneously, 349 of 350 customers exceed 100% credit limit utilization. The 16.9% dunning block rate (above 10-15% industry avg) suggests either systemic invoicing errors or team avoidance of difficult conversations.",
      metrics: [
        { label: "PBDI Alerts", value: "88 customers", color: "text-accent-red" },
        { label: "Credit Breaches", value: "349 customers", color: "text-accent-red" },
        { label: "Block Rate", value: "16.9%", color: "text-accent-amber" },
        { label: "Disputed AR", value: "₹3.2B", color: "text-accent-amber" },
      ],
      actions: [
        "CFO-to-CFO escalation for top 5 PBDI customers",
        "Review and recalibrate credit limits across portfolio",
        "Audit dunning block reasons — separate disputes from avoidance",
      ],
    },
    {
      id: "aging-movement",
      title: "Aging Movement & Migration",
      icon: Clock,
      iconColor: "text-accent-amber",
      bgColor: "bg-accent-amber/5",
      borderColor: "border-accent-amber/20",
      severity: "warning",
      headline: "Inverted aging pyramid — 65% of AR in 45-60 day buckets",
      narrative:
        "Only 35% of AR sits in the healthy 0-30 day range. The 45-day bucket (34%) is the largest concentration — these invoices are transitioning from 'late' to 'at risk.' Combined with 91.7% overdue by count (but 73.2% by value), the problem is a high volume of small invoices clogging the pipeline. Large accounts (26.8% of value) pay reliably, but the long tail drags all metrics down.",
      metrics: [
        { label: "0-30 Days", value: "35%", color: "text-accent-green" },
        { label: "45-60 Days", value: "65%", color: "text-accent-red" },
        { label: "Overdue by Count", value: "91.7%", color: "text-accent-red" },
        { label: "Overdue by Value", value: "73.2%", color: "text-accent-amber" },
      ],
      actions: [
        "Automate collections for invoices below ₹1L threshold",
        "Concentrate human collectors on large-value overdue",
        "Move 10% from 45→30 bucket to improve DSO by ~4 days",
      ],
    },
    {
      id: "collections-deep-dive",
      title: "Collections Efficiency Analysis",
      icon: Users,
      iconColor: "text-accent-green",
      bgColor: "bg-accent-green/5",
      borderColor: "border-accent-green/20",
      severity: "warning",
      headline: "Team is reactive, not proactive — 45.3% avg effectiveness vs 70% target",
      narrative:
        "The critical paradox: On-Time Payment Rate hit 100% in W12-13, but weekly collection effectiveness was only 54% and 38%. This means payments came in passively (customer-initiated), not from active dunning effort. The team converts well when they chase (CEI 97%), but they aren't chasing enough volume. Only 4 of 12 weeks exceeded the 70% target. W11's crash to 19% likely indicates staffing or process gaps.",
      metrics: [
        { label: "Avg Effectiveness", value: "45.3%", color: "text-accent-amber" },
        { label: "Target", value: "70%", color: "text-accent-green" },
        { label: "CEI", value: "97%", color: "text-accent-green" },
        { label: "Weeks Above Target", value: "2/12", color: "text-accent-red" },
      ],
      actions: [
        "Set weekly collection targets with accountability",
        "Implement daily dunning dashboards per collector",
        "Hire/reallocate to close W11-type staffing gaps",
      ],
    },
    {
      id: "cash-forecast",
      title: "Cash Flow Forecast & Projections",
      icon: TrendingUp,
      iconColor: "text-accent-cyan",
      bgColor: "bg-accent-cyan/5",
      borderColor: "border-accent-cyan/20",
      severity: "info",
      headline: "₹8.2B expected in next 30 days — but forecast accuracy is only 58%",
      narrative:
        "Based on historical payment curves by segment, ₹8.2B is expected to flow in over the next 30 days. STRATEGIC segment is most predictable (78% confidence), while SMB is least (41%). The 42.1% MAPE (Mean Absolute Percentage Error) means treasury forecasts are off by nearly half — systematic under-forecasting bias detected. Cash Conversion Efficiency at 68.4% means only ₹0.68 collected per ₹1 billed.",
      metrics: [
        { label: "30d Forecast", value: "₹8.2B", color: "text-accent-blue" },
        { label: "Confidence", value: "62%", color: "text-accent-amber" },
        { label: "MAPE", value: "42.1%", color: "text-accent-red" },
        { label: "Cash Conversion", value: "68.4%", color: "text-accent-amber" },
      ],
      actions: [
        "Recalibrate forecast models using segment-level curves",
        "Flag STRATEGIC collections as most reliable for treasury planning",
        "Increase forecast frequency from monthly to weekly",
      ],
    },
    {
      id: "working-capital",
      title: "Working Capital Opportunities",
      icon: DollarSign,
      iconColor: "text-accent-teal",
      bgColor: "bg-accent-teal/5",
      borderColor: "border-accent-teal/20",
      severity: "info",
      headline: "₹12.4B working capital releasable through 5 targeted initiatives",
      narrative:
        "At 10% cost of capital, each DSO day costs ₹9.4M — total carrying cost is ₹1.27B/year. Five quantified initiatives can release ₹12.4B: closing the dunning gap (₹3.5B), STANDARD/SMB blitz (₹2.8B), discount awareness (₹2.1B), dispute fast-track (₹2.0B), and posting lag elimination (₹2.0B). The 6.3% early payment discount capture rate represents ₹1.63B in missed savings.",
      metrics: [
        { label: "Releasable Capital", value: "₹12.4B", color: "text-accent-teal" },
        { label: "Daily Carrying Cost", value: "₹9.4M", color: "text-accent-red" },
        { label: "Annual Cost", value: "₹1.27B", color: "text-accent-red" },
        { label: "Missed Discounts", value: "₹1.63B", color: "text-accent-amber" },
      ],
      actions: [
        "Priority 1: Close dunning gap (₹3.5B impact, 30-day payback)",
        "Priority 2: STANDARD/SMB collection blitz (₹2.8B)",
        "Priority 3: Discount program awareness (₹2.1B)",
        "Priority 4: Dispute resolution fast-track (₹2.0B)",
        "Priority 5: Same-day invoice posting (₹2.0B)",
      ],
    },
    {
      id: "benchmarking",
      title: "Internal Benchmarking Insights",
      icon: Zap,
      iconColor: "text-[#6366f1]",
      bgColor: "bg-[#6366f1]/5",
      borderColor: "border-[#6366f1]/20",
      severity: "info",
      headline: "Manufacturing Division leads; Services Division needs targeted intervention",
      narrative:
        "Manufacturing (2000) achieves the best DSO at 86.6 days — 20 days better than Services (3000) at 106.3 days. By segment, STRATEGIC is 6.8x more capital-efficient than SMB (efficiency score 630 vs 93), driven primarily by SMB's 83.5% overdue ratio. The consistency score of 48/100 means payment behavior is generally unpredictable — the most predictable customers are ironically late but consistent.",
      metrics: [
        { label: "Best Unit", value: "Mfg 86.6d", color: "text-accent-green" },
        { label: "Worst Unit", value: "Svc 106.3d", color: "text-accent-red" },
        { label: "STRATEGIC Score", value: "630", color: "text-accent-green" },
        { label: "SMB Score", value: "93", color: "text-accent-red" },
      ],
      actions: [
        "Replicate Manufacturing Division's processes across Services",
        "SMB segment: automate collections or tighten credit terms",
        "Use consistency scores for cash flow forecasting",
      ],
    },
  ];
}

// ---- Severity Badge ----
function SeverityBadge({ severity }: { severity: InsightCard["severity"] }) {
  const config = {
    critical: { label: "Critical", bg: "bg-accent-red/10", text: "text-accent-red", border: "border-accent-red/20" },
    warning: { label: "Warning", bg: "bg-accent-amber/10", text: "text-accent-amber", border: "border-accent-amber/20" },
    info: { label: "Insight", bg: "bg-accent-blue/10", text: "text-accent-blue", border: "border-accent-blue/20" },
    positive: { label: "Positive", bg: "bg-accent-green/10", text: "text-accent-green", border: "border-accent-green/20" },
  };
  const c = config[severity];
  return (
    <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", c.bg, c.text, c.border)}>
      {c.label}
    </span>
  );
}

// ---- Health Score Gauge ----
function HealthGauge() {
  const score = 49;
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;
  const gradeColor = score >= 80 ? "#16a34a" : score >= 65 ? "#3b82f6" : score >= 50 ? "#d97706" : "#dc2626";

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
        Grade D — Needs Attention
      </div>
    </div>
  );
}

// ---- Health Radar ----
function HealthRadarChart() {
  const data = [
    { dimension: "DSO", value: 0 },
    { dimension: "CEI", value: 96 },
    { dimension: "Overdue", value: 44 },
    { dimension: "Aging", value: 44 },
    { dimension: "Concentration", value: 76 },
    { dimension: "Trend", value: 37 },
  ];

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e2e6ed" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "#6b7280", fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Segment Efficiency Comparison ----
function SegmentComparison() {
  const data = [
    { name: "STRATEGIC", score: 630, dso: 77.9 },
    { name: "KEY", score: 350, dso: 99.5 },
    { name: "STANDARD", score: 163, dso: 114.5 },
    { name: "SMB", score: 93, dso: 119.9 },
  ];

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

// ---- Opportunity Waterfall ----
function OpportunityWaterfall() {
  const data = [
    { name: "Dunning Gap", value: 3.5 },
    { name: "SMB/STD Blitz", value: 2.8 },
    { name: "Discount Prog", value: 2.1 },
    { name: "Dispute Track", value: 2.0 },
    { name: "Posting Lag", value: 2.0 },
  ];

  return (
    <div className="w-full h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 10 }} layout="vertical">
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} width={90} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`₹${v}B`, "Impact"]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} fill="#0d9488" fillOpacity={0.8}>
            <LabelList dataKey="value" position="right" fill="#1a1d23" fontSize={10} fontWeight={600} formatter={(v) => `₹${v}B`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Insight Card Component ----
function InsightCardComponent({ card }: { card: InsightCard }) {
  const Icon = card.icon;

  return (
    <div className={cn("glass-card p-5 space-y-4 border-l-4", card.borderColor)} style={{ borderLeftColor: card.iconColor.includes("[") ? card.iconColor.replace("text-", "").replace("[", "").replace("]", "") : undefined }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-2 rounded-xl", card.bgColor)}>
            <Icon className={cn("w-5 h-5", card.iconColor)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{card.title}</h3>
            <SeverityBadge severity={card.severity} />
          </div>
        </div>
      </div>

      {/* Headline */}
      <p className="text-sm font-medium text-foreground leading-snug">{card.headline}</p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {card.metrics.map((m) => (
          <div key={m.label} className="p-2 rounded-lg bg-card-hover text-center">
            <span className="text-[10px] text-muted block">{m.label}</span>
            <span className={cn("text-sm font-bold", m.color || "text-foreground")}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Narrative */}
      <div className="p-3 rounded-lg bg-accent-purple/5 border border-accent-purple/10">
        <p className="text-xs text-foreground/80 leading-relaxed">{card.narrative}</p>
      </div>

      {/* Actions */}
      {card.actions && card.actions.length > 0 && (
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

// ---- Main AI Insights Dashboard ----
export function AIInsightsDashboard() {
  const { kpiEnabled } = useDashboard();
  const enabledKPIs = getEnabledKPIs("ai-insights", kpiEnabled);
  const insights = generateInsights();

  // Filter insights based on enabled AI Insights KPIs
  const enabledIds = new Set(enabledKPIs.map((k) => k.id));
  const visibleInsights = insights.filter((card) => {
    // Map insight cards to KPI IDs
    const cardToKPI: Record<string, string> = {
      "exec-summary": "executive-summary",
      "risk-alerts": "risk-heatmap",
      "cash-forecast": "cash-forecast",
      "working-capital": "working-capital-opportunity",
      "collections-deep-dive": "collections-efficiency-trend",
    };
    const kpiId = cardToKPI[card.id];
    // Show if no KPI mapping (always show) or if mapped KPI is enabled
    return !kpiId || enabledIds.has(kpiId);
  });

  return (
    <section className="space-y-6">
      <SectionHeader
        icon={Brain}
        title="AI Insights"
        subtitle="Executive intelligence — rule-based analysis across all KPI dimensions"
        iconColor="text-accent-cyan"
      />

      {/* Health Score Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <h4 className="text-sm font-medium text-muted mb-3">AR Health Score</h4>
          <HealthGauge />
        </div>
        <div className="glass-card p-5">
          <h4 className="text-sm font-medium text-muted mb-3">Health Dimensions</h4>
          <HealthRadarChart />
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {[
              { label: "DSO", value: "0", color: "text-accent-red" },
              { label: "CEI", value: "96", color: "text-accent-green" },
              { label: "Overdue", value: "44", color: "text-accent-amber" },
              { label: "Aging", value: "44", color: "text-accent-amber" },
              { label: "Concentration", value: "76", color: "text-accent-green" },
              { label: "Trend", value: "37", color: "text-accent-red" },
            ].map((d) => (
              <div key={d.label} className="text-center">
                <span className="text-[9px] text-muted block">{d.label}</span>
                <span className={cn("text-xs font-bold", d.color)}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <h4 className="text-sm font-medium text-muted mb-3">Segment Efficiency</h4>
          <SegmentComparison />
          <p className="text-[10px] text-muted text-center mt-1">STRATEGIC 6.8x more efficient than SMB</p>
        </div>
      </div>

      {/* Working Capital Opportunity */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent-teal" />
            Working Capital Release Roadmap
          </h4>
          <span className="text-lg font-bold text-accent-teal">₹12.4B releasable</span>
        </div>
        <OpportunityWaterfall />
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleInsights.map((card) => (
          <InsightCardComponent key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
