// ============================================================
// COMPUTE DASHBOARD DATA — FY × Quarter aware pipeline
// Reads SQLite, emits nested COMPUTED_KPI_DATA to src/lib/computed-kpis.ts
// Run: npx tsx prisma/compute-dashboard-data.ts
// ============================================================

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "path";
import { writeFileSync } from "fs";

const adapter = new PrismaLibSql({ url: `file:${resolve("prisma/dev.db")}` });
const prisma = new PrismaClient({ adapter });

type Quarter = "Q1" | "Q2" | "Q3" | "Q4" | "All";
type FY = 2024 | 2025 | 2026;

const FYS: FY[] = [2024, 2025, 2026];
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "All"];

const QUARTER_PERIODS: Record<Quarter, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
  All: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

const FY_LABEL: Record<FY, string> = { 2024: "FY 2023-24", 2025: "FY 2024-25", 2026: "FY 2025-26" };

// ============================================================
// PER-SLICE COMPUTATION
// ============================================================

async function computeForFYQuarter(fy: FY, quarter: Quarter) {
  const fiscalPeriods = await prisma.fiscalPeriod.findMany({
    where: {
      fiscalYear: fy,
      ...(quarter === "All" ? {} : { fiscalPeriod: { in: QUARTER_PERIODS[quarter] } }),
    },
    orderBy: { fiscalPeriod: "asc" },
  });
  const fpIds = fiscalPeriods.map(fp => fp.id);

  const allInvoices = await prisma.invoice.findMany({
    where: { fiscalPeriodId: { in: fpIds } },
    include: { customer: true },
  });

  const companyCodes = await prisma.companyCode.findMany();
  const openInvoices = allInvoices.filter(i => i.status === "OPEN" || i.status === "PARTIAL");
  const clearedInvoices = allInvoices.filter(i => i.status === "CLEARED");
  const overdueInvs = openInvoices.filter(i => i.isOverdue);

  const totalOpenAR = openInvoices.reduce((s, i) => s + i.amount, 0);
  const overdueAR = overdueInvs.reduce((s, i) => s + i.amount, 0);
  const currentAR = totalOpenAR - overdueAR;
  const totalSalesAll = allInvoices.reduce((s, i) => s + i.amount, 0);

  // ---- DSO ----
  // Period length still used for traditional days-based metrics derived
  // internally (leakage, dispute-adjusted DSO, segment DSO weights).
  const periodDays = quarter === "All" ? 365 : 90;
  // Traditional days-based DSO kept for downstream rupee/days math.
  const dsoDays = totalSalesAll > 0 ? (totalOpenAR / totalSalesAll) * periodDays : 0;

  const rawSnapshots = await prisma.monthlySnapshot.findMany({
    where: { fiscalPeriodId: { in: fpIds } },
    include: { fiscalPeriod: true },
    orderBy: { fiscalPeriodId: "asc" },
  });

  type SnapAgg = {
    label: string;
    totalAR: number; currentAR: number; overdueAR: number; beginningAR: number;
    totalCreditSales: number; totalCollections: number;
    invoiceCountTotal: number; invoiceCountOverdue: number; invoiceCountCleared: number;
    count: number;
    dsoSum: number; overdueRatioSum: number; ceiSum: number; turnoverSum: number; cpuSum: number;
    order: number;
  };
  const snapshotByPeriod = new Map<string, SnapAgg>();
  for (const ms of rawSnapshots) {
    const key = ms.fiscalPeriodId;
    const existing = snapshotByPeriod.get(key);
    if (!existing) {
      snapshotByPeriod.set(key, {
        label: ms.fiscalPeriod.periodLabel,
        totalAR: ms.totalAR, currentAR: ms.currentAR, overdueAR: ms.overdueAR,
        beginningAR: ms.beginningAR, totalCreditSales: ms.totalCreditSales,
        totalCollections: ms.totalCollections,
        invoiceCountTotal: ms.invoiceCountTotal, invoiceCountOverdue: ms.invoiceCountOverdue,
        invoiceCountCleared: ms.invoiceCountCleared, count: 1,
        dsoSum: ms.dso || 0, overdueRatioSum: ms.overdueRatio || 0,
        ceiSum: ms.cei || 0, turnoverSum: ms.receivablesTurnover || 0, cpuSum: ms.creditPeriodUtil || 0,
        order: ms.fiscalPeriod.fiscalPeriod,
      });
    } else {
      existing.totalAR += ms.totalAR; existing.currentAR += ms.currentAR;
      existing.overdueAR += ms.overdueAR; existing.beginningAR += ms.beginningAR;
      existing.totalCreditSales += ms.totalCreditSales; existing.totalCollections += ms.totalCollections;
      existing.invoiceCountTotal += ms.invoiceCountTotal; existing.invoiceCountOverdue += ms.invoiceCountOverdue;
      existing.invoiceCountCleared += ms.invoiceCountCleared; existing.count += 1;
      existing.dsoSum += ms.dso || 0; existing.overdueRatioSum += ms.overdueRatio || 0;
      existing.ceiSum += ms.cei || 0; existing.turnoverSum += ms.receivablesTurnover || 0;
      existing.cpuSum += ms.creditPeriodUtil || 0;
    }
  }
  const monthlySnapshots = [...snapshotByPeriod.values()].sort((a, b) => a.order - b.order);

  // New DSO formula per spec: DSO = (Average AR / Total Credit Sales) × 100
  // Treated as an AR-intensity ratio. Per-month uses that month's snapshot.
  const dsoMonthly = monthlySnapshots.map(ms => ({
    month: ms.label,
    value: parseFloat((ms.totalCreditSales > 0 ? (ms.totalAR / ms.totalCreditSales) * 100 : 0).toFixed(1)),
  }));
  const avgARacross = monthlySnapshots.length > 0
    ? monthlySnapshots.reduce((s, ms) => s + ms.totalAR, 0) / monthlySnapshots.length
    : totalOpenAR;
  const totalCreditSalesAcross = monthlySnapshots.reduce((s, ms) => s + ms.totalCreditSales, 0) || totalSalesAll;
  const dsoOverall = totalCreditSalesAcross > 0
    ? parseFloat(((avgARacross / totalCreditSalesAcross) * 100).toFixed(1))
    : 0;

  const overdueRatio = totalOpenAR > 0 ? (overdueAR / totalOpenAR) * 100 : 0;
  const overdueRatioMonthly = monthlySnapshots.map(ms => ({
    month: ms.label,
    value: parseFloat((ms.totalAR > 0 ? (ms.overdueAR / ms.totalAR) * 100 : 0).toFixed(1)),
  }));

  const riskInvoices = overdueInvs.filter(i => i.creditPeriodDays >= 45);
  const riskAR = riskInvoices.reduce((s, i) => s + i.amount, 0);
  const revenueAtRisk = totalOpenAR > 0 ? (riskAR / totalOpenAR) * 100 : 0;

  const totalCreditSalesSum = monthlySnapshots.reduce((s, ms) => s + ms.totalCreditSales, 0);
  const avgAR = monthlySnapshots.length > 0
    ? (monthlySnapshots[0].beginningAR + monthlySnapshots[monthlySnapshots.length - 1].totalAR) / 2
    : totalOpenAR || 1;
  const turnover = avgAR > 0 ? totalCreditSalesSum / avgAR : 0;
  const turnoverMonthly = monthlySnapshots.map(ms => ({
    month: ms.label,
    value: parseFloat((ms.count > 0 ? ms.turnoverSum / ms.count : 0).toFixed(1)),
  }));

  const netARMonthly = monthlySnapshots.map(ms => ({
    month: ms.label,
    value: Math.round(ms.totalAR - ms.beginningAR),
    label: ms.label,
  }));

  // ---- Collection ----
  const ceiMonthly = monthlySnapshots.map(ms => ({
    month: ms.label,
    value: parseFloat((ms.count > 0 ? ms.ceiSum / ms.count : 0).toFixed(1)),
  }));
  const ceiOverall = ceiMonthly.length > 0
    ? parseFloat((ceiMonthly.reduce((s, c) => s + c.value, 0) / ceiMonthly.length).toFixed(1))
    : 0;

  const weeklyCashflows = await prisma.weeklyCashflow.findMany({
    where: { fiscalPeriodId: { in: fpIds } },
    include: { fiscalPeriod: true },
    orderBy: { weekStartDate: "asc" },
  });
  // Aggregate weekly cashflows up to fiscal-period (month) granularity. Monthly
  // aggregation gives a cleaner trend signal than week-by-week noise.
  type MonthAgg = {
    label: string;
    order: number;
    onTimeNum: number;
    onTimeDen: number;
    dueAmt: number;
    collAmt: number;
    overdueBalance: number;
    sales: number;
  };
  const monthAggMap = new Map<string, MonthAgg>();
  for (const wc of weeklyCashflows) {
    const key = wc.fiscalPeriodId;
    const existing = monthAggMap.get(key);
    // OTPR uses on-time *invoice count* numerator and total *due count* denominator.
    // Recover counts: onTimeRate% × dueCount = onTimeCount.
    const dueCount = wc.invoicesDueCount;
    const collectedCount = wc.invoicesCollectedCount;
    const onTimeCount = Math.min(dueCount, collectedCount); // collected within the week counts as on-time
    if (!existing) {
      monthAggMap.set(key, {
        label: wc.fiscalPeriod.periodLabel,
        order: wc.fiscalPeriod.fiscalPeriod,
        onTimeNum: onTimeCount,
        onTimeDen: dueCount,
        dueAmt: wc.invoicesDueAmount,
        collAmt: wc.invoicesCollectedAmount,
        overdueBalance: wc.overdueBalance,
        sales: wc.salesAmount,
      });
    } else {
      existing.onTimeNum += onTimeCount;
      existing.onTimeDen += dueCount;
      existing.dueAmt += wc.invoicesDueAmount;
      existing.collAmt += wc.invoicesCollectedAmount;
      existing.overdueBalance += wc.overdueBalance;
      existing.sales += wc.salesAmount;
    }
  }
  const monthAgg = [...monthAggMap.values()].sort((a, b) => a.order - b.order);

  const onTimeMonthly = monthAgg.map(m => ({
    month: m.label,
    value: m.onTimeDen > 0 ? Math.round((m.onTimeNum / m.onTimeDen) * 100) : 0,
  }));
  const collEffMonthly = monthAgg.map(m => ({
    month: m.label,
    value: m.dueAmt > 0 ? Math.round((m.collAmt / m.dueAmt) * 100) : 0,
  }));

  const creditPeriodDaysList = [7, 15, 30, 45, 60];
  const cpEffectiveness = creditPeriodDaysList.map(days => {
    const termCleared = clearedInvoices.filter(i => i.creditPeriodDays === days);
    const onTime = termCleared.filter(i => i.daysForPayment != null && i.daysForPayment <= days);
    const totalAmt = termCleared.reduce((s, i) => s + i.amount, 0);
    const onTimeAmt = onTime.reduce((s, i) => s + i.amount, 0);
    const rate = totalAmt > 0 ? (onTimeAmt / totalAmt) * 100 : 0;
    return { creditPeriod: `${days} days`, value: parseFloat(rate.toFixed(1)) };
  });

  // ---- Aging ----
  const agingCategories = [
    { key: "NOT_DUE", label: "Not Due", color: "#16a34a" },
    { key: "1_7", label: "1-7 days", color: "#22c55e" },
    { key: "8_15", label: "8-15 days", color: "#3b82f6" },
    { key: "16_30", label: "16-30 days", color: "#eab308" },
    { key: "31_45", label: "31-45 days", color: "#d97706" },
    { key: "46_60", label: "46-60 days", color: "#ea580c" },
    { key: "60_PLUS", label: "60+ days", color: "#dc2626" },
  ];
  const agingBuckets = agingCategories.map(cat => {
    const bucket = openInvoices.filter(i => i.overdueCategory === cat.key);
    const amt = bucket.reduce((s, i) => s + i.amount, 0);
    const pct = totalOpenAR > 0 ? (amt / totalOpenAR) * 100 : 0;
    return {
      bucket: cat.label,
      key: cat.key,
      count: bucket.length,
      amount: Math.round(amt),
      percentage: parseFloat(pct.toFixed(1)),
      color: cat.color,
    };
  });

  const countDensity = openInvoices.length > 0 ? (overdueInvs.length / openInvoices.length) * 100 : 0;
  const valueDensity = totalOpenAR > 0 ? (overdueAR / totalOpenAR) * 100 : 0;

  const peakInvoice = overdueInvs.sort((a, b) => b.amount - a.amount)[0];
  let peakExposure = { amount: 0, invoiceNo: "—", companyCode: "—", daysOverdue: 0 };
  if (peakInvoice) {
    const cc = companyCodes.find(c => c.id === peakInvoice.companyCodeId);
    peakExposure = {
      amount: Math.round(peakInvoice.amount),
      invoiceNo: peakInvoice.documentNumber,
      companyCode: cc?.code || "—",
      daysOverdue: peakInvoice.elapsedDays,
    };
  }

  // ---- Operational ----
  const payDays = clearedInvoices.filter(i => i.daysForPayment != null).map(i => i.daysForPayment!).sort((a, b) => a - b);
  const p50 = payDays.length > 0 ? payDays[Math.floor(payDays.length * 0.5)] : 0;
  const p90 = payDays.length > 0 ? payDays[Math.floor(payDays.length * 0.9)] : 0;

  const cpuVals = clearedInvoices
    .filter(i => i.daysForPayment != null && i.creditPeriodDays > 0)
    .map(i => (i.daysForPayment! / i.creditPeriodDays) * 100);
  const avgCPU = cpuVals.length > 0 ? cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length : 0;
  const fpIdToLabel = new Map(fiscalPeriods.map(fp => [fp.id, fp.periodLabel]));
  const cpuByPeriod = new Map<string, number[]>();
  for (const inv of clearedInvoices) {
    if (inv.daysForPayment != null && inv.creditPeriodDays > 0) {
      const label = fpIdToLabel.get(inv.fiscalPeriodId);
      if (label) {
        const arr = cpuByPeriod.get(label) || [];
        arr.push((inv.daysForPayment / inv.creditPeriodDays) * 100);
        cpuByPeriod.set(label, arr);
      }
    }
  }
  const cpuMonthly = fiscalPeriods.map(fp => {
    const vals = cpuByPeriod.get(fp.periodLabel) || [];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { month: fp.periodLabel, value: parseFloat(avg.toFixed(1)) };
  });

  // Days to Clear Backlog — monthly. avgDailyCollection assumes 30 days per month.
  const backlogMonthly = monthAgg.map(m => {
    const avgDailyCollection = m.collAmt / 30;
    const backlog = avgDailyCollection > 0 ? m.overdueBalance / avgDailyCollection : 0;
    const val = Math.min(backlog, 999);
    return { month: m.label, value: parseFloat(val.toFixed(1)) };
  });

  // ---- Advanced: DSO Bridge ----
  // DSO Bridge uses the new ratio-based formula consistently across segments,
  // so the per-segment numbers add up to the headline DSO with sales-weighted
  // contributions.
  const blendedDSO = dsoOverall;
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"] as const;
  const dsoBridgeSegments = segments.map(seg => {
    const segInvs = allInvoices.filter(i => i.customer.segment === seg);
    const segOpen = segInvs.filter(i => i.status === "OPEN" || i.status === "PARTIAL");
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
    const segDSO = segSales > 0 ? (segOpenAR / segSales) * 100 : 0;
    const weight = totalSalesAll > 0 ? segSales / totalSalesAll : 0;
    const contribution = (segDSO - blendedDSO) * weight;
    return {
      segment: seg,
      dso: parseFloat(segDSO.toFixed(1)),
      weight: parseFloat((weight * 100).toFixed(1)),
      contribution: parseFloat(contribution.toFixed(1)),
    };
  });
  const dsoBridge = {
    blendedDSO: parseFloat(blendedDSO.toFixed(1)),
    segments: dsoBridgeSegments,
  };

  // ---- AR Health Score ----
  // Score from the new ratio-based DSO. Healthy < 15%, stressed > 35%.
  const dsoHealthScore = Math.max(0, Math.min(100, 100 - (blendedDSO - 15) / (35 - 15) * 100));
  const ceiHealthScore = Math.min(100, Math.max(0, ceiOverall));
  const overdueHealthScore = Math.max(0, 100 - overdueRatio);
  const notDueAR = openInvoices.filter(i => !i.isOverdue).reduce((s, i) => s + i.amount, 0);
  const agingHealthScore = totalOpenAR > 0 ? (notDueAR / totalOpenAR) * 100 : 100;
  const custARMap = new Map<string, number>();
  for (const i of openInvoices) {
    custARMap.set(i.customerId, (custARMap.get(i.customerId) || 0) + i.amount);
  }
  const top5Pct = totalOpenAR > 0
    ? [...custARMap.values()].sort((a, b) => b - a).slice(0, 5).reduce((s, v) => s + v, 0) / totalOpenAR * 100
    : 0;
  const concentrationHealthScore = Math.max(0, 100 - top5Pct * 2);
  const dsoMonthlyValues = dsoMonthly.map(d => d.value);
  let avgDsoVelocity = 0;
  if (dsoMonthlyValues.length >= 2) {
    const velocities: number[] = [];
    for (let idx = 1; idx < dsoMonthlyValues.length; idx++) {
      if (dsoMonthlyValues[idx - 1] > 0) {
        velocities.push(((dsoMonthlyValues[idx] - dsoMonthlyValues[idx - 1]) / dsoMonthlyValues[idx - 1]) * 100);
      }
    }
    avgDsoVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;
  }
  const trendHealthScore = Math.max(0, Math.min(100, 50 - avgDsoVelocity));
  const healthScoreValue = Math.round(
    dsoHealthScore * 0.20 + ceiHealthScore * 0.20 + overdueHealthScore * 0.15 +
    agingHealthScore * 0.15 + concentrationHealthScore * 0.15 + trendHealthScore * 0.15
  );
  const healthGrade = healthScoreValue >= 80 ? "A" : healthScoreValue >= 65 ? "B" : healthScoreValue >= 50 ? "C" : healthScoreValue >= 35 ? "D" : "F";
  const arHealthScore = {
    score: healthScoreValue,
    grade: healthGrade,
    components: {
      DSO: Math.round(dsoHealthScore),
      CEI: Math.round(ceiHealthScore),
      Overdue: Math.round(overdueHealthScore),
      Aging: Math.round(agingHealthScore),
      Concentration: Math.round(concentrationHealthScore),
      Trend: Math.round(trendHealthScore),
    },
  };

  // ---- Terms Mix Drag ----
  const weightedAvgTerms = totalOpenAR > 0
    ? openInvoices.reduce((s, i) => s + i.creditPeriodDays * i.amount, 0) / totalOpenAR
    : 0;
  const clearedWithPayDays = clearedInvoices.filter(i => i.daysForPayment != null);
  const avgActualPayDays = clearedWithPayDays.length > 0
    ? clearedWithPayDays.reduce((s, i) => s + i.daysForPayment!, 0) / clearedWithPayDays.length
    : 0;
  const termsMixDrag = {
    weightedAvgTerms: parseFloat(weightedAvgTerms.toFixed(1)),
    avgActualPayDays: parseFloat(avgActualPayDays.toFixed(1)),
    drag: parseFloat((avgActualPayDays - weightedAvgTerms).toFixed(1)),
  };

  // ---- Carrying Cost ----
  const costOfCapital = 0.10;
  const dailyCost = totalOpenAR * costOfCapital / 365;
  const monthlyCost = dailyCost * 30;
  const avgDaysOut = openInvoices.length > 0
    ? openInvoices.reduce((s, i) => s + i.daysOutstanding, 0) / openInvoices.length
    : 0;
  const annualCost = totalOpenAR * costOfCapital * (avgDaysOut / 365);
  const carryingCost = {
    dailyCost: Math.round(dailyCost),
    monthlyCost: Math.round(monthlyCost),
    annualCost: Math.round(annualCost),
    avgDaysOutstanding: Math.round(avgDaysOut),
  };

  // ---- Cash Flow Leakage ----
  // Days-based math kept here because we multiply by daily sales to get ₹.
  const bestPossibleDSO = weightedAvgTerms;
  const dailySales = totalSalesAll > 0 ? totalSalesAll / periodDays : 0;
  const leakageDays = dsoDays - bestPossibleDSO;
  const leakageINR = leakageDays * dailySales;
  const cashFlowLeakage = {
    bestPossibleDSO: parseFloat(bestPossibleDSO.toFixed(1)),
    actualDSO: parseFloat(dsoDays.toFixed(1)),
    leakageDays: parseFloat(leakageDays.toFixed(1)),
    leakageINR: Math.round(leakageINR),
  };

  // ---- Company Code Performance ----
  const companyCodePerformance = companyCodes.map(cc => {
    const ccOpen = openInvoices.filter(i => i.companyCodeId === cc.id);
    const ccAll = allInvoices.filter(i => i.companyCodeId === cc.id);
    const ccOpenAR = ccOpen.reduce((s, i) => s + i.amount, 0);
    const ccOverdueAR = ccOpen.filter(i => i.isOverdue).reduce((s, i) => s + i.amount, 0);
    const ccSales = ccAll.reduce((s, i) => s + i.amount, 0);
    const ccDSO = ccSales > 0 ? (ccOpenAR / ccSales) * periodDays : 0;
    const ccOverdueRatio = ccOpenAR > 0 ? (ccOverdueAR / ccOpenAR) * 100 : 0;
    return {
      code: cc.code,
      name: cc.name,
      dso: parseFloat(ccDSO.toFixed(1)),
      overdueRatio: parseFloat(ccOverdueRatio.toFixed(1)),
      openAR: Math.round(ccOpenAR),
      invoiceCount: ccOpen.length,
    };
  });

  // ---- Segment Efficiency ----
  const segmentEfficiency = segments.map(seg => {
    const segInvs = allInvoices.filter(i => i.customer.segment === seg);
    const segOpen = segInvs.filter(i => i.status === "OPEN" || i.status === "PARTIAL");
    const segCleared = segInvs.filter(i => i.status === "CLEARED");
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
    const segOverdue = segOpen.filter(i => i.isOverdue).reduce((s, i) => s + i.amount, 0);
    const segDSO = segSales > 0 ? (segOpenAR / segSales) * periodDays : 0;
    const segCollRate = segSales > 0 ? (segCleared.reduce((s, i) => s + i.amount, 0) / segSales * 100) : 0;
    const segOverdueRatio = segOpenAR > 0 ? (segOverdue / segOpenAR * 100) : 0;
    const efficiency = segDSO > 0 ? Math.round((1 / segDSO) * segCollRate * (1 - segOverdueRatio / 100) * 1000) : 0;
    return {
      segment: seg,
      dso: parseFloat(segDSO.toFixed(1)),
      collectionRate: parseFloat(segCollRate.toFixed(1)),
      overdueRatio: parseFloat(segOverdueRatio.toFixed(1)),
      efficiencyScore: efficiency,
    };
  });

  // ---- DSO Velocity (per-period % change) ----
  const dsoVelocity = {
    monthly: dsoMonthly.map((d, idx) => {
      const prev = idx > 0 ? dsoMonthly[idx - 1].value : d.value;
      const change = prev > 0 ? ((d.value - prev) / prev) * 100 : 0;
      return { month: d.month, change: parseFloat(change.toFixed(1)) };
    }),
    avgChange: parseFloat(avgDsoVelocity.toFixed(1)),
  };

  // ---- PBDI: Payment Behavior Deterioration Index ----
  // Compare each customer's pay-days in first half vs second half of the slice.
  const periodMidpoint = fiscalPeriods.length > 0
    ? new Date((fiscalPeriods[0].startDate.getTime() + fiscalPeriods[fiscalPeriods.length - 1].endDate.getTime()) / 2)
    : new Date();
  const custPayHalves = new Map<string, { firstHalf: number[]; secondHalf: number[]; name: string }>();
  for (const inv of clearedInvoices) {
    if (inv.daysForPayment == null) continue;
    const half = inv.documentDate < periodMidpoint ? "firstHalf" : "secondHalf";
    const entry = custPayHalves.get(inv.customerId) || { firstHalf: [], secondHalf: [], name: inv.customer.name };
    entry[half].push(inv.daysForPayment);
    custPayHalves.set(inv.customerId, entry);
  }
  const pbdiCustomers = [...custPayHalves.entries()]
    .map(([id, e]) => {
      if (e.firstHalf.length < 2 || e.secondHalf.length < 2) return null;
      const avg1 = e.firstHalf.reduce((a, b) => a + b, 0) / e.firstHalf.length;
      const avg2 = e.secondHalf.reduce((a, b) => a + b, 0) / e.secondHalf.length;
      const delta = avg2 - avg1;
      const pctChange = avg1 > 0 ? (delta / avg1) * 100 : 0;
      return { customerId: id, name: e.name, firstHalfAvg: parseFloat(avg1.toFixed(1)), secondHalfAvg: parseFloat(avg2.toFixed(1)), delta: parseFloat(delta.toFixed(1)), pctChange: parseFloat(pctChange.toFixed(1)) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.pctChange - a.pctChange);
  const pbdi = {
    alertCount: pbdiCustomers.filter(c => c.pctChange > 25).length,
    topDeteriorating: pbdiCustomers.slice(0, 8),
  };

  // ---- Credit Limit Utilization ----
  const custOpenAR = new Map<string, { ar: number; name: string; limit: number; segment: string }>();
  for (const inv of openInvoices) {
    const cust = inv.customer;
    const entry = custOpenAR.get(cust.id) || { ar: 0, name: cust.name, limit: cust.creditLimit || 0, segment: cust.segment };
    entry.ar += inv.amount;
    custOpenAR.set(cust.id, entry);
  }
  const utilEntries = [...custOpenAR.values()]
    .filter(c => c.limit > 0)
    .map(c => ({ name: c.name, segment: c.segment, openAR: Math.round(c.ar), limit: c.limit, utilPct: parseFloat(((c.ar / c.limit) * 100).toFixed(1)) }))
    .sort((a, b) => b.utilPct - a.utilPct);
  const breaches = utilEntries.filter(u => u.utilPct > 100).length;
  const avgUtil = utilEntries.length > 0 ? utilEntries.reduce((s, u) => s + u.utilPct, 0) / utilEntries.length : 0;
  const creditLimitUtil = {
    avgUtilPct: parseFloat(avgUtil.toFixed(1)),
    breachCount: breaches,
    topUtilized: utilEntries.slice(0, 6),
  };

  // ---- Payment Consistency (coefficient of variation by customer) ----
  const cvScores: number[] = [];
  for (const [, e] of custPayHalves) {
    const all = [...e.firstHalf, ...e.secondHalf];
    if (all.length < 3) continue;
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    const variance = all.reduce((a, b) => a + (b - mean) ** 2, 0) / all.length;
    const sd = Math.sqrt(variance);
    if (mean > 0) cvScores.push((sd / mean) * 100);
  }
  const avgCV = cvScores.length > 0 ? cvScores.reduce((a, b) => a + b, 0) / cvScores.length : 0;
  // Lower CV = more consistent. Score 100 - cv (clamped).
  const paymentConsistency = {
    score: Math.round(Math.max(0, Math.min(100, 100 - avgCV))),
    avgCV: parseFloat(avgCV.toFixed(1)),
    sampleSize: cvScores.length,
  };

  // ---- Discount Capture ----
  // Cleared invoices with payment terms having discount + paid within discount window.
  const termsById = new Map((await prisma.paymentTerms.findMany()).map(t => [t.id, t]));
  let discountEligibleAmt = 0;
  let discountCapturedAmt = 0;
  let potentialDiscountSavings = 0;
  let capturedDiscountSavings = 0;
  for (const inv of clearedInvoices) {
    const term = termsById.get(inv.paymentTermsId);
    if (!term || !term.discountDays1 || !term.discountPercent1) continue;
    discountEligibleAmt += inv.amount;
    potentialDiscountSavings += inv.amount * (term.discountPercent1 / 100);
    if (inv.daysForPayment != null && inv.daysForPayment <= term.discountDays1) {
      discountCapturedAmt += inv.amount;
      capturedDiscountSavings += inv.amount * (term.discountPercent1 / 100);
    }
  }
  const discountCapture = {
    eligibleAmount: Math.round(discountEligibleAmt),
    capturedAmount: Math.round(discountCapturedAmt),
    captureRate: discountEligibleAmt > 0 ? parseFloat(((discountCapturedAmt / discountEligibleAmt) * 100).toFixed(1)) : 0,
    capturedSavings: Math.round(capturedDiscountSavings),
    leftOnTable: Math.round(potentialDiscountSavings - capturedDiscountSavings),
  };

  // ---- Posting Lag ----
  const lags = allInvoices.map(i => Math.round((i.postingDate.getTime() - i.documentDate.getTime()) / 86400000));
  const avgLag = lags.length > 0 ? lags.reduce((a, b) => a + b, 0) / lags.length : 0;
  const lagBuckets = [0, 1, 2, 3, 4, 5, 6, 7].map(d => ({
    days: d,
    count: lags.filter(l => l === d).length,
  }));
  const postingLag = {
    avgDays: parseFloat(avgLag.toFixed(1)),
    p90: lags.length > 0 ? lags.sort((a, b) => a - b)[Math.floor(lags.length * 0.9)] : 0,
    buckets: lagBuckets,
  };

  // ---- Dunning Gap & Block Rate ----
  const dunningRecords = await prisma.dunningHistory.findMany({
    where: { invoice: { fiscalPeriodId: { in: fpIds } } },
    include: { invoice: { select: { dueDate: true, amount: true } } },
  });
  const firstDunningGaps: number[] = [];
  const firstByInv = new Map<string, { date: Date; due: Date }>();
  for (const dh of dunningRecords) {
    if (dh.dunningLevel !== 1) continue;
    const existing = firstByInv.get(dh.invoiceId);
    if (!existing || dh.dunningDate < existing.date) {
      firstByInv.set(dh.invoiceId, { date: dh.dunningDate, due: dh.invoice.dueDate });
    }
  }
  for (const v of firstByInv.values()) {
    firstDunningGaps.push(Math.max(0, Math.round((v.date.getTime() - v.due.getTime()) / 86400000)));
  }
  const avgDunningGap = firstDunningGaps.length > 0 ? firstDunningGaps.reduce((a, b) => a + b, 0) / firstDunningGaps.length : 0;
  const blocked = dunningRecords.filter(d => d.dunningBlock != null).length;
  const dunningGap = {
    avgGapDays: parseFloat(avgDunningGap.toFixed(1)),
    targetGapDays: 3,
    drift: parseFloat(Math.max(0, avgDunningGap - 3).toFixed(1)),
  };
  const dunningBlockRate = {
    rate: dunningRecords.length > 0 ? parseFloat(((blocked / dunningRecords.length) * 100).toFixed(1)) : 0,
    blockedCount: blocked,
    totalDunning: dunningRecords.length,
    benchmarkLow: 10,
    benchmarkHigh: 15,
  };

  // ---- Dispute-Adjusted DSO ----
  // Reported in days using traditional formula so the impact is intuitive.
  const blockedInvoiceIds = new Set(dunningRecords.filter(d => d.dunningBlock != null).map(d => d.invoiceId));
  const cleanOpenAR = openInvoices.filter(i => !blockedInvoiceIds.has(i.id)).reduce((s, i) => s + i.amount, 0);
  const cleanDSO = totalSalesAll > 0 ? (cleanOpenAR / totalSalesAll) * periodDays : 0;
  const disputeAdjusted = {
    actualDSO: parseFloat(dsoDays.toFixed(1)),
    cleanDSO: parseFloat(cleanDSO.toFixed(1)),
    disputeImpactDays: parseFloat((dsoDays - cleanDSO).toFixed(1)),
    disputedAR: Math.round(totalOpenAR - cleanOpenAR),
  };

  // ---- Touches per Crore ----
  const arInCrores = totalOpenAR / 10_000_000;
  const touchesPerCrore = {
    touches: dunningRecords.length,
    crores: parseFloat(arInCrores.toFixed(2)),
    rate: arInCrores > 0 ? parseFloat((dunningRecords.length / arInCrores).toFixed(2)) : 0,
  };

  // ---- Escalation Velocity (avg days between dunning levels) ----
  const dunningByInvoice = new Map<string, { level: number; date: Date }[]>();
  for (const dh of dunningRecords) {
    const arr = dunningByInvoice.get(dh.invoiceId) || [];
    arr.push({ level: dh.dunningLevel, date: dh.dunningDate });
    dunningByInvoice.set(dh.invoiceId, arr);
  }
  const escalationGaps: number[] = [];
  for (const [, arr] of dunningByInvoice) {
    arr.sort((a, b) => a.level - b.level);
    for (let i = 1; i < arr.length; i++) {
      escalationGaps.push(Math.round((arr[i].date.getTime() - arr[i - 1].date.getTime()) / 86400000));
    }
  }
  const avgEscalationGap = escalationGaps.length > 0 ? escalationGaps.reduce((a, b) => a + b, 0) / escalationGaps.length : 0;
  const escalationVelocity = {
    avgDaysBetweenLevels: parseFloat(avgEscalationGap.toFixed(1)),
    targetDays: 10,
    sampleSize: escalationGaps.length,
  };

  // ---- Forecast MAPE & Cash Conversion ----
  let mapeSum = 0;
  let mapeCount = 0;
  let totalExpected = 0;
  let totalActual = 0;
  for (const wc of weeklyCashflows) {
    totalExpected += wc.expectedCashInflow;
    totalActual += wc.actualCashInflow;
    if (wc.expectedCashInflow > 0) {
      mapeSum += Math.abs(wc.expectedCashInflow - wc.actualCashInflow) / wc.expectedCashInflow * 100;
      mapeCount++;
    }
  }
  const forecastMape = {
    mape: mapeCount > 0 ? parseFloat((mapeSum / mapeCount).toFixed(1)) : 0,
    confidence: mapeCount > 0 ? Math.max(0, Math.round(100 - mapeSum / mapeCount)) : 0,
    expectedInflow: Math.round(totalExpected),
    actualInflow: Math.round(totalActual),
  };
  const cashConversion = {
    ratio: totalSalesAll > 0 ? parseFloat(((totalActual / totalSalesAll) * 100).toFixed(1)) : 0,
    sales: Math.round(totalSalesAll),
    collected: Math.round(totalActual),
  };

  // ---- Summary ----
  const summary = {
    totalInvoices: allInvoices.length,
    openInvoices: openInvoices.length,
    clearedInvoices: clearedInvoices.length,
    overdueInvoices: overdueInvs.length,
    totalOpenAR: Math.round(totalOpenAR),
    overdueAR: Math.round(overdueAR),
    currentAR: Math.round(currentAR),
    totalSales: Math.round(totalSalesAll),
  };

  return {
    summary,
    executive: {
      dso: { overall: dsoOverall, monthly: dsoMonthly },
      overdueRatio: { overall: parseFloat(overdueRatio.toFixed(1)), monthly: overdueRatioMonthly },
      revenueAtRisk: { value: parseFloat(revenueAtRisk.toFixed(1)) },
      receivablesTurnover: { overall: parseFloat(turnover.toFixed(1)), monthly: turnoverMonthly },
      netARMovement: { monthly: netARMonthly },
    },
    collection: {
      cei: { overall: ceiOverall, monthly: ceiMonthly },
      onTimePayment: { monthly: onTimeMonthly },
      collectionEffectiveness: { monthly: collEffMonthly },
      creditPeriodEffectiveness: { data: cpEffectiveness },
    },
    aging: {
      buckets: agingBuckets,
      overdueDensity: { count: parseFloat(countDensity.toFixed(1)), value: parseFloat(valueDensity.toFixed(1)) },
      peakExposure,
    },
    operational: {
      invoiceToCash: { p50, p90 },
      creditPeriodUtilization: { overall: parseFloat(avgCPU.toFixed(1)), monthly: cpuMonthly },
      daysToClearBacklog: { monthly: backlogMonthly },
    },
    advanced: {
      dsoBridge,
      arHealthScore,
      termsMixDrag,
      carryingCost,
      cashFlowLeakage,
      companyCodePerformance,
      segmentEfficiency,
      dsoVelocity,
      pbdi,
      creditLimitUtil,
      paymentConsistency,
      discountCapture,
      postingLag,
      dunningGap,
      dunningBlockRate,
      disputeAdjusted,
      touchesPerCrore,
      escalationVelocity,
      forecastMape,
      cashConversion,
    },
  };
}

type Slice = Awaited<ReturnType<typeof computeForFYQuarter>>;

// ============================================================
// AI INSIGHTS — Rule-based, derived from the slice metrics
// ============================================================

function fmtCrore(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_00) return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function fmtMillions(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// ============================================================
// Per-KPI insights — data-driven observation + recommendation + action
// Computed per (FY, quarter) slice; consumed by every KPI tile so the
// modal narrative changes when the filter changes.
// ============================================================

export interface KpiInsight {
  observation: string;
  recommendation: string;
  nextAction: string;
}

function avg<T>(arr: T[], pick: (x: T) => number): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + pick(x), 0) / arr.length;
}

function computePerKpiInsights(slice: Slice, fy: FY, quarter: Quarter, prevSlice?: Slice): Record<string, KpiInsight> {
  const e = slice.executive;
  const c = slice.collection;
  const a = slice.aging;
  const o = slice.operational;
  const adv = slice.advanced;
  const sum = slice.summary;
  const periodLbl = quarter === "All" ? `FY ${fy - 1}-${String(fy).slice(2)}` : `${quarter} FY ${fy - 1}-${String(fy).slice(2)}`;

  const trendDelta = (curr: number, prev?: number, suffix = "") => {
    if (prev === undefined || prev === 0) return "no prior period to compare";
    const d = curr - prev;
    if (Math.abs(d) < 0.05) return "flat vs prev period";
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}${suffix} vs prev period`;
  };

  const dsoCurr = e.dso.overall;
  const dsoPrev = prevSlice?.executive.dso.overall;
  const dsoBand = dsoCurr < 15 ? "healthy" : dsoCurr < 25 ? "manageable" : dsoCurr < 35 ? "elevated" : "critical";

  const overdueCurr = e.overdueRatio.overall;
  const overduePrev = prevSlice?.executive.overdueRatio.overall;

  const ceiCurr = c.cei.overall;
  const ceiPrev = prevSlice?.collection.cei.overall;

  const sixtyPlus = a.buckets.find(b => b.key === "60_PLUS");
  const notDue = a.buckets.find(b => b.key === "NOT_DUE");
  const peak = a.peakExposure;

  const otpAvg = avg(c.onTimePayment.monthly, m => m.value);
  const effAvg = avg(c.collectionEffectiveness.monthly, m => m.value);
  const backlogAvg = avg(o.daysToClearBacklog.monthly, m => m.value);

  const cpuOverall = o.creditPeriodUtilization.overall;
  const p50 = o.invoiceToCash.p50;
  const p90 = o.invoiceToCash.p90;

  const cardLeak = adv.cashFlowLeakage;
  const carry = adv.carryingCost;
  const drag = adv.termsMixDrag;
  const dunGap = adv.dunningGap;
  const blockRate = adv.dunningBlockRate;
  const health = adv.arHealthScore;
  const pbdi = adv.pbdi;
  const breach = adv.creditLimitUtil.breachCount;
  const mape = adv.forecastMape;
  const cashConv = adv.cashConversion;
  const dispute = adv.disputeAdjusted;
  const consistency = adv.paymentConsistency;
  const discount = adv.discountCapture;
  const posting = adv.postingLag;
  const escal = adv.escalationVelocity;
  const dsoBridge = adv.dsoBridge;
  const segEff = adv.segmentEfficiency;
  const ccPerf = adv.companyCodePerformance;
  const velocity = adv.dsoVelocity;
  const touches = adv.touchesPerCrore;

  const out: Record<string, KpiInsight> = {};

  // ---------- Basic KPIs ----------
  out["basic-dso"] = {
    observation: `For ${periodLbl}, DSO is ${dsoCurr.toFixed(1)} (${dsoBand}). Average AR ₹${(adv.carryingCost.annualCost / Math.max(0.01, adv.carryingCost.avgDaysOutstanding) * 365 / 100).toFixed(0)} sits against ${fmtMillions(sum.totalSales)} of credit sales; ${trendDelta(dsoCurr, dsoPrev)}.`,
    recommendation: dsoCurr < 15
      ? "Hold the line — DSO is in best-in-class territory. Use any room to extend terms strategically with key customers."
      : dsoCurr < 25
      ? "Tighten dunning cadence on the slowest-paying segment to push DSO toward < 15."
      : dsoCurr < 35
      ? "Stand up a focused collections taskforce — every 1-point reduction frees ~₹"
        + (sum.totalSales / 100).toFixed(0)
        + " of working capital."
      : "Initiate an emergency cash recovery program; the AR-to-sales ratio signals systemic collection failure.",
    nextAction: dsoCurr < 25
      ? `Maintain weekly collector cadence and review top ${Math.min(5, pbdi.alertCount || 5)} accounts for early signs of slip.`
      : `Within 14 days, complete a top-20 customer call sweep targeting accounts contributing > ${(dsoBridge.segments[0]?.contribution ?? 0).toFixed(1)} pts to blended DSO.`,
  };

  out["basic-overdue-ratio"] = {
    observation: `${overdueCurr.toFixed(1)}% of open AR (${fmtMillions(sum.overdueAR)}) is past due across ${sum.overdueInvoices.toLocaleString("en-IN")} invoices; ${trendDelta(overdueCurr, overduePrev, "pp")}.`,
    recommendation: overdueCurr < 20
      ? "Overdue ratio is within target band. Keep monitoring weekly aging migration into 60+."
      : overdueCurr < 35
      ? "Run a focused blitz on invoices > 30 days overdue before they migrate to 60+ where recovery drops sharply."
      : "Escalate the 60+ cohort — recoverability falls below 60% after 60 days. Engage senior collectors on top accounts.",
    nextAction: `Triage the ${(sixtyPlus?.count ?? 0).toLocaleString("en-IN")} invoices in the 60+ bucket (${fmtMillions(sixtyPlus?.amount ?? 0)}). Decide write-off vs legal action for each by week's end.`,
  };

  out["basic-revenue-at-risk"] = {
    observation: `Revenue at risk: ${e.revenueAtRisk.value.toFixed(1)}% — that's the share of open AR sitting in 45+ day credit-term invoices and already overdue.`,
    recommendation: e.revenueAtRisk.value < 15
      ? "Risk concentration is manageable. Continue to mine the longer-term cohort for early signs of distress."
      : "Tighten credit policy on the 45/60-day terms cohort, or migrate those customers to milestone-based billing.",
    nextAction: "Pull the top 10 invoices on 45+ day terms older than due date and assign personal collector ownership this week.",
  };

  out["basic-receivables-turnover"] = {
    observation: `Receivables turnover ratio: ${e.receivablesTurnover.overall.toFixed(1)}× for ${periodLbl}. Lower than 4× indicates AR is growing faster than sales.`,
    recommendation: e.receivablesTurnover.overall >= 5
      ? "Healthy turnover — sales pace is supported by collection cadence."
      : e.receivablesTurnover.overall >= 4
      ? "Acceptable but watch for downward drift; pair sales acceleration with proportionate collection investment."
      : "Turnover below 4× signals overwhelmed collections. Increase capacity or automate L1 reminders.",
    nextAction: "Map monthly sales vs collections — if sales > collections for 2 consecutive months, expand the collections team or automate L1 dunning.",
  };

  out["basic-net-ar-movement"] = {
    observation: `Monthly AR movement traces whether the portfolio is expanding (cash trap) or contracting (cash release) across ${periodLbl}.`,
    recommendation: "Persistently positive movement indicates billed > collected. Tie sales growth targets to a parallel collections target to keep AR neutral.",
    nextAction: "Add a 'net AR movement' threshold to the monthly leadership review — alert if any month exceeds +5% of avg AR.",
  };

  out["basic-cei"] = {
    observation: `Collection Effectiveness Index is ${ceiCurr.toFixed(0)}% for ${periodLbl}; ${trendDelta(ceiCurr, ceiPrev, "pp")}.`,
    recommendation: ceiCurr >= 90
      ? "World-class. Preserve the playbook and onboard new collectors via shadow sessions."
      : ceiCurr >= 80
      ? "Strong, but the gap to 90% likely comes from the 60+ bucket — focus there."
      : ceiCurr >= 70
      ? "Acceptable; lift to > 80% by tightening dunning gap and call cadence."
      : "Below threshold — collections team is reactive. Implement a daily standup with target deltas.",
    nextAction: ceiCurr < 80
      ? "Set a 90-day project to reach 80% CEI; weekly standups with named owners per top customer."
      : "Maintain the cadence and ratchet the floor target up by 2 pts each quarter.",
  };

  out["basic-on-time-payment"] = {
    observation: `Monthly on-time payment rate averages ${otpAvg.toFixed(0)}% across ${c.onTimePayment.monthly.length} months in ${periodLbl}.`,
    recommendation: otpAvg >= 85
      ? "Customer payment behaviour is strong. Use this leverage to renegotiate terms with chronic late payers."
      : otpAvg >= 70
      ? "Mid-pack — friction sits at the dunning gap. Move first reminder closer to due date."
      : "Low on-time rate — review billing accuracy and dispute volumes; many late payments may be reactive to billing issues.",
    nextAction: otpAvg >= 85
      ? "Maintain monitoring; investigate any month falling > 5pp below the average."
      : "Pre-due-date reminders (5–7 days before) on the top 100 invoices for the next quarter.",
  };

  out["basic-collection-effectiveness-weekly"] = {
    observation: `Average monthly collection effectiveness: ${effAvg.toFixed(0)}%. ${c.collectionEffectiveness.monthly.filter(m => m.value >= 70).length} of ${c.collectionEffectiveness.monthly.length} months hit the 70% target.`,
    recommendation: effAvg >= 70
      ? "Above target — focus on the months that missed and identify the customer drivers."
      : "Below target — pair every overdue customer with a named collector and weekly check-ins.",
    nextAction: "Run a 30-day blitz on the bottom-quartile months; require daily progress notes per top-20 customer.",
  };

  out["basic-credit-period-effectiveness"] = {
    observation: `Effectiveness varies sharply by credit term: ${c.creditPeriodEffectiveness.data.map(d => `${d.creditPeriod} ${d.value.toFixed(0)}%`).join(" · ")}.`,
    recommendation: "Long credit terms (45/60 days) typically yield best discipline since they go to larger customers. Tighten 7/15-day exception terms — they're often used for SMBs that drift.",
    nextAction: "Audit short-term (7/15-day) customers — convert to standard 30-day terms unless there's a strategic reason for the exception.",
  };

  out["basic-aging-buckets"] = {
    observation: `60+ day bucket: ${(sixtyPlus?.percentage ?? 0).toFixed(0)}% of AR (${fmtMillions(sixtyPlus?.amount ?? 0)}). Not-Due: ${(notDue?.percentage ?? 0).toFixed(0)}%.`,
    recommendation: (sixtyPlus?.percentage ?? 0) > 25
      ? "Inverted aging pyramid — focus on the 30-60 cohort to prevent migration into 60+."
      : "Aging distribution is acceptable. Watch for migration of 16–30 → 31–45 month over month.",
    nextAction: "Schedule a 14-day blitz on 31–60 day invoices; treat the bucket as the early-warning leading indicator for next month's 60+.",
  };

  out["basic-aging-donut"] = {
    observation: `Composition split shows ${(notDue?.percentage ?? 0).toFixed(0)}% not-due and ${(sixtyPlus?.percentage ?? 0).toFixed(0)}% in 60+. The donut visualises the bucket proportions of the bar chart.`,
    recommendation: "Use the donut to spot inversion at a glance — green should dominate the centre of the chart.",
    nextAction: "Report the donut weekly in CFO dashboards — quick visual heuristic for portfolio health drift.",
  };

  out["basic-overdue-density"] = {
    observation: `Count density ${a.overdueDensity.count.toFixed(0)}% vs value density ${a.overdueDensity.value.toFixed(0)}%. A gap means the problem is concentrated in either many small invoices or a few large ones.`,
    recommendation: a.overdueDensity.value > a.overdueDensity.count
      ? "Few large invoices drive most overdue value — concentrate senior collectors on those."
      : "Many small invoices — automate L1 dunning to clear them at low cost.",
    nextAction: "Segment the overdue book by amount: above ₹50L → personal collector; below → automated dunning sequence.",
  };

  out["basic-peak-exposure"] = {
    observation: peak.invoiceNo === "—"
      ? "No overdue invoices in this period."
      : `Single largest overdue invoice: ${fmtMillions(peak.amount)} (${peak.invoiceNo}, company ${peak.companyCode}, ${peak.daysOverdue} days overdue).`,
    recommendation: peak.invoiceNo === "—"
      ? "Maintain the discipline that's preventing high-exposure events."
      : peak.daysOverdue > 60
      ? "Escalate to CFO-to-CFO call this week — high-exposure overdue past 60 days needs immediate decision (settle, write-off, or sue)."
      : "Personal collector ownership; daily progress update until cleared.",
    nextAction: peak.invoiceNo === "—"
      ? "Monitor weekly — flag any single invoice exceeding 2% of total open AR."
      : "Open an action ticket on this invoice; senior collector + CFO update by end of week.",
  };

  out["basic-invoice-to-cash"] = {
    observation: `Median time to cash: P50 ${p50} days · P90 ${p90} days. Wide P50–P90 gap (${p90 - p50}d) indicates a bimodal distribution — fast payers and stuck invoices.`,
    recommendation: p90 - p50 > 30
      ? "Stuck-invoice tail is too long. Identify the P90 invoices and apply hands-on collection."
      : "Distribution is tight. Continue to monitor the long tail for new outliers.",
    nextAction: "Pull the top 5% of cleared invoices by daysForPayment — analyse common attributes (customer, term, product) and address root cause.",
  };

  out["basic-credit-period-utilization"] = {
    observation: `Customers use ${cpuOverall.toFixed(0)}% of the allowed credit period on average. Above 100% means systematic late payment.`,
    recommendation: cpuOverall > 100
      ? "Customers exceed terms — terms are effectively longer than agreed. Renegotiate or enforce a stricter dunning cadence."
      : cpuOverall < 80
      ? "Customers pay early — consider offering longer terms in exchange for volume commitments."
      : "Within band. Sustain the discipline.",
    nextAction: cpuOverall > 100
      ? "Letter to top 20 customers exceeding > 110% utilisation citing breach of agreed terms."
      : "Use the headroom for a strategic terms negotiation on the next renewal.",
  };

  out["basic-days-to-clear-backlog"] = {
    observation: `Monthly average backlog clear time: ${backlogAvg.toFixed(1)} days. Above 5 days indicates collections can't keep up with new overdue accumulation.`,
    recommendation: backlogAvg <= 3
      ? "Capacity matches inflow — sustain."
      : backlogAvg <= 5
      ? "Approaching capacity ceiling — pre-empt with automation before backlog exceeds 7 days."
      : "Capacity gap. Add collector headcount or automate L1 reminders to absorb the inflow.",
    nextAction: backlogAvg > 5
      ? "Approve 30-day pilot of automated L1 dunning; measure backlog reduction."
      : "Quarterly review; flag if average exceeds 5 in any single month.",
  };

  // ---------- Advanced KPIs ----------
  const worstDriver = [...dsoBridge.segments].sort((a, b) => b.contribution - a.contribution)[0];
  out["dso-bridge"] = {
    observation: `Blended DSO ${dsoBridge.blendedDSO.toFixed(1)}. Largest drag: ${worstDriver?.segment ?? "—"} contributing ${(worstDriver?.contribution ?? 0).toFixed(1)} pts at ${(worstDriver?.weight ?? 0).toFixed(0)}% of sales.`,
    recommendation: `Target the ${worstDriver?.segment ?? "weakest"} segment first — fixing the heaviest contributor yields the largest DSO impact.`,
    nextAction: `Set a 60-day target to reduce ${worstDriver?.segment ?? "the worst segment"} DSO by 3 points via dedicated collector pod.`,
  };

  out["dso-velocity"] = {
    observation: `Average month-on-month DSO change: ${velocity.avgChange >= 0 ? "+" : ""}${velocity.avgChange.toFixed(1)}%. ${velocity.avgChange > 5 ? "Accelerating upward — losing ground." : velocity.avgChange < -5 ? "Steady improvement." : "Stable."}`,
    recommendation: velocity.avgChange > 5
      ? "Investigate the most recent month — sudden velocity spikes usually trace to one or two large customers."
      : "Maintain the cadence; watch for inflection.",
    nextAction: "Add a velocity threshold alert to the dashboard — flag any month > +10% velocity.",
  };

  out["terms-mix-drag"] = {
    observation: `Weighted avg terms ${drag.weightedAvgTerms.toFixed(0)}d vs actual pay days ${drag.avgActualPayDays.toFixed(0)}d — behavioural drag ${drag.drag >= 0 ? "+" : ""}${drag.drag.toFixed(0)}d.`,
    recommendation: drag.drag > 5
      ? "Customers systematically exceed terms. Either tighten enforcement or reprice for the longer effective terms."
      : "Drag is contained. Maintain monitoring.",
    nextAction: drag.drag > 5
      ? "Quarterly terms-vs-actuals reconciliation per customer; renegotiate when drag > 7 days."
      : "Track monthly and flag if drag exceeds 5 days for any segment.",
  };

  out["ar-health-score"] = {
    observation: `AR Health: ${health.score}/100 (Grade ${health.grade}). Strongest dim: ${Object.entries(health.components).sort((a, b) => b[1] - a[1])[0]?.[0]}. Weakest: ${Object.entries(health.components).sort((a, b) => a[1] - b[1])[0]?.[0]}.`,
    recommendation: `Lift the weakest dimension first — even a 10-point gain on the lowest component moves the overall grade up one letter.`,
    nextAction: `Stand up a 90-day program targeting the weakest health dimension; report progress monthly to CFO.`,
  };

  out["pbdi"] = {
    observation: `${pbdi.alertCount} customers show > 25% deterioration in payment behaviour. Worst: ${pbdi.topDeteriorating[0]?.name ?? "—"} (${pbdi.topDeteriorating[0]?.pctChange ?? 0}%).`,
    recommendation: pbdi.alertCount > 0
      ? "Treat PBDI alerts as early-warning signals — many will hit 60+ overdue within a quarter without intervention."
      : "No material deterioration this period.",
    nextAction: pbdi.alertCount > 0
      ? `Open a watchlist of ${pbdi.alertCount} accounts; assign to senior collectors with weekly check-ins.`
      : "Continue quarterly PBDI scans.",
  };

  out["credit-limit-util"] = {
    observation: `${breach} customers exceed credit limit. Average utilisation across sample: ${adv.creditLimitUtil.avgUtilPct.toFixed(0)}%.`,
    recommendation: breach > 50
      ? "Many customers breach limits — either credit limits are stale or risk policy is loose. Review both."
      : "Manageable; spot-check top breachers.",
    nextAction: `Refresh credit ratings for the ${breach} breaching customers within 30 days; consider order holds for repeat offenders.`,
  };

  out["touches-per-dollar"] = {
    observation: `Collection effort: ${touches.rate.toFixed(2)} touches per ₹Crore of open AR (${touches.touches.toLocaleString("en-IN")} touches on ${touches.crores.toFixed(1)}Cr).`,
    recommendation: touches.rate < 2
      ? "Highly efficient — keep the playbook."
      : touches.rate < 4
      ? "Moderate efficiency. Automating L1 reminders should reduce this by half."
      : "Heavy effort per crore — likely repeated calls without resolution. Investigate process.",
    nextAction: touches.rate >= 4
      ? "Audit dunning logs to find chronic ‘touched but not paid' accounts; consider write-off or legal action."
      : "Monitor monthly; flag if rate exceeds 4.",
  };

  out["escalation-velocity"] = {
    observation: `Average ${escal.avgDaysBetweenLevels.toFixed(0)} days between dunning escalations (target ${escal.targetDays}). Sample size: ${escal.sampleSize}.`,
    recommendation: escal.avgDaysBetweenLevels > 15
      ? "Escalation too slow — invoices age before reaching authority. Compress to the ~10-day target."
      : escal.avgDaysBetweenLevels < 5
      ? "Possibly too aggressive — may damage customer relationships. Match velocity to risk tier."
      : "Cadence is on target.",
    nextAction: escal.avgDaysBetweenLevels > 15
      ? "Add automation triggers to fire L2/L3 letters at scheduled days from L1, not collector discretion."
      : "Sustain the cadence.",
  };

  out["payment-consistency"] = {
    observation: `Portfolio payment-consistency score: ${consistency.score}/100 (lower CV = more predictable). Sample: ${consistency.sampleSize} customers.`,
    recommendation: consistency.score >= 70
      ? "Highly predictable portfolio — strong base for cash forecasting."
      : consistency.score >= 50
      ? "Moderately predictable. Stratify forecasts by segment for better accuracy."
      : "Low consistency — forecasting cash inflow is unreliable. Consider customer-level forecasts for top accounts.",
    nextAction: "Build per-customer payment-pattern profiles for top-20 accounts; feed into weekly cash forecast.",
  };

  out["discount-capture"] = {
    observation: `Captured ${discount.captureRate.toFixed(1)}% of available early-payment discount (${fmtMillions(discount.capturedSavings)} saved; ${fmtMillions(discount.leftOnTable)} left on the table).`,
    recommendation: discount.captureRate < 30
      ? "Either discounts aren't attractive enough or AP teams aren't aware. Test 2/10 net 30 messaging on top customers."
      : "Solid capture. Investigate whether terms could be tightened further.",
    nextAction: discount.captureRate < 30
      ? "Email campaign to top 50 customers reminding them of available discount terms."
      : "Sustain and benchmark; consider expanding discount eligibility.",
  };

  out["posting-lag"] = {
    observation: `Average posting lag ${posting.avgDays.toFixed(1)} days (P90 ${posting.p90}). Every lag day delays the DSO clock start.`,
    recommendation: posting.avgDays > 2
      ? "Compress to same-day posting via system integration or workflow change."
      : "Already tight — sustain.",
    nextAction: posting.avgDays > 2
      ? "Audit the document-to-posting workflow; identify and remove approval steps causing delay."
      : "Maintain SLA and monitor.",
  };

  out["dunning-gap"] = {
    observation: `First dunning lands ${dunGap.avgGapDays.toFixed(0)} days after due (target ${dunGap.targetGapDays}). Drift: ${dunGap.drift.toFixed(0)} days.`,
    recommendation: dunGap.drift > 5
      ? "This is the #1 controllable DSO lever — closing the gap typically saves 5–10 DSO days."
      : "Within tolerance.",
    nextAction: dunGap.drift > 5
      ? "Automate L1 reminder firing at due-date + 1 day, no manual gate."
      : "Maintain.",
  };

  out["dispute-adjusted-dso"] = {
    observation: `Dispute impact on DSO: ${dispute.disputeImpactDays.toFixed(1)} days (${fmtMillions(dispute.disputedAR)} disputed AR). Clean DSO: ${dispute.cleanDSO.toFixed(1)} days vs total ${dispute.actualDSO.toFixed(1)}.`,
    recommendation: dispute.disputeImpactDays > 5
      ? "Disputes inflate DSO meaningfully. Separately track dispute aging and SLA for resolution."
      : "Dispute drag is contained.",
    nextAction: dispute.disputeImpactDays > 5
      ? "Stand up a dispute war-room with 14-day resolution SLA on each blocked invoice."
      : "Maintain quarterly review of dispute volume.",
  };

  out["dunning-block-rate"] = {
    observation: `${blockRate.rate.toFixed(0)}% of dunning records carry a block (${blockRate.blockedCount} of ${blockRate.totalDunning}). Industry band: ${blockRate.benchmarkLow}–${blockRate.benchmarkHigh}%.`,
    recommendation: blockRate.rate > blockRate.benchmarkHigh
      ? "High block rate signals dispute backlog or team using blocks to dodge difficult conversations. Audit reason codes."
      : blockRate.rate < blockRate.benchmarkLow
      ? "Block rate is unusually low — disputes may be under-recorded."
      : "Within normal band.",
    nextAction: blockRate.rate > blockRate.benchmarkHigh
      ? "Sample 30 blocked records weekly to validate the block reason; reject and reactivate where not justified."
      : "Sustain.",
  };

  out["carrying-cost"] = {
    observation: `Daily carrying cost ${fmtMillions(carry.dailyCost)} at 10% cost of capital. Annualised: ${fmtMillions(carry.annualCost)}.`,
    recommendation: "Every DSO day saved is ~" + fmtMillions(carry.dailyCost) + " in annualised cost-of-capital. Use this to justify AR automation investments.",
    nextAction: "Build a business case for AR-automation investment using the daily carrying cost as the savings denominator.",
  };

  out["cash-flow-leakage"] = {
    observation: `${cardLeak.leakageDays.toFixed(0)} days between actual DSO (${cardLeak.actualDSO.toFixed(0)}d) and best-possible (${cardLeak.bestPossibleDSO.toFixed(0)}d terms-implied) leak ${fmtMillions(cardLeak.leakageINR)} of cash.`,
    recommendation: `Closing 50% of the leakage gap unlocks ~${fmtMillions(cardLeak.leakageINR * 0.5)} of working capital — a meaningful balance-sheet improvement.`,
    nextAction: "Set an FY target to close 30% of the leakage; track quarterly.",
  };

  out["forecast-mape"] = {
    observation: `Forecast MAPE: ${mape.mape.toFixed(0)}% (confidence ${mape.confidence}%). Expected ${fmtMillions(mape.expectedInflow)} vs actual ${fmtMillions(mape.actualInflow)}.`,
    recommendation: mape.mape > 30
      ? "Forecasts unreliable for treasury decisions. Rebuild the model with recent history."
      : mape.mape > 15
      ? "Acceptable accuracy. Tighten by stratifying forecasts per segment."
      : "Forecast is reliable.",
    nextAction: mape.mape > 25
      ? "Recalibrate model with the last 13 weeks of actuals; bench against a simple naïve baseline."
      : "Monitor monthly.",
  };

  out["cash-conversion-efficiency"] = {
    observation: `Cash conversion ratio: ${cashConv.ratio.toFixed(0)}% (collected ${fmtMillions(cashConv.collected)} on ${fmtMillions(cashConv.sales)} sales).`,
    recommendation: cashConv.ratio < 70
      ? "AR is building faster than collections. Pair sales growth with proportional collections investment."
      : "Conversion is healthy.",
    nextAction: cashConv.ratio < 70
      ? "Add a 'collections-to-sales' KPI to the monthly leadership review."
      : "Track quarterly.",
  };

  out["company-code-index"] = {
    observation: ccPerf.length >= 2
      ? `Leaders: ${[...ccPerf].sort((a, b) => a.dso - b.dso)[0].name} at ${[...ccPerf].sort((a, b) => a.dso - b.dso)[0].dso.toFixed(0)}d. Lagging: ${[...ccPerf].sort((a, b) => b.dso - a.dso)[0].name} at ${[...ccPerf].sort((a, b) => b.dso - a.dso)[0].dso.toFixed(0)}d.`
      : "Only one company code in this slice.",
    recommendation: "Replicate the leader's playbook (cadence, contact mapping, escalation) into the lagging entity.",
    nextAction: "Cross-pollinate via a 30-day swap of senior collectors between leader and lagging entities.",
  };

  out["segment-efficiency"] = {
    observation: segEff.length >= 2
      ? `${segEff[0].segment} runs at ${segEff[0].efficiencyScore}. ${[...segEff].sort((a, b) => a.efficiencyScore - b.efficiencyScore)[0].segment} at ${[...segEff].sort((a, b) => a.efficiencyScore - b.efficiencyScore)[0].efficiencyScore}.`
      : "Segment efficiency data limited.",
    recommendation: "Lift the weakest segment through targeted process improvements; the upside is disproportionate.",
    nextAction: "Quarterly segment review with explicit improvement targets per segment.",
  };

  // ---------- AI-Insights ‘tiles' (mirrored to enable per-tile drill-in) ----------
  out["executive-summary"] = {
    observation: `${periodLbl} headline: DSO ${dsoCurr.toFixed(1)} · CEI ${ceiCurr.toFixed(0)}% · ${overdueCurr.toFixed(0)}% overdue · ${fmtMillions(sum.totalOpenAR)} cash trapped.`,
    recommendation: health.score >= 65
      ? "Portfolio in healthy band. Use the headroom for strategic terms negotiations and capacity investment."
      : "Stand up a CFO-sponsored cash recovery program with weekly progress reviews.",
    nextAction: "Set the next quarter's target as a 10% improvement on the weakest of the four headline metrics.",
  };

  out["risk-heatmap"] = {
    observation: `${pbdi.alertCount} PBDI alerts + ${breach} credit breaches + ${blockRate.rate.toFixed(0)}% block rate combine into the current risk surface.`,
    recommendation: pbdi.alertCount + breach > 50
      ? "Risk concentration is elevated — initiate a portfolio review and tighten credit policy."
      : "Risk signals manageable; sustain controls.",
    nextAction: "Quarterly risk review with executive escalation for any account triggering 2+ of the three risk dimensions.",
  };

  out["cash-forecast"] = {
    observation: `${mape.confidence}% forecast confidence, ${mape.mape.toFixed(0)}% MAPE. Cash conversion ${cashConv.ratio.toFixed(0)}%.`,
    recommendation: "Treasury can plan liquidity decisions based on forecasts at MAPE < 15%. Above that, hold a larger buffer.",
    nextAction: "Build a 13-week rolling cash forecast feeding the weekly treasury committee.",
  };

  out["working-capital-opportunity"] = {
    observation: `${fmtMillions(cardLeak.leakageINR)} of working capital sits trapped beyond credit terms.`,
    recommendation: "Sequence initiatives by impact-vs-effort: posting lag (easy) → dispute fast-track (medium) → dunning gap closure (high impact).`",
    nextAction: "Stand up a Working Capital War Room with quarterly release targets per business head.",
  };

  out["collections-efficiency-trend"] = {
    observation: `CEI ${ceiCurr.toFixed(0)}%, monthly effectiveness average ${effAvg.toFixed(0)}%, ${c.collectionEffectiveness.monthly.filter(m => m.value >= 70).length}/${c.collectionEffectiveness.monthly.length} months at target.`,
    recommendation: ceiCurr < 80
      ? "CEI gap to 90% comes from the 60+ aging bucket — direct intervention required."
      : "Sustain and lift the floor target by 2pp next quarter.",
    nextAction: "Tie collector compensation to monthly effectiveness — 80% floor with kicker above 90%.",
  };

  return out;
}

