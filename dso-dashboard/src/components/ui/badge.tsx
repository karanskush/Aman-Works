"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-secondary text-foreground",
        outline: "border border-border text-foreground",
        success: "bg-accent-green/12 text-accent-green",
        warning: "bg-accent-amber/12 text-accent-amber",
        danger: "bg-accent-red/12 text-accent-red",
        info: "bg-accent-blue/12 text-accent-blue",
        neutral: "bg-card-hover text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
