import { type NextRequest } from "next/server";
import { COMPUTED_KPI_DATA, type QuarterKey, type FYKey } from "@/lib/computed-kpis";
import { KPI_REGISTRY } from "@/lib/kpi-registry";

const VALID_FYS: FYKey[] = [2024, 2025, 2026];
const VALID_QUARTERS: QuarterKey[] = ["Q1", "Q2", "Q3", "Q4", "All"];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const fyParam = parseInt(searchParams.get("fy") || "2026", 10);
  const selectedFY = (VALID_FYS as number[]).includes(fyParam) ? (fyParam as FYKey) : 2026;

  const quarter = (searchParams.get("quarter") || "All") as QuarterKey;
  const selectedQuarter = VALID_QUARTERS.includes(quarter) ? quarter : "All";

  const section = searchParams.get("section");

  const data = COMPUTED_KPI_DATA[selectedFY][selectedQuarter];

  const registry = section
    ? KPI_REGISTRY.filter((k) => k.dashboardSection === section)
    : KPI_REGISTRY;

  return Response.json({
    computed: true,
    source: "pre-computed from local SQLite database (no external APIs)",
    timestamp: new Date().toISOString(),
    fiscalYear: selectedFY,
    quarter: selectedQuarter,
    ...data,
    registry: registry.map((k) => ({
      id: k.id,
      name: k.name,
      category: k.categoryLabel,
      section: k.dashboardSection,
      enabled: k.enabled,
    })),
  });
}
