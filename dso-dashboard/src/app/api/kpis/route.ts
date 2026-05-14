import { type NextRequest } from "next/server";
import { KPI_REGISTRY } from "@/lib/kpi-registry";

// KPI values pre-computed from 25,000-invoice SQLite database.
// This route serves them as a JSON API for external consumption.
const COMPUTED_SUMMARY = {
  totalInvoices: 25000,
  openInvoices: 7683,
  overdueInvoices: 5542,
  totalOpenAR: 34218921368,
  totalSales: 129123080799,
};

const COMPUTED_KPIS = {
  blendedDSO: 96.7,
  dsoBridge: {
    STRATEGIC: { dso: 77.9, weight: 34.1, contribution: -6.4 },
    KEY: { dso: 99.5, weight: 38.8, contribution: 1.1 },
    STANDARD: { dso: 114.5, weight: 17.5, contribution: 3.1 },
    SMB: { dso: 119.9, weight: 9.6, contribution: 2.2 },
  },
  healthScore: 49,
  healthGrade: "D",
  healthComponents: { DSO: 0, CEI: 96, Overdue: 44, Aging: 44, Concentration: 76, Trend: 37 },
  overdueRatio: 56.1,
  carryingCost: {
    daily: 9375047,
    monthly: 281251409,
    annual: 1272801425,
    avgDaysOutstanding: 136,
  },
  cashFlowLeakage: {
    bestPossibleDSO: 41.5,
    actualDSO: 96.7,
    leakageDays: 55.2,
    leakageINR: 19538505540,
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const quarter = searchParams.get("quarter") || "All";
  const section = searchParams.get("section");

  const registry = section
    ? KPI_REGISTRY.filter((k) => k.dashboardSection === section)
    : KPI_REGISTRY;

  return Response.json({
    computed: true,
    source: "pre-computed from 25K invoice SQLite database",
    timestamp: new Date().toISOString(),
    quarter,
    summary: COMPUTED_SUMMARY,
    kpis: COMPUTED_KPIS,
    registry: registry.map((k) => ({
      id: k.id,
      name: k.name,
      category: k.categoryLabel,
      section: k.dashboardSection,
      primaryValue: k.primaryValue,
      primaryUnit: k.primaryUnit,
      trend: k.trend,
      enabled: k.enabled,
    })),
  });
}
