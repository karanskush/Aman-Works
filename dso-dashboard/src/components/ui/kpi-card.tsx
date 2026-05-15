"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { KPIInsight } from "@/lib/data";
import { useKpiInsight } from "@/lib/use-kpi-data";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  X,
  Sparkles,
  Info,
  Calculator,
  Eye,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

interface KPICardProps {
  title: string;
  /** Optional KPI registry id. When provided, the detail modal renders the data-driven observation / recommendation / next action for this slice. */
  kpiId?: string;
  value: string | number;
  suffix?: string;
  prefix?: string;
  valueLabel?: string;
  insight: KPIInsight;
  glowClass?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-accent-green", label: "Improving" },
  down: { icon: TrendingDown, color: "text-accent-red", label: "Declining" },
  stable: { icon: Minus, color: "text-muted-foreground", label: "Stable" },
  warning: { icon: AlertTriangle, color: "text-accent-amber", label: "Watch" },
} as const;

function DetailModal({
  title,
  insight,
  dynamic,
  onClose,
}: {
  title: string;
  insight: KPIInsight;
  dynamic?: { observation: string; recommendation: string; nextAction: string };
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const trend = trendConfig[insight.trend];
  const TrendIcon = trend.icon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground w-full sm:max-w-lg sm:rounded-xl rounded-t-xl p-5 space-y-4 border border-border shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold">{title}</h4>
            <span className={cn("inline-flex items-center gap-1 text-[11px]", trend.color)}>
              <TrendIcon className="h-3.5 w-3.5" />
              {trend.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-card-hover transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <section>
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Info className="w-3 h-3" />
            Business Purpose
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{insight.businessPurpose}</p>
        </section>

        <section>
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Calculator className="w-3 h-3" />
            Formula
          </div>
          <p className="text-xs font-mono text-foreground/85 leading-relaxed bg-card-hover/60 rounded-md border border-border px-3 py-2">
            {insight.formula}
          </p>
        </section>

        {dynamic ? (
          <>
            <section className="rounded-md border border-accent-blue/25 bg-accent-blue/5 p-3">
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-accent-blue">
                <Eye className="w-3 h-3" />
                Key Observation
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{dynamic.observation}</p>
            </section>

            <section className="rounded-md border border-accent-amber/25 bg-accent-amber/5 p-3">
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-accent-amber">
                <Lightbulb className="w-3 h-3" />
                Recommendation
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{dynamic.recommendation}</p>
            </section>

            <section className="rounded-md border border-accent-green/25 bg-accent-green/5 p-3">
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-accent-green">
                <ArrowRight className="w-3 h-3" />
                Next Action
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{dynamic.nextAction}</p>
            </section>
          </>
        ) : (
          <section>
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              AI Insight
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">{insight.aiInsight}</p>
          </section>
        )}
      </div>
    </div>,
    document.body
  );
}

export function KPICard({
  title,
  kpiId,
  value,
  suffix,
  prefix,
  valueLabel,
  insight,
  glowClass,
  children,
  className,
  compact,
}: KPICardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const trend = trendConfig[insight.trend];
  const TrendIcon = trend.icon;
  const dynamic = useKpiInsight(kpiId ?? "");

  return (
    <Card className={cn("p-4 relative group", glowClass, className)}>
      {/* Header: title · info tooltip · trend chip */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowDetail(true)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground transition-colors"
                aria-label="Details"
              >
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
              <span className="font-medium block mb-1">{title}</span>
              <span className="text-muted-foreground leading-snug">{insight.businessPurpose}</span>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium shrink-0", trend.color)}>
          <TrendIcon className="h-3 w-3" />
          <span className="hidden sm:inline">{trend.label}</span>
        </span>
      </div>

      {/* Value */}
      {!compact && value !== "" && (
        <div className="mb-3">
          <div className="flex items-baseline gap-1 numeric">
            {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
            <span className="text-3xl font-semibold tracking-tight text-foreground">{value}</span>
            {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
          </div>
          {valueLabel && (
            <span className="text-[10px] text-muted-foreground/80">{valueLabel}</span>
          )}
        </div>
      )}

      {/* Chart / Content area */}
      {children}

      {showDetail && (
        <DetailModal title={title} insight={insight} dynamic={dynamic} onClose={() => setShowDetail(false)} />
      )}
    </Card>
  );
}
