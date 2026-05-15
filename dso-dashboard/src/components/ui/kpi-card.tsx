"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { KPIInsight } from "@/lib/data";
import { useKpiInsight } from "@/lib/use-kpi-data";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendChip, type TrendDirection } from "@/components/ui/status";
import {
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
  /** Optional KPI registry id. When provided, the detail modal renders the data-driven observation / recommendation / next action for the active slice. */
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

const stripeFor: Record<TrendDirection, string> = {
  up: "status-stripe-success",
  down: "status-stripe-danger",
  stable: "status-stripe-info",
  warning: "status-stripe-warning",
};

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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-md p-0 sm:p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6 space-y-5 border border-border shadow-[var(--shadow-lg)] max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-base font-semibold tracking-tight">{title}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Insight · current filter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-card-hover transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
            <Info className="w-3 h-3" />
            Business Purpose
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{insight.businessPurpose}</p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
            <Calculator className="w-3 h-3" />
            Formula
          </div>
          <p className="text-xs font-mono text-foreground/85 leading-relaxed bg-secondary/60 rounded-md border border-border px-3 py-2">
            {insight.formula}
          </p>
        </section>

        {dynamic ? (
          <div className="space-y-3">
            <section className="rounded-lg ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-blue)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent-blue)_6%,transparent)] p-3.5">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-blue">
                <Eye className="w-3 h-3" />
                Key Observation
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{dynamic.observation}</p>
            </section>

            <section className="rounded-lg ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-amber)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent-amber)_6%,transparent)] p-3.5">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-amber">
                <Lightbulb className="w-3 h-3" />
                Recommendation
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{dynamic.recommendation}</p>
            </section>

            <section className="rounded-lg ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-green)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent-green)_6%,transparent)] p-3.5">
              <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-accent-green">
                <ArrowRight className="w-3 h-3" />
                Next Action
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{dynamic.nextAction}</p>
            </section>
          </div>
        ) : (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
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
  const dynamic = useKpiInsight(kpiId ?? "");
  const stripe = stripeFor[insight.trend] ?? "status-stripe-neutral";

  const open = () => setShowDetail(true);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  return (
    <Card
      className={cn(
        "p-5 relative group cursor-pointer overflow-hidden",
        "hover:border-border-strong",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        stripe,
        glowClass,
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`${title} — open insight`}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      {/* Header: title + info tooltip + trend chip */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground truncate">
            {title}
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-hidden
                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 group-hover:text-primary transition-colors"
              >
                <Info className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
              <span className="font-medium block mb-1 text-foreground">{title}</span>
              <span className="text-muted-foreground leading-snug">{insight.businessPurpose}</span>
              <span className="block text-primary/80 mt-1.5 text-[10px] uppercase tracking-wider font-semibold">
                Click for insight
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
        <TrendChip direction={insight.trend} />
      </div>

      {/* Value */}
      {!compact && value !== "" && (
        <div className="mb-4">
          <div className="flex items-baseline gap-1 display">
            {prefix && <span className="text-xl text-muted-foreground">{prefix}</span>}
            <span className="text-[34px] font-semibold tracking-[-0.02em] text-foreground numeric leading-none">
              {value}
            </span>
            {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
          </div>
          {valueLabel && (
            <span className="block text-[10px] text-muted-foreground/80 mt-1.5">{valueLabel}</span>
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