function computeAIInsightsFromData(slice: Slice, fy: FY, quarter: Quarter, prevSlice?: Slice) {
  const exec = slice.executive;
  const coll = slice.collection;
  const aging = slice.aging;
  const adv = slice.advanced;
  const sum = slice.summary;

  const periodLabel = quarter === "All" ? FY_LABEL[fy] : `${quarter} ${FY_LABEL[fy]}`;
  const dso = exec.dso.overall;
  const cei = coll.cei.overall;
  const overduePct = exec.overdueRatio.overall;
  const health = adv.arHealthScore;
  const leakage = adv.cashFlowLeakage;
  const drag = adv.termsMixDrag;
  const carry = adv.carryingCost;
  const dunGap = adv.dunningGap;
  const blockRate = adv.dunningBlockRate;
  const mape = adv.forecastMape;
  const segEff = adv.segmentEfficiency;
  const pbdi = adv.pbdi;
  const breach = adv.creditLimitUtil.breachCount;

  // Comparative deltas vs previous slice (if available).
  const dsoDelta = prevSlice ? dso - prevSlice.executive.dso.overall : 0;
  const overdueDelta = prevSlice ? overduePct - prevSlice.executive.overdueRatio.overall : 0;
  const healthDelta = prevSlice ? health.score - prevSlice.advanced.arHealthScore.score : 0;

  const worstSegment = [...segEff].sort((a, b) => a.efficiencyScore - b.efficiencyScore)[0];
  const bestSegment = [...segEff].sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];

  // Severity tiers based on grade.
  const gradeTone = health.grade === "A" ? "strong" : health.grade === "B" ? "solid" : health.grade === "C" ? "mixed" : health.grade === "D" ? "stressed" : "critical";
  const execSeverity = health.score >= 65 ? "positive" : health.score >= 50 ? "info" : health.score >= 35 ? "warning" : "critical";

  // ---- Card 1: Executive Summary ----
  const card1 = {
    id: "exec-summary",
    title: "Executive Summary",
    iconKey: "summary",
    severity: execSeverity as "critical" | "warning" | "info" | "positive",
    headline: `AR Health Grade ${health.grade} (${health.score}/100) — ${gradeTone === "strong" ? "Portfolio performing well" : gradeTone === "solid" ? "Stable footing with watch areas" : gradeTone === "mixed" ? "Mixed signals require attention" : gradeTone === "stressed" ? "Structural issues require CFO action" : "Critical exposure — urgent intervention"}`,
    narrative: `For ${periodLabel}, the receivables portfolio shows ${health.score >= 65 ? "healthy" : health.score >= 50 ? "manageable" : "elevated"} stress. DSO sits at ${dso.toFixed(1)} days against a best-possible benchmark of ${leakage.bestPossibleDSO.toFixed(1)} days (terms-implied). Collection effectiveness is ${cei.toFixed(0)}% and ${overduePct.toFixed(0)}% of open AR is overdue. ${prevSlice ? `Quarter-on-quarter, DSO moved by ${dsoDelta >= 0 ? "+" : ""}${dsoDelta.toFixed(1)} days, overdue ratio by ${overdueDelta >= 0 ? "+" : ""}${overdueDelta.toFixed(1)} pts, and the health score by ${healthDelta >= 0 ? "+" : ""}${healthDelta} pts.` : ""}`,
    metrics: [
      { label: "Health Score", value: `${health.score}/100`, color: health.score >= 65 ? "text-accent-green" : health.score >= 50 ? "text-accent-amber" : "text-accent-red" },
      { label: "DSO", value: `${dso.toFixed(1)} days`, color: dso < 45 ? "text-accent-green" : dso < 75 ? "text-accent-amber" : "text-accent-red" },
      { label: "CEI", value: `${cei.toFixed(0)}%`, color: cei >= 85 ? "text-accent-green" : cei >= 70 ? "text-accent-amber" : "text-accent-red" },
      { label: "Cash Trapped", value: fmtMillions(sum.totalOpenAR), color: "text-accent-red" },
    ],
    keyObservations: [
      `${overduePct.toFixed(0)}% of open AR (${fmtMillions(sum.overdueAR)}) is past due across ${sum.overdueInvoices.toLocaleString("en-IN")} invoices.`,
      `Collection effectiveness (${cei.toFixed(0)}%) reflects how well receivables convert to cash when actively chased.`,
      `Weighted-average payment terms are ${drag.weightedAvgTerms.toFixed(0)} days; actual pay-days clock ${drag.avgActualPayDays.toFixed(0)}, giving a behavioural drag of ${drag.drag >= 0 ? "+" : ""}${drag.drag.toFixed(0)} days.`,
      `Top-5 concentration drives ${(100 - health.components.Concentration / 2).toFixed(0)}% of open AR — concentration risk is ${health.components.Concentration > 60 ? "controlled" : "elevated"}.`,
    ],
    risksAndOpportunities: [
      ...(overduePct > 40 ? [{ type: "risk" as const, text: `${overduePct.toFixed(0)}% overdue ratio exceeds the 30% policy threshold — escalate review of 60+ day bucket.` }] : []),
      ...(cei < 70 ? [{ type: "risk" as const, text: `CEI ${cei.toFixed(0)}% is below the 70% effectiveness threshold — collections discipline needs intervention.` }] : []),
      ...(health.score >= 65 ? [{ type: "opportunity" as const, text: `Health score in the "B" band — focus on the weakest dimension (${weakestHealthDim(health.components)}) to push into "A".` }] : [{ type: "opportunity" as const, text: `Largest improvement lever is "${weakestHealthDim(health.components)}" — even a 10-point lift moves overall grade up one letter.` }]),
      { type: "opportunity" as const, text: `Closing the ${leakage.leakageDays.toFixed(0)}-day leakage to terms releases ${fmtMillions(leakage.leakageINR)} of working capital.` },
    ],
    actions: [
      `Immediate: trigger a write-down review for invoices >60 days overdue (${aging.buckets.find(b => b.key === "60_PLUS")?.count || 0} items, ${fmtMillions(aging.buckets.find(b => b.key === "60_PLUS")?.amount || 0)}).`,
      `30-day: launch ${worstSegment?.segment ?? "STANDARD"}-segment collection blitz — currently lowest efficiency (${worstSegment?.efficiencyScore ?? 0}).`,
      `90-day: close dunning gap from ${dunGap.avgGapDays.toFixed(0)}d to ${dunGap.targetGapDays}d via automated L1 reminders.`,
    ],
  };

  // ---- Card 2: DSO Driver Analysis ----
  const driverContrib = [...adv.dsoBridge.segments].sort((a, b) => b.contribution - a.contribution);
  const worstDriver = driverContrib[0];
  const card2 = {
    id: "dso-drivers",
    title: "DSO Driver Analysis",
    iconKey: "drivers",
    severity: (worstDriver?.contribution > 5 ? "warning" : "info") as "critical" | "warning" | "info" | "positive",
    headline: `${worstDriver ? `${worstDriver.segment} drags blended DSO up by +${worstDriver.contribution.toFixed(1)} days` : "Segment mix is balanced"}`,
    narrative: `The blended ${dso.toFixed(1)}-day DSO breaks down across four segments. Best-possible DSO if everyone paid to terms would be ${leakage.bestPossibleDSO.toFixed(1)} days — leaving ${leakage.leakageDays.toFixed(1)} days of behavioural leakage worth ${fmtMillions(leakage.leakageINR)}. Process-side, the dunning gap currently runs ${dunGap.avgGapDays.toFixed(0)} days from due-date to first reminder versus a 3-day target.`,
    metrics: [
      { label: "Actual DSO", value: `${dso.toFixed(1)}d`, color: "text-accent-red" },
      { label: "Best Possible", value: `${leakage.bestPossibleDSO.toFixed(1)}d`, color: "text-accent-green" },
      { label: "Leakage", value: `${leakage.leakageDays.toFixed(1)}d`, color: "text-accent-amber" },
      { label: "Dunning Gap", value: `${dunGap.avgGapDays.toFixed(0)}d`, color: dunGap.avgGapDays > 7 ? "text-accent-red" : "text-accent-amber" },
    ],
    keyObservations: driverContrib.slice(0, 3).map(d => `${d.segment}: DSO ${d.dso.toFixed(0)}d, weight ${d.weight.toFixed(0)}%, contribution ${d.contribution >= 0 ? "+" : ""}${d.contribution.toFixed(1)}d.`),
    risksAndOpportunities: [
      ...(dunGap.drift > 5 ? [{ type: "risk" as const, text: `Dunning gap drift of ${dunGap.drift.toFixed(0)}d above target leaks ${fmtMillions(dunGap.drift * (sum.totalSales / (quarter === "All" ? 365 : 90)))} per slip.` }] : []),
      ...(drag.drag > 5 ? [{ type: "risk" as const, text: `Behavioural drag (${drag.drag.toFixed(0)}d) exceeds terms — customers consistently exceed agreed credit.` }] : []),
      { type: "opportunity" as const, text: `Closing the gap to best-possible DSO yields ~${fmtMillions(leakage.leakageINR)} cash release.` },
    ],
    actions: [
      worstDriver ? `Target ${worstDriver.segment} segment first — concentrating collection effort here yields highest DSO impact.` : `Maintain balanced segment effort.`,
      `Move dunning gap from ${dunGap.avgGapDays.toFixed(0)}d to ${dunGap.targetGapDays}d via automated cadences.`,
      `Tighten payment-terms exceptions: ${(100 - drag.weightedAvgTerms / drag.weightedAvgTerms * 100).toFixed(0)}% terms variance contributes to leakage.`,
    ],
  };

  // ---- Card 3: Risk & Anomaly Detection ----
  const card3 = {
    id: "risk-alerts",
    title: "Risk & Anomaly Detection",
    iconKey: "risk",
    severity: (pbdi.alertCount > 10 || breach > 50 ? "critical" : pbdi.alertCount > 0 ? "warning" : "info") as "critical" | "warning" | "info" | "positive",
    headline: `${pbdi.alertCount} payment-behaviour alerts · ${breach} credit-limit breaches · ${blockRate.rate.toFixed(0)}% dunning-block rate`,
    narrative: `PBDI scans paying customers across the first vs second half of ${periodLabel} for >25% deterioration. Credit-limit breach signals utilization above 100%. Dunning-block rate above ${blockRate.benchmarkHigh}% indicates excessive disputes — current ${blockRate.rate.toFixed(0)}% is ${blockRate.rate > blockRate.benchmarkHigh ? "above" : blockRate.rate < blockRate.benchmarkLow ? "below" : "inside"} the ${blockRate.benchmarkLow}–${blockRate.benchmarkHigh}% normal band.`,
    metrics: [
      { label: "PBDI Alerts", value: `${pbdi.alertCount}`, color: pbdi.alertCount > 10 ? "text-accent-red" : "text-accent-amber" },
      { label: "Credit Breaches", value: `${breach}`, color: breach > 50 ? "text-accent-red" : "text-accent-amber" },
      { label: "Block Rate", value: `${blockRate.rate.toFixed(0)}%`, color: blockRate.rate > blockRate.benchmarkHigh ? "text-accent-red" : "text-accent-amber" },
      { label: "Avg Util", value: `${adv.creditLimitUtil.avgUtilPct.toFixed(0)}%`, color: adv.creditLimitUtil.avgUtilPct > 80 ? "text-accent-amber" : "text-accent-green" },
    ],
    keyObservations: [
      pbdi.topDeteriorating[0]
        ? `Worst-deteriorating: ${pbdi.topDeteriorating[0].name} — pay-days moved from ${pbdi.topDeteriorating[0].firstHalfAvg}d to ${pbdi.topDeteriorating[0].secondHalfAvg}d (${pbdi.topDeteriorating[0].pctChange >= 0 ? "+" : ""}${pbdi.topDeteriorating[0].pctChange}%).`
        : `No customer cohort large enough to flag PBDI alerts for this slice.`,
      `${blockRate.blockedCount} of ${blockRate.totalDunning} dunning records carry a block — typically disputed invoices.`,
      `Top utilized customer pulling ${adv.creditLimitUtil.topUtilized[0]?.utilPct.toFixed(0) ?? 0}% of credit limit (${adv.creditLimitUtil.topUtilized[0]?.name ?? "—"}).`,
    ],
    risksAndOpportunities: [
      ...(blockRate.rate > blockRate.benchmarkHigh ? [{ type: "risk" as const, text: `Dunning-block rate of ${blockRate.rate.toFixed(0)}% indicates dispute backlog — review root causes (pricing, delivery, billing).` }] : []),
      ...(breach > 25 ? [{ type: "risk" as const, text: `${breach} customers exceed credit limit — assess re-rating or hold-shipment policy.` }] : []),
      { type: "opportunity" as const, text: `Resolving disputed AR (${fmtMillions(adv.disputeAdjusted.disputedAR)}) would cut DSO by ${adv.disputeAdjusted.disputeImpactDays.toFixed(1)} days.` },
    ],
    actions: [
      `Open PBDI watchlist of the ${pbdi.topDeteriorating.length} flagged accounts; assign to senior collectors.`,
      `Refresh credit ratings for ${breach} breaching customers; trigger holds where warranted.`,
      `Stand up a dispute resolution SLA — aim to clear blocks within 14 days.`,
    ],
  };

  // ---- Card 4: Aging Movement ----
  const sixtyPlus = aging.buckets.find(b => b.key === "60_PLUS");
  const notDue = aging.buckets.find(b => b.key === "NOT_DUE");
  const card4 = {
    id: "aging-movement",
    title: "Aging Movement",
    iconKey: "aging",
    severity: ((sixtyPlus?.percentage ?? 0) > 30 ? "critical" : (sixtyPlus?.percentage ?? 0) > 15 ? "warning" : "info") as "critical" | "warning" | "info" | "positive",
    headline: `60+ day bucket holds ${(sixtyPlus?.percentage ?? 0).toFixed(0)}% of open AR (${fmtMillions(sixtyPlus?.amount ?? 0)})`,
    narrative: `Aging distribution shows where receivables sit on the clock. Healthy portfolios concentrate AR in the 0–30 day band; risk concentrates as buckets age. For ${periodLabel}, ${(notDue?.percentage ?? 0).toFixed(0)}% remains not-due, while ${(sixtyPlus?.percentage ?? 0).toFixed(0)}% has aged past 60 days.`,
    metrics: aging.buckets.slice(0, 4).map(b => ({ label: b.bucket, value: `${b.percentage.toFixed(0)}%`, color: b.color })),
    keyObservations: aging.buckets.map(b => `${b.bucket}: ${b.count.toLocaleString("en-IN")} invoices · ${fmtMillions(b.amount)} (${b.percentage.toFixed(0)}%).`),
    risksAndOpportunities: [
      ...((sixtyPlus?.percentage ?? 0) > 25 ? [{ type: "risk" as const, text: `Bad-debt exposure rises sharply past 60 days — recoverability drops below 60%.` }] : []),
      ...((notDue?.percentage ?? 0) < 30 ? [{ type: "risk" as const, text: `Only ${(notDue?.percentage ?? 0).toFixed(0)}% of AR is not-due — pipeline of recent issuance is thin.` }] : []),
      { type: "opportunity" as const, text: `Aggressive collection on 31–60 day buckets prevents migration into 60+ where recovery is hardest.` },
    ],
    actions: [
      `Run a 14-day blitz on the 31–60 day cohort to prevent migration to 60+.`,
      `For 60+ invoices, decide write-down vs intensified legal follow-up by customer.`,
      `Track aging-bucket weekly to detect early build-up of stuck AR.`,
    ],
  };

  // ---- Card 5: Collections Efficiency ----
  const monthsAboveTarget = coll.collectionEffectiveness.monthly.filter(w => w.value >= 70).length;
  const card5 = {
    id: "collections-deep-dive",
    title: "Collections Efficiency",
    iconKey: "collections",
    severity: (cei >= 85 ? "positive" : cei >= 70 ? "info" : "warning") as "critical" | "warning" | "info" | "positive",
    headline: `CEI ${cei.toFixed(0)}% · ${monthsAboveTarget}/${coll.collectionEffectiveness.monthly.length || 1} months above 70% effectiveness target`,
    narrative: `CEI measures how well opened AR converts to cash. ${cei >= 85 ? "Above 85% indicates strong execution." : cei >= 70 ? "Between 70–85% is industry-typical." : "Below 70% signals the team is reactive rather than systematic."} On-time payment rate trends monthly — high on-time rates with low effectiveness suggest large invoices slip while small ones clear.`,
    metrics: [
      { label: "CEI", value: `${cei.toFixed(0)}%`, color: cei >= 85 ? "text-accent-green" : cei >= 70 ? "text-accent-amber" : "text-accent-red" },
      { label: "On-Time Rate", value: `${avgOf(coll.onTimePayment.monthly).toFixed(0)}%`, color: "text-accent-blue" },
      { label: "Months ≥ Target", value: `${monthsAboveTarget}/${coll.collectionEffectiveness.monthly.length}`, color: monthsAboveTarget >= coll.collectionEffectiveness.monthly.length / 2 ? "text-accent-green" : "text-accent-amber" },
      { label: "Backlog Days", value: `${avgOf(slice.operational.daysToClearBacklog.monthly).toFixed(0)}d`, color: "text-accent-amber" },
    ],
    keyObservations: [
      `Average monthly on-time payment rate: ${avgOf(coll.onTimePayment.monthly).toFixed(0)}%.`,
      `Average monthly collection effectiveness: ${avgOf(coll.collectionEffectiveness.monthly).toFixed(0)}%.`,
      `Credit-period effectiveness varies by term: ${coll.creditPeriodEffectiveness.data.map(d => `${d.creditPeriod} ${d.value.toFixed(0)}%`).join(" · ")}.`,
    ],
    risksAndOpportunities: [
      ...(cei < 70 ? [{ type: "risk" as const, text: `CEI below 70% — team is converting less than three-fourths of what's due.` }] : []),
      ...(monthsAboveTarget < coll.collectionEffectiveness.monthly.length / 3 ? [{ type: "risk" as const, text: `Sustained underperformance across most months — staffing or process review needed.` }] : []),
      { type: "opportunity" as const, text: `Lifting CEI by 5 points releases ~${fmtMillions(sum.totalOpenAR * 0.05)} of stuck AR.` },
    ],
    actions: [
      `Set monthly CEI floor at 75% with weekly progress reviews when missing.`,
      `Pre-call top 20 AR customers 5 days before due-date (the dunning gap).`,
      `Match collector seniority to invoice value — large invoices need senior handlers.`,
    ],
  };

  // ---- Card 6: Cash Flow Forecast ----
  const card6 = {
    id: "cash-forecast",
    title: "Cash Flow Forecast",
    iconKey: "forecast",
    severity: (mape.mape > 30 ? "warning" : mape.mape > 15 ? "info" : "positive") as "critical" | "warning" | "info" | "positive",
    headline: `Forecast confidence ${mape.confidence}% (MAPE ${mape.mape.toFixed(0)}%) · ${fmtMillions(mape.expectedInflow)} expected vs ${fmtMillions(mape.actualInflow)} actual`,
    narrative: `Forecast accuracy uses Mean Absolute Percentage Error across the weekly cashflow plan. MAPE under 15% is strong, 15–30% acceptable, above 30% indicates forecasts cannot be trusted for treasury decisions. Cash conversion = collected / billed = ${adv.cashConversion.ratio.toFixed(0)}%.`,
    metrics: [
      { label: "Confidence", value: `${mape.confidence}%`, color: mape.confidence >= 70 ? "text-accent-green" : mape.confidence >= 50 ? "text-accent-amber" : "text-accent-red" },
      { label: "MAPE", value: `${mape.mape.toFixed(0)}%`, color: mape.mape < 15 ? "text-accent-green" : mape.mape < 30 ? "text-accent-amber" : "text-accent-red" },
      { label: "Cash Conv.", value: `${adv.cashConversion.ratio.toFixed(0)}%`, color: "text-accent-blue" },
      { label: "Variance", value: fmtMillions(mape.expectedInflow - mape.actualInflow), color: "text-accent-amber" },
    ],
    keyObservations: [
      `Expected weekly inflow over the slice: ${fmtMillions(mape.expectedInflow)}; actual: ${fmtMillions(mape.actualInflow)}.`,
      `Cash conversion ratio: ${adv.cashConversion.ratio.toFixed(0)}% — collected vs billed in the same period.`,
      mape.mape > 30 ? `Forecast error is high — pipeline of unexpected slips or large discrete events distorts predictions.` : `Forecast error within tolerance — base for treasury planning.`,
    ],
    risksAndOpportunities: [
      ...(mape.mape > 25 ? [{ type: "risk" as const, text: `High MAPE undermines treasury liquidity planning — investigate forecast model inputs.` }] : []),
      ...(adv.cashConversion.ratio < 70 ? [{ type: "risk" as const, text: `Cash conversion below 70% indicates AR build-up faster than collection.` }] : []),
      { type: "opportunity" as const, text: `Tightening forecast to ≤15% MAPE allows aggressive parking of surplus cash in short-tenor instruments.` },
    ],
    actions: [
      `Recalibrate forecasting model with the last 13 weeks of actuals.`,
      `Stratify forecasts by customer segment — STRATEGIC accounts should be near-deterministic.`,
      `Build a rolling 13-week cash forecast feeding weekly treasury committee.`,
    ],
  };

  // ---- Card 7: Working Capital Opportunities ----
  const opp1 = Math.round(leakage.leakageINR * 0.35);
  const opp2 = Math.round(sum.totalOpenAR * 0.05);
  const opp3 = adv.discountCapture.leftOnTable;
  const opp4 = Math.round(adv.disputeAdjusted.disputedAR * 0.5);
  const opp5 = Math.round(adv.postingLag.avgDays * (sum.totalSales / (quarter === "All" ? 365 : 90)));
  const total = opp1 + opp2 + opp3 + opp4 + opp5;
  const card7 = {
    id: "working-capital",
    title: "Working Capital Opportunities",
    iconKey: "working-capital",
    severity: "info" as "critical" | "warning" | "info" | "positive",
    headline: `${fmtMillions(total)} of working capital releasable · ${fmtMillions(carry.dailyCost)}/day carrying cost`,
    narrative: `Each day of DSO costs roughly ${fmtMillions(carry.dailyCost)} at a 10% cost-of-capital assumption. The largest unlocks come from (a) closing the dunning gap, (b) accelerating slow-segment collections, (c) capturing offered early-payment discounts, (d) resolving disputed AR, and (e) compressing the posting lag.`,
    metrics: [
      { label: "Daily Cost", value: fmtMillions(carry.dailyCost), color: "text-accent-amber" },
      { label: "Annualised", value: fmtMillions(carry.annualCost), color: "text-accent-red" },
      { label: "Avg Days Out", value: `${carry.avgDaysOutstanding}d`, color: "text-accent-blue" },
      { label: "Total Unlock", value: fmtMillions(total), color: "text-accent-green" },
    ],
    keyObservations: [
      `Close dunning gap (${dunGap.avgGapDays.toFixed(0)}→${dunGap.targetGapDays}d): unlock ~${fmtMillions(opp1)}.`,
      `Collection blitz on slowest segment (${worstSegment?.segment ?? "STANDARD"}): unlock ~${fmtMillions(opp2)}.`,
      `Capture early-payment discounts left on table: ${fmtMillions(opp3)}.`,
      `Resolve disputed AR (${fmtMillions(adv.disputeAdjusted.disputedAR)}): unlock ~${fmtMillions(opp4)}.`,
      `Compress posting lag (${adv.postingLag.avgDays.toFixed(1)}→0–1d): unlock ~${fmtMillions(opp5)}.`,
    ],
    risksAndOpportunities: [
      { type: "opportunity" as const, text: `${fmtMillions(total)} total unlock represents ${((total / Math.max(1, sum.totalOpenAR)) * 100).toFixed(0)}% of current open AR.` },
      { type: "opportunity" as const, text: `Annualised carrying cost saving from a 10-day DSO reduction: ~${fmtMillions((sum.totalSales / (quarter === "All" ? 365 : 90)) * 10 * 0.10 * (carry.avgDaysOutstanding / 365))}.` },
    ],
    actions: [
      `Stand up a Working-Capital War Room with weekly KPI review.`,
      `Sequence initiatives by impact-vs-effort: posting lag is highest-ease, dispute resolution highest-impact.`,
      `Set quarterly working-capital release targets per business head.`,
    ],
  };

  // ---- Card 8: Internal Benchmarking ----
  const card8 = {
    id: "benchmarking",
    title: "Internal Benchmarking",
    iconKey: "benchmark",
    severity: "info" as "critical" | "warning" | "info" | "positive",
    headline: bestSegment && worstSegment ? `${bestSegment.segment} is ${(bestSegment.efficiencyScore / Math.max(1, worstSegment.efficiencyScore)).toFixed(1)}× more efficient than ${worstSegment.segment}` : "Segment benchmarks computed",
    narrative: `Comparing segment efficiency scores normalises DSO, collection rate, and overdue ratio onto one axis. ${bestSegment?.segment ?? "Top"} segment runs at ${bestSegment?.efficiencyScore ?? 0} while ${worstSegment?.segment ?? "weakest"} segment is at ${worstSegment?.efficiencyScore ?? 0}. Company-code split additionally reveals where AR concentration sits.`,
    metrics: segEff.map(s => ({ label: s.segment, value: `${s.efficiencyScore}`, color: s.efficiencyScore >= 200 ? "text-accent-green" : s.efficiencyScore >= 100 ? "text-accent-amber" : "text-accent-red" })),
    keyObservations: [
      ...segEff.map(s => `${s.segment}: DSO ${s.dso.toFixed(0)}d · collection rate ${s.collectionRate.toFixed(0)}% · overdue ${s.overdueRatio.toFixed(0)}%.`),
      ...adv.companyCodePerformance.map(c => `Company ${c.code} (${c.name}): DSO ${c.dso.toFixed(0)}d · overdue ${c.overdueRatio.toFixed(0)}% · open AR ${fmtMillions(c.openAR)}.`),
    ],
    risksAndOpportunities: [
      ...(worstSegment && worstSegment.efficiencyScore < 100 ? [{ type: "risk" as const, text: `${worstSegment.segment} efficiency below 100 indicates systemic weakness — review pricing terms, account assignment, and collection scripts.` }] : []),
      ...(bestSegment ? [{ type: "opportunity" as const, text: `Replicate ${bestSegment.segment} playbook (cadence, contact mapping) onto lower-performing segments.` }] : []),
    ],
    actions: [
      `Cross-pollinate best practices: pair top and bottom segment owners for 30-day swap.`,
      `Audit credit terms by segment — relax for top performers, tighten for laggards.`,
      `Publish a monthly segment scorecard to senior leadership.`,
    ],
  };

  // Health radar data
  const healthRadar = [
    { dim: "DSO", value: health.components.DSO },
    { dim: "CEI", value: health.components.CEI },
    { dim: "Overdue", value: health.components.Overdue },
    { dim: "Aging", value: health.components.Aging },
    { dim: "Concentration", value: health.components.Concentration },
    { dim: "Trend", value: health.components.Trend },
  ];

  const segmentEfficiencyChart = segEff.map(s => ({ name: s.segment, score: s.efficiencyScore, dso: s.dso }));
  const opportunityWaterfall = [
    { name: "Dunning Gap", value: opp1 },
    { name: "Slow Segment", value: opp2 },
    { name: "Discount Capture", value: opp3 },
    { name: "Dispute Resolution", value: opp4 },
    { name: "Posting Lag", value: opp5 },
  ];

  return {
    healthGauge: { score: health.score, grade: health.grade },
    healthRadar,
    segmentEfficiencyChart,
    opportunityWaterfall,
    cards: [card1, card2, card3, card4, card5, card6, card7, card8],
  };
}

