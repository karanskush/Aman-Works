"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { KPIInsight } from "@/lib/data";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, X, Sparkles, Info } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  suffix?: string;
  prefix?: string;
  insight: KPIInsight;
  glowClass?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-accent-green", label: "Improving" },
  down: { icon: TrendingDown, color: "text-accent-red", label: "Declining" },
  stable: { icon: Minus, color: "text-accent-blue", label: "Stable" },
  warning: { icon: AlertTriangle, color: "text-accent-amber", label: "Needs Attention" },
};

export function KPICard({
  title,
  value,
  suffix,
  prefix,
  insight,
  glowClass,
  children,
  className,
  compact,
}: KPICardProps) {
  const [showInsight, setShowInsight] = useState(false);
  const trend = trendConfig[insight.trend];
  const TrendIcon = trend.icon;

  return (
    <div className={cn("glass-card p-5 relative group", glowClass, className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted">{title}</h3>
          <button
            onClick={() => setShowInsight(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Show insight"
          >
            <Info className="w-3.5 h-3.5 text-muted hover:text-accent-blue transition-colors" />
          </button>
        </div>
        <div className={cn("flex items-center gap-1 text-xs", trend.color)}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{trend.label}</span>
        </div>
      </div>

      {/* Value */}
      {!compact && (
        <div className="flex items-baseline gap-1 mb-4">
          {prefix && <span className="text-lg text-muted">{prefix}</span>}
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {suffix && <span className="text-lg text-muted">{suffix}</span>}
        </div>
      )}

      {/* Chart / Content area */}
      {children}

      {/* Insight Modal */}
      {showInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowInsight(false)}
        >
          <div
            className="glass-card max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold gradient-text">{title}</h4>
              <button onClick={() => setShowInsight(false)}>
                <X className="w-5 h-5 text-muted hover:text-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <Info className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">Business Purpose</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{insight.businessPurpose}</p>
              </div>

              <div className="p-3 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-accent-purple" />
                  <span className="text-xs font-semibold text-accent-purple uppercase tracking-wider">AI Insight</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{insight.aiInsight}</p>
              </div>
            </div>

            <div className={cn("flex items-center gap-2 text-sm px-1", trend.color)}>
              <TrendIcon className="w-4 h-4" />
              <span>Status: {trend.label}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
