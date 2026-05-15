"use client";

import { useDashboard } from "@/context/dashboard-context";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalFilters } from "@/components/layout/global-filters";
import { HeroKPIBand } from "@/components/layout/hero-kpi-band";
import { ThemeDensityToggle } from "@/components/layout/theme-density-toggle";
import { ExecutiveKPIs } from "@/components/sections/executive-kpis";
import { CollectionEfficiency } from "@/components/sections/collection-efficiency";
import { AgingRisk } from "@/components/sections/aging-risk";
import { OperationalKPIs } from "@/components/sections/operational-kpis";
import { AdvancedDashboard } from "@/components/sections/advanced-dashboard";
import { AIInsightsDashboard } from "@/components/sections/ai-insights-dashboard";
import { AdminPanel } from "@/components/sections/admin-panel";
import { Chatbot } from "@/components/chatbot";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BarChart3, Layers, Brain, Settings2, ChevronRight } from "lucide-react";

const SECTION_CONFIG = {
  basic: { title: "Overview", subtitle: "Core receivables KPIs", icon: BarChart3 },
  advanced: { title: "Advanced Analytics", subtitle: "Decomposition · risk · process", icon: Layers },
  "ai-insights": { title: "AI Insights", subtitle: "Executive intelligence", icon: Brain },
  admin: { title: "Administration", subtitle: "KPI visibility & configuration", icon: Settings2 },
};

function BasicDashboard() {
  return (
    <>
      <ExecutiveKPIs />
      <CollectionEfficiency />
      <AgingRisk />
      <OperationalKPIs />
    </>
  );
}

function DashboardContent() {
  const { activeSection } = useDashboard();
  switch (activeSection) {
    case "basic":
      return <BasicDashboard />;
    case "advanced":
      return <AdvancedDashboard />;
    case "ai-insights":
      return <AIInsightsDashboard />;
    case "admin":
      return <AdminPanel />;
    default:
      return <BasicDashboard />;
  }
}

export default function Dashboard() {
  const { activeSection, sidebarCollapsed } = useDashboard();
  const config = SECTION_CONFIG[activeSection];
  const SectionIcon = config.icon;
  const showHero = activeSection !== "admin";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div
        className={cn(
          "transition-all duration-300 min-h-screen",
          "md:ml-[220px]",
          sidebarCollapsed && "md:ml-[68px]"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="hidden md:inline-flex items-center text-[11px] text-muted-foreground">
                <span>DSO Visibility</span>
                <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/60" />
              </span>
              <SectionIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
                  {config.title}
                </span>
                <span className="hidden sm:inline text-[11px] text-muted-foreground truncate">
                  {config.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GlobalFilters />
              <Separator orientation="vertical" className="h-5 hidden md:block" />
              <ThemeDensityToggle />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 pb-24 md:pb-10 space-y-6 fade-in">
          {showHero && <HeroKPIBand section={activeSection} />}
          <DashboardContent />

          <footer className="pt-8 mt-6 border-t border-border">
            <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
              <span>Local SQLite · No external AI APIs</span>
              <span className="text-border">·</span>
              <span>
                Click any KPI tile for context, formula & insight
              </span>
            </div>
          </footer>
        </main>
      </div>

      <Chatbot />
    </div>
  );
}
