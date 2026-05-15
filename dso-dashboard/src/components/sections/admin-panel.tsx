"use client";

import { useDashboard } from "@/context/dashboard-context";
import {
  KPI_REGISTRY,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type KPICategory,
} from "@/lib/kpi-registry";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import { Settings2, Search, Eye, EyeOff, ToggleLeft, ToggleRight, Filter } from "lucide-react";
import { useState, useMemo } from "react";

export function AdminPanel() {
  const { kpiEnabled, toggleKPI, setKPIEnabled } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<KPICategory | "all">("all");
  const [sectionFilter, setSectionFilter] = useState<"all" | "basic" | "advanced" | "ai-insights">("all");

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
    <section className="space-y-6">
      <SectionHeader
        icon={Settings2}
        title="KPI Administration"
        subtitle={`${enabledCount} of ${totalCount} KPIs active · Changes apply instantly`}
        iconColor="text-accent-teal"
      />

      {/* Controls */}
      <div className="glass-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search KPIs by name, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-accent-blue transition-colors"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs text-muted">Section:</span>
          </div>
          {(["all", "basic", "advanced", "ai-insights"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                sectionFilter === s
                  ? "bg-accent-blue text-white"
                  : "bg-card-hover text-muted hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : s === "basic" ? "Basic" : s === "advanced" ? "Advanced" : "AI Insights"}
            </button>
          ))}

          <span className="text-border mx-1">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as KPICategory | "all")}
            className="px-2.5 py-1 rounded-md text-xs bg-card-hover border border-border text-foreground outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          <span className="text-border mx-1">|</span>

          {/* Bulk actions */}
          <button
            onClick={() => handleBulkToggle(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors"
          >
            <Eye className="w-3 h-3" /> Enable All
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors"
          >
            <EyeOff className="w-3 h-3" /> Disable All
          </button>
        </div>
      </div>

      {/* KPI Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card-hover border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider w-12">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider">
                  KPI Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider hidden md:table-cell">
                  Category
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider hidden lg:table-cell">
                  Dashboard
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider hidden xl:table-cell max-w-[300px]">
                  Business Purpose
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider hidden xl:table-cell max-w-[200px]">
                  Formula
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted text-xs uppercase tracking-wider w-24">
                  Toggle
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredKPIs.map((kpi) => {
                const isEnabled = kpiEnabled[kpi.id] !== false;
                return (
                  <tr
                    key={kpi.id}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      isEnabled ? "hover:bg-card-hover" : "opacity-50 bg-card-hover/30"
                    )}
                  >
                    {/* Status indicator */}
                    <td className="py-3 px-4">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          isEnabled ? "bg-accent-green" : "bg-border"
                        )}
                      />
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium text-foreground">{kpi.shortName}</span>
                        <span className="text-xs text-muted block md:hidden mt-0.5">
                          {kpi.categoryLabel}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: CATEGORY_COLORS[kpi.category],
                          backgroundColor: CATEGORY_COLORS[kpi.category] + "12",
                        }}
                      >
                        {kpi.categoryLabel}
                      </span>
                    </td>

                    {/* Dashboard */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          kpi.dashboardSection === "advanced"
                            ? "bg-accent-purple/10 text-accent-purple"
                            : kpi.dashboardSection === "ai-insights"
                            ? "bg-accent-cyan/10 text-accent-cyan"
                            : "bg-accent-blue/10 text-accent-blue"
                        )}
                      >
                        {kpi.dashboardSection === "advanced"
                          ? "Advanced"
                          : kpi.dashboardSection === "ai-insights"
                          ? "AI Insights"
                          : "Basic"}
                      </span>
                    </td>

                    {/* Business Purpose */}
                    <td className="py-3 px-4 hidden xl:table-cell max-w-[300px]">
                      <p className="text-xs text-muted line-clamp-2">{kpi.businessPurpose}</p>
                    </td>

                    {/* Formula */}
                    <td className="py-3 px-4 hidden xl:table-cell max-w-[200px]">
                      <p className="text-xs text-muted font-mono line-clamp-2">{kpi.formula}</p>
                    </td>

                    {/* Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleKPI(kpi.id)}
                        className="inline-flex items-center justify-center transition-colors"
                      >
                        {isEnabled ? (
                          <ToggleRight className="w-8 h-8 text-accent-green" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-muted" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredKPIs.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            No KPIs match your filters.
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-muted">
            Showing {filteredKPIs.length} of {totalCount} KPIs
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-muted">
                {enabledCount} enabled
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-border" />
              <span className="text-muted">
                {totalCount - enabledCount} disabled
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
