"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getDefaultEnabledMap } from "@/lib/kpi-registry";

export type ActiveSection = "basic" | "advanced" | "ai-insights" | "admin";

export type FiscalYear = 2024 | 2025 | 2026;
export type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";

export interface FilterState {
  fiscalYear: FiscalYear;
  quarter: QuarterFilter;
}

interface DashboardContextValue {
  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  kpiEnabled: Record<string, boolean>;
  toggleKPI: (id: string) => void;
  setKPIEnabled: (id: string, enabled: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const STORAGE_KEY_KPI = "dso-kpi-config";
const STORAGE_KEY_SECTION = "dso-active-section";
const STORAGE_KEY_FILTERS = "dso-filters";

const DEFAULT_FILTERS: FilterState = { fiscalYear: 2026, quarter: "All" };

function isValidFY(v: unknown): v is FiscalYear {
  return v === 2024 || v === 2025 || v === 2026;
}
function isValidQuarter(v: unknown): v is QuarterFilter {
  return v === "All" || v === "Q1" || v === "Q2" || v === "Q3" || v === "Q4";
}

function loadInitialState() {
  if (typeof window === "undefined") {
    return {
      activeSection: "basic" as ActiveSection,
      filters: DEFAULT_FILTERS,
      kpiEnabled: getDefaultEnabledMap(),
    };
  }
  let activeSection: ActiveSection = "basic";
  let filters: FilterState = DEFAULT_FILTERS;
  let kpiEnabled: Record<string, boolean> = getDefaultEnabledMap();
  try {
    const saved = localStorage.getItem(STORAGE_KEY_KPI);
    if (saved) kpiEnabled = { ...kpiEnabled, ...JSON.parse(saved) };
    const savedSection = localStorage.getItem(STORAGE_KEY_SECTION);
    if (savedSection) activeSection = savedSection as ActiveSection;
    const savedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters) as Partial<FilterState>;
      const fy = isValidFY(parsed?.fiscalYear) ? parsed.fiscalYear : DEFAULT_FILTERS.fiscalYear;
      const q = isValidQuarter(parsed?.quarter) ? parsed.quarter : DEFAULT_FILTERS.quarter;
      filters = { fiscalYear: fy, quarter: q };
    }
  } catch {
    // Ignore parse errors — fall back to defaults
  }
  return { activeSection, filters, kpiEnabled };
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  // Note: lazy initializer reads localStorage once on mount.
  const initial = useState(loadInitialState)[0];
  const [activeSection, setActiveSectionRaw] = useState<ActiveSection>(initial.activeSection);
  const [filters, setFiltersRaw] = useState<FilterState>(initial.filters);
  const [kpiEnabled, setKpiEnabledMap] = useState<Record<string, boolean>>(initial.kpiEnabled);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY_KPI, JSON.stringify(kpiEnabled));
    }
  }, [kpiEnabled, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
    }
  }, [filters, hydrated]);

  const setActiveSection = useCallback((s: ActiveSection) => {
    setActiveSectionRaw(s);
    localStorage.setItem(STORAGE_KEY_SECTION, s);
  }, []);

  const setFilters = useCallback((f: FilterState) => {
    setFiltersRaw(f);
  }, []);

  const toggleKPI = useCallback((id: string) => {
    setKpiEnabledMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setKPIEnabled = useCallback((id: string, enabled: boolean) => {
    setKpiEnabledMap((prev) => ({ ...prev, [id]: enabled }));
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        activeSection,
        setActiveSection,
        filters,
        setFilters,
        kpiEnabled,
        toggleKPI,
        setKPIEnabled,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
