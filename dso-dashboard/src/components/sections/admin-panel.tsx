"use client";

import { useDashboard } from "@/context/dashboard-context";
import {
  KPI_REGISTRY,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type KPICategory,
} from "@/lib/kpi-registry";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Settings2,
  Search,
  Eye,
  EyeOff,
  Filter,
  Check,
} from "lucide-react";
import { useState, useMemo } from "react";

type SectionFilter = "all" | "basic" | "advanced" | "ai-insights";

const SECTION_FILTERS: { value: SectionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "ai-insights", label: "AI Insights" },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        checked ? "bg-primary" : "bg-card-hover ring-1 ring-inset ring-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-[var(--shadow-xs)] transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

function sectionBadge(s: string) {
  switch (s) {
    case "basic": return { label: "Basic", className: "bg-[color-mix(in_oklab,var(--accent-blue)_12%,transparent)] text-accent-blue" };
    case "advanced": return { label: "Advanced", className: "bg-[color-mix(in_oklab,var(--accent-purple)_12%,transparent)] text-accent-purple" };
    case "ai-insights": return { label: "AI Insights", className: "bg-[color-mix(in_oklab,var(--accent-cyan)_12%,transparent)] text-accent-cyan" };
    default: return { label: s, className: "bg-card-hover text-muted-foreground" };
  }
}

export function AdminPanel() {
  const { kpiEnabled, toggleKPI, setKPIEnabled } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<KPICategory | "all">("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");

  const filteredKPIs = useMemo(() => {
    return KPI_REGISTRY.filter((kpi) => {
      const matchesSearch =
        searchQuery === "" ||
        kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || kpi.category === categoryFilter;
      const matchesSection = sectionFilter === "all" || kpi.dashboardSection === sectionFilter;
      return matchesSearch && matchesCategory && matchesSection;
    });
  }, [searchQuery, categoryFilter, sectionFilter]);

  const enabledCount = KPI_REGISTRY.filter((kpi) => kpiEnabled[kpi.id] !== false).length;
  const totalCount = KPI_REGISTRY.length;

  const categories = [...new Set(KPI_REGISTRY.map((k) => k.category))];

  const handleBulkToggle = (enabled: boolean) => {
    filteredKPIs.forEach((kpi) => setKPIEnabled(kpi.id, enabled));
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        icon={Settings2}
        title="Administration"
        subtitle={`${enabledCount} of ${totalCount} KPIs active · changes apply instantly`}
        iconColor="text-primary"
      />

      {/* Controls */}
      <Card className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, category, section…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-md bg-background border border-input text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-ring focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            <Filter className="w-3 h-3" />
            Section
          </span>
          <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
            {SECTION_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSectionFilter(s.value)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  sectionFilter === s.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="hidden md:inline text-border">·</span>

          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as KPICategory | "all")}
            className="h-8 px-2.5 rounded-md text-xs bg-card border border-border text-foreground outline-none cursor-pointer hover:border-border-strong focus:ring-2 focus:ring-ring focus:border-ring transition-all"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          <span className="ml-auto inline-flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => handleBulkToggle(true)}>
              <Eye className="w-3 h-3" /> Enable all
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkToggle(false)}>
              <EyeOff className="w-3 h-3" /> Disable all
            </Button>
          </span>
        </div>
      </Card>

      {/* KPI table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm admin-table">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[10px] uppercase tracking-[0.12em] w-12">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[10px] uppercase tracking-[0.12em]">
                  KPI
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[10px] uppercase tracking-[0.12em] hidden md:table-cell">
                  Category
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[10px] uppercase tracking-[0.12em] hidden lg:table-cell">
                  Section
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[10px] uppercase tracking-[0.12em] hidden xl:table-cell max-w-[300px]">
                  Business Purpose
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground text-[10px] uppercase tracking-[0.12em] w-24">
                  Visible
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredKPIs.map((kpi) => {
                const isEnabled = kpiEnabled[kpi.id] !== false;
                const secBadge = sectionBadge(kpi.dashboardSection);
                return (
                  <tr
                    key={kpi.id}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      isEnabled ? "hover:bg-card-hover/60" : "opacity-55 hover:bg-card-hover/40"
                    )}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-inset",
                          isEnabled
                            ? "bg-[color-mix(in_oklab,var(--accent-green)_12%,transparent)] ring-[color-mix(in_oklab,var(--accent-green)_30%,transparent)] text-accent-green"
                            : "bg-card-hover ring-border text-muted-foreground/40"
                        )}
                      >
                        {isEnabled ? <Check className="w-3 h-3" /> : null}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium text-foreground text-[13px] tracking-tight">{kpi.shortName}</span>
                        <span className="text-[11px] text-muted-foreground block md:hidden mt-0.5">
                          {kpi.categoryLabel}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 hidden md:table-cell">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                        style={{
                          color: CATEGORY_COLORS[kpi.category],
                          backgroundColor: `color-mix(in oklab, ${CATEGORY_COLORS[kpi.category]} 12%, transparent)`,
                        }}
                      >
                        {kpi.categoryLabel}
                      </span>
                    </td>

                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className={cn("inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full", secBadge.className)}>
                        {secBadge.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 hidden xl:table-cell max-w-[340px]">
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{kpi.businessPurpose}</p>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <ToggleSwitch checked={isEnabled} onChange={() => toggleKPI(kpi.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredKPIs.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Search className="w-5 h-5 mx-auto mb-2 opacity-50" />
            No KPIs match your filters.
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-muted-foreground numeric">
            Showing <span className="text-foreground font-medium">{filteredKPIs.length}</span> of {totalCount} KPIs
          </span>
          <div className="flex items-center gap-3 text-xs">
            <Badge variant="success" size="sm">
              {enabledCount} enabled
            </Badge>
            <Badge variant="neutral" size="sm">
              {totalCount - enabledCount} hidden
            </Badge>
          </div>
        </div>
      </Card>
    </section>
  );
}
