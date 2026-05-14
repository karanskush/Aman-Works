"use client";

import { cn } from "@/lib/utils";
import { useDashboard, type ActiveSection } from "@/context/dashboard-context";
import {
  BarChart3,
  Layers,
  Brain,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: ActiveSection;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "basic",
    label: "Basic",
    shortLabel: "Basic",
    icon: BarChart3,
    description: "Core KPI Dashboard",
    color: "text-accent-blue",
  },
  {
    id: "advanced",
    label: "Advanced",
    shortLabel: "Adv",
    icon: Layers,
    description: "25 Advanced KPIs",
    color: "text-accent-purple",
  },
  {
    id: "ai-insights",
    label: "AI Insights",
    shortLabel: "AI",
    icon: Brain,
    description: "Executive Intelligence",
    color: "text-accent-cyan",
  },
  {
    id: "admin",
    label: "Admin",
    shortLabel: "Adm",
    icon: Settings2,
    description: "KPI Management",
    color: "text-accent-teal",
  },
];

export function Sidebar() {
  const { activeSection, setActiveSection, sidebarCollapsed, setSidebarCollapsed } = useDashboard();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-[#0f1117] border-r border-white/[0.06] transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-2.5 px-4 py-5 border-b border-white/[0.06]", sidebarCollapsed && "justify-center px-0")}>
          <div className="p-1.5 rounded-lg bg-accent-blue/20 shrink-0">
            <BarChart3 className="w-5 h-5 text-accent-blue" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white tracking-tight whitespace-nowrap">DSO Visibility</h1>
              <p className="text-[10px] text-white/40 whitespace-nowrap">Working Capital Dashboard</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative",
                  sidebarCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                  isActive
                    ? "bg-white/[0.08] shadow-lg shadow-black/20"
                    : "hover:bg-white/[0.04]"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors shrink-0",
                    isActive ? "bg-accent-blue/20" : "bg-white/[0.04] group-hover:bg-white/[0.08]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? item.color : "text-white/50 group-hover:text-white/70"
                    )}
                  />
                </div>
                {!sidebarCollapsed && (
                  <div className="overflow-hidden text-left">
                    <span
                      className={cn(
                        "text-sm font-medium block whitespace-nowrap",
                        isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-white/30 block whitespace-nowrap">{item.description}</span>
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-accent-blue" />
                )}
                {/* Tooltip for collapsed */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#1a1d23] border border-white/10 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    <span className="text-xs text-white font-medium">{item.label}</span>
                    <span className="text-[10px] text-white/40 block">{item.description}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-white/40" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f1117]/95 backdrop-blur-xl border-t border-white/[0.06] safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0",
                  isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4.5 h-4.5",
                    isActive ? item.color : "text-white/40"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-white" : "text-white/40"
                  )}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
