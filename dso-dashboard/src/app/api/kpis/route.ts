import { type NextRequest } from "next/server";
import { COMPUTED_KPI_DATA, type QuarterKey } from "@/lib/computed-kpis";
import { KPI_REGISTRY } from "@/lib/kpi-registry";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const quarter = (searchParams.get("quarter") || "All") as QuarterKey;
  const section = searchParams.get("section");

  // Validate quarter
  const validQuarters: QuarterKey[] = ["Q1", "Q2", "Q3", "Q4", "All"];
  const selectedQuarter = validQuarters.includes(quarter) ? quarter : "All";

  const data = COMPUTED_KPI_DATA[selectedQuarter];

  const registry = section
    ? KPI_REGISTRY.filter((k) => k.dashboardSection === section)
    : KPI_REGISTRY;

  return Response.json({
    computed: true,
    source: "pre-computed from 25K invoice SQLite database",
    timestamp: new Date().toISOString(),
    quarter: selectedQuarter,
    ...data,
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
