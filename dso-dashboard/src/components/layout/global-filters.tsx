"use client";

import { useDashboard, type FiscalYear, type QuarterFilter } from "@/context/dashboard-context";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FISCAL_YEARS: FiscalYear[] = [2024, 2025, 2026];
const FY_LABELS: Record<FiscalYear, string> = {
  2024: "2023-24",
  2025: "2024-25",
  2026: "2025-26",
};

const QUARTERS: QuarterFilter[] = ["All", "Q1", "Q2", "Q3", "Q4"];

// Build a quarter label like "Q1 (Apr–Jun '23)" given the selected FY.
function quarterDisplay(q: QuarterFilter, fy: FiscalYear): string {
  if (q === "All") return "Full Year";
  const fyShortPrev = (fy - 1).toString().slice(2); // e.g. 2024 → "23"
  const fyShortCur = fy.toString().slice(2);
  switch (q) {
    case "Q1": return `Q1 (Apr–Jun '${fyShortPrev})`;
    case "Q2": return `Q2 (Jul–Sep '${fyShortPrev})`;
    case "Q3": return `Q3 (Oct–Dec '${fyShortPrev})`;
    case "Q4": return `Q4 (Jan–Mar '${fyShortCur})`;
  }
}

export function GlobalFilters() {
  const { filters, setFilters, activeSection } = useDashboard();

  if (activeSection === "admin") return null;

  const fyLabel = FY_LABELS[filters.fiscalYear];

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
              setFilters({ ...filters, fiscalYear: parseInt(e.target.value, 10) as FiscalYear })
            }
            className="bg-transparent text-foreground font-medium outline-none cursor-pointer appearance-none pr-4"
          >
            {FISCAL_YEARS.map((fy) => (
              <option key={fy} value={fy}>
                {FY_LABELS[fy]}
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

      <span className="text-[10px] text-muted/60 hidden sm:inline">
        {quarterDisplay(filters.quarter, filters.fiscalYear)} · FY {fyLabel}
      </span>
    </div>
  );
}
