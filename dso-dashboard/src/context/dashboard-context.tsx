"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getDefaultEnabledMap } from "@/lib/kpi-registry";

export type ActiveSection = "basic" | "advanced" | "ai-insights" | "admin";
export type FiscalYear = 2024 | 2025 | 2026;
export type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";
export type Theme = "light" | "dark";
export type Density = "compact" | "default" | "comfortable";

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
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  density: Density;
  setDensity: (d: Density) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const STORAGE_KEY_KPI = "dso-kpi-config";
const STORAGE_KEY_SECTION = "dso-active-section";
const STORAGE_KEY_FILTERS = "dso-filters";
const STORAGE_KEY_THEME = "dso-theme";
const STORAGE_KEY_DENSITY = "dso-density";

const DEFAULT_FILTERS: FilterState = { fiscalYear: 2026, quarter: "All" };

function isValidFY(v: unknown): v is FiscalYear {
  return v === 2024 || v === 2025 || v === 2026;
}
function isValidQuarter(v: unknown): v is QuarterFilter {
  return v === "All" || v === "Q1" || v === "Q2" || v === "Q3" || v === "Q4";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = theme;
}

function applyDensity(density: Density) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("density-compact", "density-comfortable");
  if (density === "compact") root.classList.add("density-compact");
  else if (density === "comfortable") root.classList.add("density-comfortable");
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSectionRaw] = useState<ActiveSection>("basic");
  const [filters, setFiltersRaw] = useState<FilterState>(DEFAULT_FILTERS);
  const [kpiEnabled, setKpiEnabledMap] = useState<Record<string, boolean>>(getDefaultEnabledMap);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setThemeRaw] = useState<Theme>("light");
  const [density, setDensityRaw] = useState<Density>("default");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage (one-shot on mount). Server render uses defaults
  // so HTML matches the first client paint; we apply user prefs in a layout effect.
  useEffect(() => {
    try {
      const savedKpi = localStorage.getItem(STORAGE_KEY_KPI);
      if (savedKpi) setKpiEnabledMap((prev) => ({ ...prev, ...JSON.parse(savedKpi) }));

      const savedSection = localStorage.getItem(STORAGE_KEY_SECTION);
      if (savedSection) setActiveSectionRaw(savedSection as ActiveSection);

      const savedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters) as Partial<FilterState>;
        const fy = isValidFY(parsed?.fiscalYear) ? parsed.fiscalYear : DEFAULT_FILTERS.fiscalYear;
        const q = isValidQuarter(parsed?.quarter) ? parsed.quarter : DEFAULT_FILTERS.quarter;
        setFiltersRaw({ fiscalYear: fy, quarter: q });
      }

      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme: Theme = savedTheme ?? (prefersDark ? "dark" : "light");
      setThemeRaw(initialTheme);
      applyTheme(initialTheme);

      const savedDensity = localStorage.getItem(STORAGE_KEY_DENSITY) as Density | null;
      if (savedDensity === "compact" || savedDensity === "default" || savedDensity === "comfortable") {
        setDensityRaw(savedDensity);
        applyDensity(savedDensity);
      }
    } catch {
      // ignore — keep defaults
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY_KPI, JSON.stringify(kpiEnabled));
  }, [kpiEnabled, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
  }, [filters, hydrated]);

  const setActiveSection = useCallback((s: ActiveSection) => {
    setActiveSectionRaw(s);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY_SECTION, s);
  }, []);

  const setFilters = useCallback((f: FilterState) => setFiltersRaw(f), []);

  const setTheme = useCallback((t: Theme) => {
    setThemeRaw(t);
    applyTheme(t);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY_THEME, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeRaw((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY_THEME, next);
      return next;
    });
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityRaw(d);
    applyDensity(d);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY_DENSITY, d);
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
        theme,
        setTheme,
        toggleTheme,
        density,
        setDensity,
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
