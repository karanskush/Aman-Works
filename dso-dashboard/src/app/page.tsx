"use client";

import { useDashboard } from "@/context/dashboard-context";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalFilters } from "@/components/layout/global-filters";
import { ExecutiveKPIs } from "@/components/sections/executive-kpis";
import { CollectionEfficiency } from "@/components/sections/collection-efficiency";
import { AgingRisk } from "@/components/sections/aging-risk";
import { OperationalKPIs } from "@/components/sections/operational-kpis";
import { AdvancedDashboard } from "@/components/sections/advanced-dashboard";
import { AIInsightsDashboard } from "@/components/sections/ai-insights-dashboard";
import { AdminPanel } from "@/components/sections/admin-panel";
import { Chatbot } from "@/components/chatbot";
import { cn } from "@/lib/utils";
import { Sparkles, BarChart3, Layers, Brain, Settings2 } from "lucide-react";

const SECTION_CONFIG = {
  basic: { title: "Basic Dashboard", icon: BarChart3, badge: "Core KPIs", badgeColor: "bg-accent-blue/10 text-accent-blue border-accent-blue/20" },
  advanced: { title: "Advanced Analytics", icon: Layers, badge: "25 Advanced KPIs", badgeColor: "bg-accent-purple/10 text-accent-purple border-accent-purple/20" },
  "ai-insights": { title: "AI Insights", icon: Brain, badge: "Executive Intelligence", badgeColor: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20" },
  admin: { title: "Administration", icon: Settings2, badge: "KPI Management", badgeColor: "bg-accent-teal/10 text-accent-teal border-accent-teal/20" },
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-all duration-300 min-h-screen",
          "md:ml-[220px]",
          sidebarCollapsed && "md:ml-[68px]"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/90 border-b border-border shadow-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="gradient-text">DSO Visibility</span>
                    <span className="text-muted font-normal ml-2 text-sm hidden sm:inline">|</span>
                    <span className="text-muted font-normal ml-2 text-xs hidden sm:inline">
                      Working Capital Dashboard
                    </span>
                  </h1>
                  <p className="text-[10px] text-muted mt-0.5 hidden sm:block">
                    Real-time receivables intelligence powered by AI insights
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <GlobalFilters />

                <div className={cn("hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", config.badgeColor)}>
                  <Sparkles className="w-3 h-3" />
                  <span>{config.badge}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24 md:pb-6">
          <DashboardContent />

          {/* Footer */}
          <footer className="text-center py-6 border-t border-border">
            <p className="text-xs text-muted">
              DSO Visibility Dashboard &middot; Each tile shows business purpose & AI situation analysis &middot; Data computed from 25,000 invoices
            </p>
          </footer>
        </main>
      </div>

      {/* AI Chatbot */}
      <Chatbot />
    </div>
  );
}
