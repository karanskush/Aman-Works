"use client";

import { useDashboard } from "@/context/dashboard-context";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FISCAL_YEARS = [2026];
const FY_LABELS: Record<number, string> = {
  2026: "2025-26",
};
const QUARTERS = ["All", "Q1", "Q2", "Q3", "Q4"] as const;
const QUARTER_LABELS: Record<string, string> = {
  All: "Full Year",
  Q1: "Q1 (Apr–Jun '25)",
  Q2: "Q2 (Jul–Sep '25)",
  Q3: "Q3 (Oct–Dec '25)",
  Q4: "Q4 (Jan–Mar '26)",
};

export function GlobalFilters() {
  const { filters, setFilters, activeSection } = useDashboard();

  if (activeSection === "admin") return null;

  const fyLabel = FY_LABELS[filters.fiscalYear] || String(filters.fiscalYear);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* FY Selector */}
      <div className="relative">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs cursor-default">
          <Calendar className="w-3.5 h-3.5 text-muted" />
          <span className="text-muted">FY</span>
          <select
            value={filters.fiscalYear}
            onChange={(e) =>
              setFilters({ ...filters, fiscalYear: parseInt(e.target.value) })
            }
            className="bg-transparent text-foreground font-medium outline-none cursor-pointer appearance-none pr-4"
          >
            {FISCAL_YEARS.map((fy) => (
              <option key={fy} value={fy}>
                {FY_LABELS[fy] || fy}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-muted absolute right-2" />
        </div>
      </div>

      {/* Quarter Tabs */}
      <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
        {QUARTERS.map((q) => (
          <button
            key={q}
            onClick={() => setFilters({ ...filters, quarter: q })}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all duration-200",
              filters.quarter === q
                ? "bg-accent-blue text-white shadow-sm"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            )}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Active Filter Label */}
      <span className="text-[10px] text-muted/60 hidden sm:inline">
        {QUARTER_LABELS[filters.quarter]} · FY {fyLabel}
      </span>
    </div>
  );
}
