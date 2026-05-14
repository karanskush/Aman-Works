"use client";

import { ExecutiveKPIs } from "@/components/sections/executive-kpis";
import { CollectionEfficiency } from "@/components/sections/collection-efficiency";
import { AgingRisk } from "@/components/sections/aging-risk";
import { OperationalKPIs } from "@/components/sections/operational-kpis";
import { BarChart3, Sparkles, Calendar } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent-blue/10">
                <BarChart3 className="w-6 h-6 text-accent-blue" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="gradient-text">DSO Visibility</span>
                  <span className="text-muted font-normal ml-2">|</span>
                  <span className="text-muted font-normal ml-2 text-sm">Working Capital Dashboard</span>
                </h1>
                <p className="text-xs text-muted mt-0.5">Real-time receivables intelligence powered by AI insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
                <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
                <span className="text-xs text-accent-purple font-medium">AI Insights Active</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
                <Calendar className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs text-muted">Q1 2026</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <ExecutiveKPIs />
        <CollectionEfficiency />
        <AgingRisk />
        <OperationalKPIs />

        {/* Footer */}
        <footer className="text-center py-6 border-t border-border">
          <p className="text-xs text-muted">
            DSO Visibility Dashboard &middot; Hover over any KPI tile and click the info icon for business purpose & AI insights &middot; Data as of Q1 2026
          </p>
        </footer>
      </main>
    </div>
  );
}
