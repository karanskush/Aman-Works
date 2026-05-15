"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus, AlertCircle } from "lucide-react";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneRing: Record<Tone, string> = {
  success: "bg-accent-green",
  warning: "bg-accent-amber",
  danger: "bg-accent-red",
  info: "bg-accent-blue",
  neutral: "bg-muted-foreground",
};

const toneText: Record<Tone, string> = {
  success: "text-accent-green",
  warning: "text-accent-amber",
  danger: "text-accent-red",
  info: "text-accent-blue",
  neutral: "text-muted-foreground",
};

export function StatusDot({ tone = "neutral", pulse = false, className }: { tone?: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse && <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", toneRing[tone])} />}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", toneRing[tone])} />
    </span>
  );
}

export type TrendDirection = "up" | "down" | "stable" | "warning";

const directionConfig: Record<TrendDirection, { Icon: typeof TrendingUp; tone: Tone; label: string }> = {
  up: { Icon: TrendingUp, tone: "success", label: "Improving" },
  down: { Icon: TrendingDown, tone: "danger", label: "Declining" },
  stable: { Icon: Minus, tone: "info", label: "Stable" },
  warning: { Icon: AlertCircle, tone: "warning", label: "Watch" },
};

export function TrendChip({
  direction,
  label,
  className,
}: {
  direction: TrendDirection;
  label?: string;
  className?: string;
}) {
  const c = directionConfig[direction];
  const Icon = c.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        "bg-card-hover ring-1 ring-inset ring-border",
        toneText[c.tone],
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{label ?? c.label}</span>
    </span>
  );
}

/** Inline delta with up/down arrow, sized for tile use. */
export function DeltaInline({
  value,
  tone = "neutral",
  className,
}: {
  value: string;
  tone?: Tone;
  className?: string;
}) {
  const Icon = tone === "success" ? TrendingUp : tone === "danger" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium numeric", toneText[tone], className)}>
      <Icon className="h-3 w-3" />
      {value}
    </span>
  );
}
