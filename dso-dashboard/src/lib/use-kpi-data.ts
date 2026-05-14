"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/dashboard-context";
import { COMPUTED_KPI_DATA, type QuarterKey, type QuarterData } from "./computed-kpis";

/**
 * Hook that returns pre-computed KPI data filtered by the current dashboard context.
 * Reads the quarter filter from DashboardContext and returns the corresponding data slice.
 * No network calls — data is statically imported from the pre-computed module.
 */
export function useKPIData(): QuarterData {
  const { filters } = useDashboard();
  const quarter: QuarterKey = filters.quarter === "All" ? "All" : filters.quarter;

  return useMemo(() => COMPUTED_KPI_DATA[quarter], [quarter]);
}

/**
 * Returns just the quarter label for display purposes.
 */
export function useQuarterLabel(): string {
  const { filters } = useDashboard();
  const labels: Record<string, string> = {
    All: "Full Year FY2026",
    Q1: "Q1 (Apr–Jun) FY2026",
    Q2: "Q2 (Jul–Sep) FY2026",
    Q3: "Q3 (Oct–Dec) FY2026",
    Q4: "Q4 (Jan–Mar) FY2026",
  };
  return labels[filters.quarter] || "FY2026";
}
