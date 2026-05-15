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
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: ActiveSection;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "basic", label: "Overview", shortLabel: "Basic", icon: BarChart3, description: "Core KPIs" },
  { id: "advanced", label: "Advanced", shortLabel: "Adv", icon: Layers, description: "Decomposition · risk" },
  { id: "ai-insights", label: "AI Insights", shortLabel: "AI", icon: Brain, description: "Executive intel" },
  { id: "admin", label: "Admin", shortLabel: "Adm", icon: Settings2, description: "Configure KPIs" },
];

export function Sidebar() {
  const { activeSection, setActiveSection, sidebarCollapsed, setSidebarCollapsed } = useDashboard();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-card text-foreground border-r border-border transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-4 h-14 border-b border-border",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <div className="grid place-items-center h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent-blue text-primary-foreground shrink-0 shadow-[var(--shadow-xs)]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-[13px] font-semibold tracking-tight whitespace-nowrap">DSO Visibility</h1>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">Working Capital</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md transition-all duration-150 group relative",
                  sidebarCollapsed ? "justify-center p-2.5" : "px-2.5 py-2",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-primary" : "")} />
                {!sidebarCollapsed && (
                  <div className="overflow-hidden text-left flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-[13px] font-medium block whitespace-nowrap leading-tight",
                        isActive ? "text-foreground" : ""
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground block whitespace-nowrap mt-0.5">
                      {item.description}
                    </span>
                  </div>
                )}
                {isActive && !sidebarCollapsed && (
                  <span className="absolute right-2 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                {/* Collapsed tooltip */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-popover border border-border rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-[var(--shadow-md)]">
                    <span className="text-xs font-medium block">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground block">{item.description}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 py-3 border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-1.5 rounded-md hover:bg-card-hover text-muted-foreground hover:text-foreground transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-0",
                  isActive ? "bg-secondary" : "hover:bg-card-hover"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
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
