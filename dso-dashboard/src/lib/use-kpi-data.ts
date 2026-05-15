"use client";

import { useMemo } from "react";
import { useDashboard } from "@/context/dashboard-context";
import {
  COMPUTED_KPI_DATA,
  EMPTY_QUARTER_DATA,
  type QuarterKey,
  type QuarterData,
  type FYKey,
} from "./computed-kpis";

/**
 * Returns the pre-computed KPI slice matching the current (fiscalYear, quarter) filter.
 * Data is statically imported — no network calls.
 */
export function useKPIData(): QuarterData {
  const { filters } = useDashboard();
  const fy = filters.fiscalYear as FYKey;
  const quarter = filters.quarter as QuarterKey;
  return useMemo(() => COMPUTED_KPI_DATA[fy]?.[quarter] ?? EMPTY_QUARTER_DATA, [fy, quarter]);
}

const FY_LABELS: Record<FYKey, string> = {
  2024: "FY 2023-24",
  2025: "FY 2024-25",
  2026: "FY 2025-26",
};

/**
 * Human-readable label for the current filter, e.g. "Q1 (Apr–Jun '23) · FY 2023-24".
 */
export function useQuarterLabel(): string {
  const { filters } = useDashboard();
  const fy = filters.fiscalYear as FYKey;
  const fyLabel = FY_LABELS[fy];
  const prevShort = (fy - 1).toString().slice(2);
  const curShort = fy.toString().slice(2);
  const map: Record<QuarterKey, string> = {
    All: `Full Year · ${fyLabel}`,
    Q1: `Q1 (Apr–Jun '${prevShort}) · ${fyLabel}`,
    Q2: `Q2 (Jul–Sep '${prevShort}) · ${fyLabel}`,
    Q3: `Q3 (Oct–Dec '${prevShort}) · ${fyLabel}`,
    Q4: `Q4 (Jan–Mar '${curShort}) · ${fyLabel}`,
  };
  return map[filters.quarter as QuarterKey] ?? fyLabel;
}
