"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { KPIInsight } from "@/lib/data";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, X, Sparkles, Info, ChevronRight, Calculator } from "lucide-react";

interface KPICardProps {
  title: string;
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
  up: { icon: TrendingUp, color: "text-accent-green", bg: "bg-accent-green/10", label: "Improving" },
  down: { icon: TrendingDown, color: "text-accent-red", bg: "bg-accent-red/10", label: "Declining" },
  stable: { icon: Minus, color: "text-accent-blue", bg: "bg-accent-blue/10", label: "Stable" },
  warning: { icon: AlertTriangle, color: "text-accent-amber", bg: "bg-accent-amber/10", label: "Needs Attention" },
};

function DetailModal({
  title,
  insight,
  trend,
  TrendIcon,
  onClose,
}: {
  title: string;
  insight: KPIInsight;
  trend: (typeof trendConfig)[keyof typeof trendConfig];
  TrendIcon: React.ComponentType<{ className?: string }>;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
          <h4 className="text-lg font-semibold gradient-text pr-4">{title}</h4>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-full hover:bg-card-hover active:bg-border transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="p-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Info className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider">
                Business Purpose
              </span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              {insight.businessPurpose}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-accent-green/10 border border-accent-green/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Calculator className="w-3.5 h-3.5 text-accent-green" />
              <span className="text-[10px] font-bold text-accent-green uppercase tracking-wider">
                Formula
              </span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-mono">
              {insight.formula}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
              <span className="text-[10px] font-bold text-accent-purple uppercase tracking-wider">
                AI Insight
              </span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              {insight.aiInsight}
            </p>
          </div>
        </div>

        <div className={cn("flex items-center gap-2 text-sm px-1", trend.color)}>
          <TrendIcon className="w-4 h-4" />
          <span>Status: {trend.label}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function KPICard({
  title,
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

  return (
    <div className={cn("glass-card p-4 relative group", glowClass, className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-muted">{title}</h3>
        <div className={cn("flex items-center gap-1 text-xs shrink-0 ml-2", trend.color)}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{trend.label}</span>
        </div>
      </div>

      {/* Business Purpose — always visible */}
      <p className="text-[11px] leading-relaxed text-muted/70 mb-3 line-clamp-2">
        {insight.businessPurpose}
      </p>

      {/* Value */}
      {!compact && (
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            {prefix && <span className="text-lg text-muted">{prefix}</span>}
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            {suffix && <span className="text-lg text-muted">{suffix}</span>}
          </div>
          {valueLabel && (
            <span className="text-[10px] text-muted/60 font-medium uppercase tracking-wider">{valueLabel}</span>
          )}
        </div>
      )}

      {/* Chart / Content area */}
      {children}

      {/* AI Insight Strip — clickable to open detail popup */}
      <button
        onClick={() => setShowDetail(true)}
        className={cn(
          "mt-3 w-full rounded-lg border transition-all text-left cursor-pointer",
          "bg-gradient-to-r from-accent-purple/10 to-accent-blue/5",
          "border-accent-purple/25 hover:border-accent-purple/40",
          "hover:from-accent-purple/15 hover:to-accent-blue/10",
          "hover:shadow-md hover:shadow-accent-purple/5",
          "active:scale-[0.99]"
        )}
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
            <span className="text-[10px] font-bold text-accent-purple uppercase tracking-wider">
              AI Insight
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-accent-purple/70">
            <span className="text-[9px] font-medium">View Details</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
        <p className="px-3 pb-2.5 text-[11px] leading-relaxed text-foreground/60 line-clamp-2">
          {insight.aiInsight}
        </p>
      </button>

      {/* Full Detail Modal — portaled to body */}
      {showDetail && (
        <DetailModal
          title={title}
          insight={insight}
          trend={trend}
          TrendIcon={TrendIcon}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}
