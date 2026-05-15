"use client";

import { useDashboard, type FiscalYear, type QuarterFilter } from "@/context/dashboard-context";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const FISCAL_YEARS: FiscalYear[] = [2024, 2025, 2026];
const FY_LABELS: Record<FiscalYear, string> = {
  2024: "23-24",
  2025: "24-25",
  2026: "25-26",
};

const QUARTERS: QuarterFilter[] = ["All", "Q1", "Q2", "Q3", "Q4"];

export function GlobalFilters() {
  const { filters, setFilters, activeSection } = useDashboard();
  if (activeSection === "admin") return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* FY pill group */}
      <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs shadow-[var(--shadow-xs)]">
        <span className="inline-flex items-center gap-1 px-2 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className="hidden lg:inline text-[10px] uppercase tracking-wider font-medium">FY</span>
        </span>
        {FISCAL_YEARS.map((fy) => (
          <button
            key={fy}
            onClick={() => setFilters({ ...filters, fiscalYear: fy })}
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium transition-colors numeric",
              filters.fiscalYear === fy
                ? "bg-secondary text-foreground shadow-[var(--shadow-xs)]"
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            )}
            aria-pressed={filters.fiscalYear === fy}
          >
            {FY_LABELS[fy]}
          </button>
        ))}
      </div>

      {/* Quarter pill group */}
      <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-[var(--shadow-xs)]">
        {QUARTERS.map((q) => (
          <button
            key={q}
            onClick={() => setFilters({ ...filters, quarter: q })}
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium transition-colors",
              filters.quarter === q
                ? "bg-secondary text-foreground shadow-[var(--shadow-xs)]"
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            )}
            aria-pressed={filters.quarter === q}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
