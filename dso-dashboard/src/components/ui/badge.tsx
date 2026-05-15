"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-foreground",
        outline: "border border-border text-foreground bg-transparent",
        soft: "bg-card-hover text-foreground",
        success: "bg-[color-mix(in_oklab,var(--accent-green)_12%,transparent)] text-accent-green ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-green)_28%,transparent)]",
        warning: "bg-[color-mix(in_oklab,var(--accent-amber)_14%,transparent)] text-accent-amber ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-amber)_32%,transparent)]",
        danger: "bg-[color-mix(in_oklab,var(--accent-red)_12%,transparent)] text-accent-red ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-red)_28%,transparent)]",
        info: "bg-[color-mix(in_oklab,var(--accent-blue)_12%,transparent)] text-accent-blue ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent-blue)_28%,transparent)]",
        neutral: "bg-card-hover text-muted-foreground",
        primary: "bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-primary",
      },
      size: {
        default: "h-5",
        sm: "h-[18px] px-1.5 text-[9px]",
        lg: "h-6 px-2.5 text-[11px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