function weakestHealthDim(c: { [k: string]: number }): string {
  const entries = Object.entries(c).sort((a, b) => a[1] - b[1]);
  return entries[0]?.[0] ?? "DSO";
}

function avgOf(arr: { value: number }[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x.value, 0) / arr.length;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  type Result = Record<number, Record<Quarter, Slice & {
    aiInsights: ReturnType<typeof computeAIInsightsFromData>;
    insights: Record<string, KpiInsight>;
  }>>;
  const result: Result = {} as Result;

  for (const fy of FYS) {
    console.log(`\n=== FY ${fy} ===`);
    result[fy] = {} as Result[number];
    for (const q of QUARTERS) {
      console.log(`  Computing ${q}...`);
      const slice = await computeForFYQuarter(fy, q);
      result[fy][q] = { ...slice, aiInsights: undefined as any, insights: {} };
    }
    // Second pass to attach AI insights + per-KPI insights with prev-quarter context.
    const orderedQs: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "All"];
    for (let i = 0; i < orderedQs.length; i++) {
      const q = orderedQs[i];
      const prevQ = i > 0 && q !== "All" ? orderedQs[i - 1] : undefined;
      const prevSlice = prevQ ? result[fy][prevQ] : undefined;
      result[fy][q].aiInsights = computeAIInsightsFromData(result[fy][q], fy, q, prevSlice);
      result[fy][q].insights = computePerKpiInsights(result[fy][q], fy, q, prevSlice);
    }
  }

  const tsContent = `// ============================================================
// PRE-COMPUTED KPI DATA — Generated from the local SQLite DB
// Auto-generated by prisma/compute-dashboard-data.ts
// DO NOT EDIT MANUALLY — re-run the compute script to update.
// Source: 100% local DB. No external/AI APIs.
// ============================================================

export type FYKey = 2024 | 2025 | 2026;
export type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4" | "All";

export interface AgingBucket {
  bucket: string; key: string; count: number; amount: number; percentage: number; color: string;
}
export interface MonthlyPoint { month: string; value: number; }
export interface WeeklyPoint { week: string; value: number; }
export interface WaterfallPoint { month: string; value: number; label: string; }
export interface DSOBridgeSegment { segment: string; dso: number; weight: number; contribution: number; }
export interface HealthScoreComponents { DSO: number; CEI: number; Overdue: number; Aging: number; Concentration: number; Trend: number; }
export interface CompanyCodePerf { code: string; name: string; dso: number; overdueRatio: number; openAR: number; invoiceCount: number; }
export interface SegmentEfficiencyRow { segment: string; dso: number; collectionRate: number; overdueRatio: number; efficiencyScore: number; }
export interface PBDIRow { customerId: string; name: string; firstHalfAvg: number; secondHalfAvg: number; delta: number; pctChange: number; }
export interface CreditUtilRow { name: string; segment: string; openAR: number; limit: number; utilPct: number; }

export interface AdvancedKPIs {
  dsoBridge: { blendedDSO: number; segments: DSOBridgeSegment[] };
  arHealthScore: { score: number; grade: string; components: HealthScoreComponents };
  termsMixDrag: { weightedAvgTerms: number; avgActualPayDays: number; drag: number };
  carryingCost: { dailyCost: number; monthlyCost: number; annualCost: number; avgDaysOutstanding: number };
  cashFlowLeakage: { bestPossibleDSO: number; actualDSO: number; leakageDays: number; leakageINR: number };
  companyCodePerformance: CompanyCodePerf[];
  segmentEfficiency: SegmentEfficiencyRow[];
  dsoVelocity: { monthly: { month: string; change: number }[]; avgChange: number };
  pbdi: { alertCount: number; topDeteriorating: PBDIRow[] };
  creditLimitUtil: { avgUtilPct: number; breachCount: number; topUtilized: CreditUtilRow[] };
  paymentConsistency: { score: number; avgCV: number; sampleSize: number };
  discountCapture: { eligibleAmount: number; capturedAmount: number; captureRate: number; capturedSavings: number; leftOnTable: number };
  postingLag: { avgDays: number; p90: number; buckets: { days: number; count: number }[] };
  dunningGap: { avgGapDays: number; targetGapDays: number; drift: number };
  dunningBlockRate: { rate: number; blockedCount: number; totalDunning: number; benchmarkLow: number; benchmarkHigh: number };
  disputeAdjusted: { actualDSO: number; cleanDSO: number; disputeImpactDays: number; disputedAR: number };
  touchesPerCrore: { touches: number; crores: number; rate: number };
  escalationVelocity: { avgDaysBetweenLevels: number; targetDays: number; sampleSize: number };
  forecastMape: { mape: number; confidence: number; expectedInflow: number; actualInflow: number };
  cashConversion: { ratio: number; sales: number; collected: number };
}

export interface AIInsightCard {
  id: string;
  title: string;
  iconKey: string;
  severity: "critical" | "warning" | "info" | "positive";
  headline: string;
  narrative: string;
  metrics: { label: string; value: string; color?: string }[];
  keyObservations: string[];
  risksAndOpportunities: { type: "risk" | "opportunity"; text: string }[];
  actions: string[];
}

export interface AIInsightsData {
  healthGauge: { score: number; grade: string };
  healthRadar: { dim: string; value: number }[];
  segmentEfficiencyChart: { name: string; score: number; dso: number }[];
  opportunityWaterfall: { name: string; value: number }[];
  cards: AIInsightCard[];
}

export interface KpiInsight {
  observation: string;
  recommendation: string;
  nextAction: string;
}

export interface QuarterData {
  summary: {
    totalInvoices: number; openInvoices: number; clearedInvoices: number; overdueInvoices: number;
    totalOpenAR: number; overdueAR: number; currentAR: number; totalSales: number;
  };
  executive: {
    dso: { overall: number; monthly: MonthlyPoint[] };
    overdueRatio: { overall: number; monthly: MonthlyPoint[] };
    revenueAtRisk: { value: number };
    receivablesTurnover: { overall: number; monthly: MonthlyPoint[] };
    netARMovement: { monthly: WaterfallPoint[] };
  };
  collection: {
    cei: { overall: number; monthly: MonthlyPoint[] };
    onTimePayment: { monthly: MonthlyPoint[] };
    collectionEffectiveness: { monthly: MonthlyPoint[] };
    creditPeriodEffectiveness: { data: { creditPeriod: string; value: number }[] };
  };
  aging: {
    buckets: AgingBucket[];
    overdueDensity: { count: number; value: number };
    peakExposure: { amount: number; invoiceNo: string; companyCode: string; daysOverdue: number };
  };
  operational: {
    invoiceToCash: { p50: number; p90: number };
    creditPeriodUtilization: { overall: number; monthly: MonthlyPoint[] };
    daysToClearBacklog: { monthly: MonthlyPoint[] };
  };
  advanced: AdvancedKPIs;
  aiInsights: AIInsightsData;
  insights: Record<string, KpiInsight>;
}

export const COMPUTED_KPI_DATA: Record<FYKey, Record<QuarterKey, QuarterData>> = ${JSON.stringify(result, null, 2)} as any;

export const EMPTY_QUARTER_DATA: QuarterData = COMPUTED_KPI_DATA[2026]["All"];
`;

  writeFileSync(resolve("src/lib/computed-kpis.ts"), tsContent);
  console.log("\n✅ Written to src/lib/computed-kpis.ts");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
