import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quarter = searchParams.get("quarter") || "All";

    // Load core data
    const allInvoices = await prisma.invoice.findMany({
      include: { customer: true, paymentTerms: true },
    });
    const openInvs = allInvoices.filter((i) => i.status !== "CLEARED");
    const clearedInvs = allInvoices.filter((i) => i.status === "CLEARED");
    const overdueInvs = openInvs.filter((i) => i.isOverdue);
    const totalOpenAR = openInvs.reduce((s, i) => s + i.amount, 0);
    const totalSales = allInvoices.reduce((s, i) => s + i.amount, 0);
    const snapshots = await prisma.monthlySnapshot.findMany({
      orderBy: { fiscalPeriodId: "asc" },
    });
    const wcfs = await prisma.weeklyCashflow.findMany({
      orderBy: { weekNumber: "asc" },
    });
    const allDunning = await prisma.dunningHistory.findMany();

    // ---- 1. Blended DSO ----
    const blendedDSO =
      totalSales > 0 ? (totalOpenAR / totalSales) * 365 : 0;

    // ---- 2. DSO Bridge ----
    const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"];
    const dsoBridge: Record<string, { dso: number; weight: number; contribution: number }> = {};
    for (const seg of segments) {
      const segInvs = allInvoices.filter((i) => i.customer.segment === seg);
      const segOpen = segInvs.filter((i) => i.status !== "CLEARED");
      const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
      const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
      const segDSO = segSales > 0 ? (segOpenAR / segSales) * 365 : 0;
      const weight = segSales / totalSales;
      const contribution = (segDSO - blendedDSO) * weight;
      dsoBridge[seg] = {
        dso: Math.round(segDSO * 10) / 10,
        weight: Math.round(weight * 1000) / 10,
        contribution: Math.round(contribution * 10) / 10,
      };
    }

    // ---- 3. AR Health Score ----
    const overdueRatio =
      totalOpenAR > 0
        ? (overdueInvs.reduce((s, i) => s + i.amount, 0) / totalOpenAR) * 100
        : 0;
    const latestCEI =
      snapshots.length > 0 ? snapshots[snapshots.length - 1].cei || 0 : 0;
    const notDuePct =
      totalOpenAR > 0
        ? (openInvs.filter((i) => !i.isOverdue).reduce((s, i) => s + i.amount, 0) /
            totalOpenAR) *
          100
        : 0;
    const custAR = new Map<string, number>();
    for (const i of openInvs) {
      custAR.set(i.customerId, (custAR.get(i.customerId) || 0) + i.amount);
    }
    const top5Pct =
      ([...custAR.values()]
        .sort((a, b) => b - a)
        .slice(0, 5)
        .reduce((s, v) => s + v, 0) /
        (totalOpenAR || 1)) *
      100;

    const dsoScore = Math.max(0, Math.min(100, 100 - ((blendedDSO - 20) / (60 - 20)) * 100));
    const ceiScore = Math.min(100, latestCEI);
    const overdueScore = Math.max(0, 100 - overdueRatio);
    const agingScore = notDuePct;
    const concScore = Math.max(0, 100 - top5Pct * 2);

    const healthScore = Math.round(
      dsoScore * 0.2 + ceiScore * 0.2 + overdueScore * 0.15 + agingScore * 0.15 + concScore * 0.15 + 37 * 0.15
    );
    const healthGrade =
      healthScore >= 80 ? "A" : healthScore >= 65 ? "B" : healthScore >= 50 ? "C" : healthScore >= 35 ? "D" : "F";

    // ---- 4. Carrying Cost ----
    const costOfCapital = 0.1;
    const avgDaysOut =
      openInvs.reduce((s, i) => s + i.daysOutstanding, 0) / (openInvs.length || 1);
    const dailyCost = (totalOpenAR * costOfCapital) / 365;
    const annualCost = totalOpenAR * costOfCapital * (avgDaysOut / 365);

    // ---- 5. Cash Flow Leakage ----
    const weightedTerms =
      openInvs.reduce((s, i) => s + i.creditPeriodDays * i.amount, 0) / (totalOpenAR || 1);
    const dailySales = totalSales / 365;
    const leakageDays = blendedDSO - weightedTerms;
    const leakageINR = leakageDays * dailySales;

    return Response.json({
      computed: true,
      timestamp: new Date().toISOString(),
      quarter,
      summary: {
        totalInvoices: allInvoices.length,
        openInvoices: openInvs.length,
        overdueInvoices: overdueInvs.length,
        totalOpenAR: Math.round(totalOpenAR),
        totalSales: Math.round(totalSales),
      },
      kpis: {
        blendedDSO: Math.round(blendedDSO * 10) / 10,
        dsoBridge,
        healthScore,
        healthGrade,
        healthComponents: {
          DSO: Math.round(dsoScore),
          CEI: Math.round(ceiScore),
          Overdue: Math.round(overdueScore),
          Aging: Math.round(agingScore),
          Concentration: Math.round(concScore),
        },
        overdueRatio: Math.round(overdueRatio * 10) / 10,
        carryingCost: {
          daily: Math.round(dailyCost),
          monthly: Math.round(dailyCost * 30),
          annual: Math.round(annualCost),
          avgDaysOutstanding: Math.round(avgDaysOut),
        },
        cashFlowLeakage: {
          bestPossibleDSO: Math.round(weightedTerms * 10) / 10,
          actualDSO: Math.round(blendedDSO * 10) / 10,
          leakageDays: Math.round(leakageDays * 10) / 10,
          leakageINR: Math.round(leakageINR),
        },
      },
    });
  } catch (error) {
    console.error("KPI computation error:", error);
    return Response.json(
      { error: "Failed to compute KPIs", details: String(error) },
      { status: 500 }
    );
  }
}
