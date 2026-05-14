"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getDefaultEnabledMap } from "@/lib/kpi-registry";

export type ActiveSection = "basic" | "advanced" | "ai-insights" | "admin";

export interface FilterState {
  fiscalYear: number;
  quarter: "All" | "Q1" | "Q2" | "Q3" | "Q4";
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

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSectionRaw] = useState<ActiveSection>("basic");
  const [filters, setFilters] = useState<FilterState>({
    fiscalYear: 2026,
    quarter: "Q4",
  });
  const [kpiEnabled, setKpiEnabledMap] = useState<Record<string, boolean>>(getDefaultEnabledMap);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KPI);
      if (saved) {
        const parsed = JSON.parse(saved);
        setKpiEnabledMap((prev) => ({ ...prev, ...parsed }));
      }
      const savedSection = localStorage.getItem(STORAGE_KEY_SECTION);
      if (savedSection) {
        setActiveSectionRaw(savedSection as ActiveSection);
      }
    } catch {
      // Ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist KPI config
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY_KPI, JSON.stringify(kpiEnabled));
    }
  }, [kpiEnabled, hydrated]);

  const setActiveSection = useCallback((s: ActiveSection) => {
    setActiveSectionRaw(s);
    localStorage.setItem(STORAGE_KEY_SECTION, s);
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
