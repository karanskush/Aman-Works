"use client";

import { useDashboard } from "@/context/dashboard-context";
import {
  getEnabledKPIs,
  getCategoriesForSection,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type KPIDefinition,
  type KPICategory,
} from "@/lib/kpi-registry";
import { getAdvancedKPIValues } from "@/lib/advanced-kpi-values";
import { useKPIData, useQuarterLabel, useKpiInsight } from "@/lib/use-kpi-data";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info,
  Calculator,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
  LabelList,
} from "recharts";

// ---- Trend config ----
const trendConfig = {
  up: { icon: TrendingUp, color: "text-accent-green", label: "Improving" },
  down: { icon: TrendingDown, color: "text-accent-red", label: "Declining" },
  stable: { icon: Minus, color: "text-accent-blue", label: "Stable" },
  warning: { icon: AlertTriangle, color: "text-accent-amber", label: "Needs Attention" },
};

// ---- Detail Modal ----
function AdvancedKPIModal({
  kpi,
  onClose,
}: {
  kpi: KPIDefinition;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dynamic = useKpiInsight(kpi.id);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const trend = trendConfig[kpi.trend];
  const TrendIcon = trend.icon;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 space-y-4 border border-border shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ color: CATEGORY_COLORS[kpi.category], backgroundColor: CATEGORY_COLORS[kpi.category] + "15" }}
            >
              {kpi.categoryLabel}
            </span>
            <h4 className="text-lg font-semibold gradient-text mt-1">{kpi.name}</h4>
          </div>
          <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-card-hover transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="p-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Info className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider">Business Purpose</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{kpi.businessPurpose}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-accent-green/10 border border-accent-green/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Calculator className="w-3.5 h-3.5 text-accent-green" />
              <span className="text-[10px] font-bold text-accent-green uppercase tracking-wider">Formula</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-mono">{kpi.formula}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
              <span className="text-[10px] font-bold text-accent-purple uppercase tracking-wider">AI Insight</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{kpi.insight}</p>
          </div>

          {dynamic && (
            <>
              <div className="p-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                <div className="text-[10px] font-bold text-accent-blue uppercase tracking-wider mb-1">Key Observation</div>
                <p className="text-xs text-foreground/85 leading-relaxed">{dynamic.observation}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent-amber/10 border border-accent-amber/20">
                <div className="text-[10px] font-bold text-accent-amber uppercase tracking-wider mb-1">Recommendation</div>
                <p className="text-xs text-foreground/85 leading-relaxed">{dynamic.recommendation}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent-green/10 border border-accent-green/20">
                <div className="text-[10px] font-bold text-accent-green uppercase tracking-wider mb-1">Next Action</div>
                <p className="text-xs text-foreground/85 leading-relaxed">{dynamic.nextAction}</p>
              </div>
            </>
          )}

          {/* Details breakdown */}
          <div className="p-2.5 rounded-lg bg-card-hover border border-border">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Breakdown</span>
            <div className="space-y-1.5">
              {Object.entries(kpi.details).map(([key, val]) => (
                <div key={key} className="flex items-start justify-between text-xs gap-2">
                  <span className="text-muted shrink-0">{key}</span>
                  <span className="text-foreground font-medium text-right">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("flex items-center gap-2 text-sm px-1", trend.color)}>
          <TrendIcon className="w-4 h-4" />
          <span>Status: {trend.label}</span>
          <span className="text-muted text-xs ml-auto">Refresh: {kpi.refreshFrequency}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---- Visualization: Radar Chart ----
function HealthRadar({ kpi }: { kpi: KPIDefinition }) {
  const dims = ["DSO", "CEI", "Overdue", "Aging", "Concentration", "Trend"];
  const data = dims.map((d) => ({
    dimension: d,
    value: typeof kpi.details[d] === "number" ? (kpi.details[d] as number) : 0,
  }));

  return (
    <div className="w-full h-[180px]">
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

// ---- Visualization: Waterfall ----
function WaterfallViz({ kpi }: { kpi: KPIDefinition }) {
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"];
  const data = segments
    .filter((s) => kpi.details[s])
    .map((s) => {
      const val = String(kpi.details[s]);
      const match = val.match(/([+-]?\d+\.?\d*)/);
      const contribMatch = val.match(/([+-]\d+\.?\d*)/g);
      return {
        name: s,
        value: contribMatch ? parseFloat(contribMatch[contribMatch.length - 1]) : (match ? parseFloat(match[1]) : 0),
        label: val.split("|").pop()?.trim() || val,
      };
    });

  return (
    <div className="w-full h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <ReferenceLine y={0} stroke="#e2e6ed" />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e6ed", borderRadius: 8, fontSize: 11 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value < 0 ? "#16a34a" : "#dc2626"} fillOpacity={0.8} />
            ))}
            <LabelList dataKey="label" position="top" fill="#1a1d23" fontSize={9} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Visualization: Segment Efficiency Bar ----
function SegmentEfficiencyBar({ kpi }: { kpi: KPIDefinition }) {
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"];
  const data = segments
    .filter((s) => kpi.details[s] && typeof kpi.details[s] === "object")
    .map((s) => {
      const d = kpi.details[s] as Record<string, string | number>;
      return { name: s, score: typeof d.score === "number" ? d.score : 0 };
    });

  return (
    <div className="w-full h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} domain={[0, 700]} />
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

// ---- Visualization: PBDI Table ----
function PBDITable({ kpi }: { kpi: KPIDefinition }) {
  const entries = Object.entries(kpi.details).filter(([k]) => k.startsWith("top"));
  return (
    <div className="space-y-1.5">
      {entries.map(([, val], i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-2 rounded-lg bg-accent-red/5 border border-accent-red/10 text-xs"
        >
          <span className="w-5 h-5 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center text-[10px] font-bold shrink-0">
            {i + 1}
          </span>
          <span className="text-foreground/80">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Visualization: Company Code Table ----
function CompanyCodeTable({ kpi }: { kpi: KPIDefinition }) {
  const entries = Object.entries(kpi.details).filter(
    ([, val]) => typeof val === "object"
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1.5 text-muted font-medium">Entity</th>
            <th className="text-right py-1.5 text-muted font-medium">DSO</th>
            <th className="text-right py-1.5 text-muted font-medium">Overdue</th>
            <th className="text-right py-1.5 text-muted font-medium">Open AR</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, val]) => {
            const d = val as Record<string, string | number>;
            return (
              <tr key={key} className="border-b border-border/50">
                <td className="py-1.5 font-medium">{key}</td>
                <td className="text-right text-accent-blue">{String(d.dso || "")}</td>
                <td className="text-right text-accent-red">{String(d.overdueRatio || "")}</td>
                <td className="text-right text-muted">{String(d.openAR || "")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Funnel Visualization ----
function FunnelViz({ kpi }: { kpi: KPIDefinition }) {
  const eligible = String(kpi.details.eligible || "0");
  const captured = String(kpi.details.captured || "0");
  const rate = String(kpi.details.captureRate || "0%");
  const missed = String(kpi.details.missedValue || "0");

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="h-8 rounded-lg bg-accent-blue/20 flex items-center px-3">
          <span className="text-xs font-medium text-accent-blue">Eligible: {eligible}</span>
        </div>
        <div className="h-8 rounded-lg bg-accent-green/20 flex items-center px-3 mt-1" style={{ width: "30%" }}>
          <span className="text-xs font-medium text-accent-green">Captured: {captured}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-accent-green font-semibold">Rate: {rate}</span>
        <span className="text-accent-red font-semibold">Missed: {missed}</span>
      </div>
    </div>
  );
}

// ---- Stacked DSO Visualization ----
function StackedDSOViz({ kpi }: { kpi: KPIDefinition }) {
  const clean = parseFloat(String(kpi.details.cleanDSO || "0"));
  const dispute = parseFloat(String(kpi.details.disputeDSO || "0"));
  const total = clean + dispute;
  const cleanPct = total > 0 ? (clean / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="h-6 rounded-full overflow-hidden bg-border flex">
        <div className="h-full bg-accent-green/70 flex items-center justify-center" style={{ width: `${cleanPct}%` }}>
          <span className="text-[9px] text-white font-bold">{clean.toFixed(1)}d</span>
        </div>
        <div className="h-full bg-accent-amber/70 flex items-center justify-center" style={{ width: `${100 - cleanPct}%` }}>
          <span className="text-[9px] text-white font-bold">{dispute.toFixed(1)}d</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-accent-green flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-accent-green/70" /> Clean DSO
        </span>
        <span className="text-accent-amber flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-accent-amber/70" /> Dispute DSO
        </span>
      </div>
    </div>
  );
}

// ---- Dual Metric Visualization ----
function DualMetricViz({ kpi }: { kpi: KPIDefinition }) {
  return (
    <div className="flex items-center gap-4 justify-center py-2">
      {Object.entries(kpi.details).map(([key, val]) => (
        <div key={key} className="text-center">
          <span className="text-[10px] text-muted block mb-0.5">{key}</span>
          <span className="text-lg font-bold">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Generic KPI Card Value ----
function KPIValueDisplay({ kpi }: { kpi: KPIDefinition }) {
  return (
    <div className="space-y-2">
      {Object.entries(kpi.details)
        .slice(0, 4)
        .map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-muted">{key}</span>
            <span className="font-medium">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
          </div>
        ))}
    </div>
  );
}

// ---- Pick visualization ----
function KPIVisualization({ kpi }: { kpi: KPIDefinition }) {
  switch (kpi.id) {
    case "ar-health-score":
      return <HealthRadar kpi={kpi} />;
    case "dso-bridge":
    case "cash-flow-leakage":
      return <WaterfallViz kpi={kpi} />;
    case "segment-efficiency":
      return <SegmentEfficiencyBar kpi={kpi} />;
    case "pbdi":
      return <PBDITable kpi={kpi} />;
    case "company-code-index":
      return <CompanyCodeTable kpi={kpi} />;
    case "discount-capture":
      return <FunnelViz kpi={kpi} />;
    case "dispute-adjusted-dso":
      return <StackedDSOViz kpi={kpi} />;
    case "terms-mix-drag":
      return <DualMetricViz kpi={kpi} />;
    default:
      return <KPIValueDisplay kpi={kpi} />;
  }
}

// Merges static KPI metadata with dynamic per-slice values so every tile
// refreshes when the (year, quarter) filter changes.
function useDynamicKPI(kpi: KPIDefinition): KPIDefinition {
  const slice = useKPIData();
  const dyn = getAdvancedKPIValues(kpi.id, slice);
  if (!dyn) return kpi;
  return {
    ...kpi,
    primaryValue: dyn.primaryValue,
    primaryUnit: dyn.primaryUnit,
    insight: dyn.insight,
    trend: dyn.trend,
    details: dyn.details,
  };
}

// ---- Advanced KPI Tile ----
function AdvancedKPITile({ kpi: staticKpi }: { kpi: KPIDefinition }) {
  const kpi = useDynamicKPI(staticKpi);
  const [showModal, setShowModal] = useState(false);
  const trend = trendConfig[kpi.trend];
  const TrendIcon = trend.icon;

  const open = () => setShowModal(true);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      className="glass-card p-4 relative group cursor-pointer transition-colors hover:border-accent-purple/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="button"
      tabIndex={0}
      aria-label={`${kpi.shortName} — open insight`}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            color: CATEGORY_COLORS[kpi.category],
            backgroundColor: CATEGORY_COLORS[kpi.category] + "12",
          }}
        >
          {kpi.categoryLabel}
        </span>
        <div className={cn("flex items-center gap-1 text-[10px]", trend.color)}>
          <TrendIcon className="w-3 h-3" />
          <span>{trend.label}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-muted mb-1">{kpi.shortName}</h3>

      {/* Business Purpose */}
      <p className="text-[11px] leading-relaxed text-muted/70 mb-3 line-clamp-2">
        {kpi.businessPurpose}
      </p>

      {/* Primary Value */}
      <div className="mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight">{kpi.primaryValue}</span>
          <span className="text-sm text-muted">{kpi.primaryUnit}</span>
        </div>
      </div>

      {/* Visualization */}
      <KPIVisualization kpi={kpi} />

      {/* AI Insight teaser — non-interactive; the whole tile is the click target */}
      <div
        className={cn(
          "mt-3 w-full rounded-lg border transition-all",
          "bg-gradient-to-r from-accent-purple/10 to-accent-blue/5",
          "border-accent-purple/25 group-hover:border-accent-purple/45"
        )}
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
            <span className="text-[10px] font-bold text-accent-purple uppercase tracking-wider">AI Insight</span>
          </div>
          <div className="flex items-center gap-0.5 text-accent-purple/70">
            <span className="text-[9px] font-medium">Click for details</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
        <p className="px-3 pb-2.5 text-[11px] leading-relaxed text-foreground/60 line-clamp-2">
          {kpi.insight}
        </p>
      </div>

      {showModal && <AdvancedKPIModal kpi={kpi} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ---- Category Section ----
function CategorySection({
  category,
  kpis,
}: {
  category: KPICategory;
  kpis: KPIDefinition[];
}) {
  if (kpis.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="w-1 h-5 rounded-full"
          style={{ backgroundColor: CATEGORY_COLORS[category] }}
        />
        <h3 className="text-sm font-semibold" style={{ color: CATEGORY_COLORS[category] }}>
          {CATEGORY_LABELS[category]}
        </h3>
        <span className="text-[10px] text-muted bg-card-hover px-2 py-0.5 rounded-full">
          {kpis.length} KPI{kpis.length > 1 ? "s" : ""}
        </span>
      </div>
      <div
        className={cn(
          "grid gap-4",
          kpis.length === 1
            ? "grid-cols-1"
            : kpis.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {kpis.map((kpi) => (
          <AdvancedKPITile key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}

// ---- Main Advanced Dashboard ----
export function AdvancedDashboard() {
  const { kpiEnabled } = useDashboard();
  const enabledKPIs = getEnabledKPIs("advanced", kpiEnabled);
  const categories = getCategoriesForSection("advanced");
  const quarterLabel = useQuarterLabel();

  return (
    <section className="space-y-8">
      <SectionHeader
        icon={Layers}
        title="Advanced KPIs"
        subtitle={`${enabledKPIs.length} metrics · ${quarterLabel}`}
        iconColor="text-accent-purple"
      />

      {enabledKPIs.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted text-sm">No KPIs enabled. Go to Admin to enable KPIs.</p>
        </div>
      ) : (
        categories.map((cat) => {
          const catKPIs = enabledKPIs.filter((k) => k.category === cat);
          return <CategorySection key={cat} category={cat} kpis={catKPIs} />;
        })
      )}
    </section>
  );
}
