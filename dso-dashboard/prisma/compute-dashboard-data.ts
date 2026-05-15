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
  const periodDays = quarter === "All" ? 365 : 90;
  const dso = totalSalesAll > 0 ? (totalOpenAR / totalSalesAll) * periodDays : 0;

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

  const dsoMonthly = monthlySnapshots.map(ms => ({
    month: ms.label,
    value: parseFloat((ms.totalCreditSales > 0 ? (ms.totalAR / ms.totalCreditSales) * 30 : 0).toFixed(1)),
  }));
  const dsoOverall = parseFloat(dso.toFixed(1));

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
    orderBy: { weekStartDate: "asc" },
  });
  type WeekAgg = { label: string; onTime: number[]; eff: number[]; overdueBalance: number; collectionRate: number; dueAmt: number; collAmt: number; weekStart: Date; };
  const weekMap = new Map<number, WeekAgg>();
  for (const wc of weeklyCashflows) {
    const existing = weekMap.get(wc.weekNumber);
    if (!existing) {
      weekMap.set(wc.weekNumber, {
        label: wc.weekLabel,
        onTime: wc.onTimePaymentRate != null ? [wc.onTimePaymentRate] : [],
        eff: wc.collectionEffectiveness != null ? [wc.collectionEffectiveness] : [],
        overdueBalance: wc.overdueBalance,
        collectionRate: wc.collectionRate || 0,
        dueAmt: wc.invoicesDueAmount,
        collAmt: wc.invoicesCollectedAmount,
        weekStart: wc.weekStartDate,
      });
    } else {
      if (wc.onTimePaymentRate != null) existing.onTime.push(wc.onTimePaymentRate);
      if (wc.collectionEffectiveness != null) existing.eff.push(wc.collectionEffectiveness);
      existing.overdueBalance += wc.overdueBalance;
      existing.collectionRate += wc.collectionRate || 0;
      existing.dueAmt += wc.invoicesDueAmount;
      existing.collAmt += wc.invoicesCollectedAmount;
    }
  }
  const weekKeys = [...weekMap.keys()].sort((a, b) => {
    const wa = weekMap.get(a)!.weekStart.getTime();
    const wb = weekMap.get(b)!.weekStart.getTime();
    return wa - wb;
  });
  const onTimeWeekly = weekKeys.map(w => {
    const d = weekMap.get(w)!;
    const avg = d.onTime.length > 0 ? d.onTime.reduce((a, b) => a + b, 0) / d.onTime.length : 0;
    return { week: d.label, value: Math.round(avg) };
  });
  const collEffWeekly = weekKeys.map(w => {
    const d = weekMap.get(w)!;
    const avg = d.eff.length > 0 ? d.eff.reduce((a, b) => a + b, 0) / d.eff.length : 0;
    return { week: d.label, value: Math.round(avg) };
  });

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

  const backlogWeekly = weekKeys.map(w => {
    const d = weekMap.get(w)!;
    const avgDailyCollection = d.collAmt / 7;
    const backlog = avgDailyCollection > 0 ? d.overdueBalance / avgDailyCollection : 0;
    const val = Math.min(backlog, 999);
    return { week: d.label, value: parseFloat(val.toFixed(1)) };
  });

  // ---- Advanced: DSO Bridge ----
  const blendedDSO = dso;
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"] as const;
  const dsoBridgeSegments = segments.map(seg => {
    const segInvs = allInvoices.filter(i => i.customer.segment === seg);
    const segOpen = segInvs.filter(i => i.status === "OPEN" || i.status === "PARTIAL");
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
    const segDSO = segSales > 0 ? (segOpenAR / segSales) * periodDays : 0;
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
  const dsoHealthScore = Math.max(0, Math.min(100, 100 - (blendedDSO - 20) / (60 - 20) * 100));
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
  const bestPossibleDSO = weightedAvgTerms;
  const dailySales = totalSalesAll > 0 ? totalSalesAll / periodDays : 0;
  const leakageDays = blendedDSO - bestPossibleDSO;
  const leakageINR = leakageDays * dailySales;
  const cashFlowLeakage = {
    bestPossibleDSO: parseFloat(bestPossibleDSO.toFixed(1)),
    actualDSO: parseFloat(blendedDSO.toFixed(1)),
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
  const blockedInvoiceIds = new Set(dunningRecords.filter(d => d.dunningBlock != null).map(d => d.invoiceId));
  const cleanOpenAR = openInvoices.filter(i => !blockedInvoiceIds.has(i.id)).reduce((s, i) => s + i.amount, 0);
  const cleanDSO = totalSalesAll > 0 ? (cleanOpenAR / totalSalesAll) * periodDays : 0;
  const disputeAdjusted = {
    actualDSO: parseFloat(blendedDSO.toFixed(1)),
    cleanDSO: parseFloat(cleanDSO.toFixed(1)),
    disputeImpactDays: parseFloat((blendedDSO - cleanDSO).toFixed(1)),
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
      onTimePayment: { weekly: onTimeWeekly },
      collectionEffectiveness: { weekly: collEffWeekly },
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
      daysToClearBacklog: { weekly: backlogWeekly },
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
  const weeksAboveTarget = coll.collectionEffectiveness.weekly.filter(w => w.value >= 70).length;
  const card5 = {
    id: "collections-deep-dive",
    title: "Collections Efficiency",
    iconKey: "collections",
    severity: (cei >= 85 ? "positive" : cei >= 70 ? "info" : "warning") as "critical" | "warning" | "info" | "positive",
    headline: `CEI ${cei.toFixed(0)}% · ${weeksAboveTarget}/${coll.collectionEffectiveness.weekly.length || 1} weeks above 70% effectiveness target`,
    narrative: `CEI measures how well opened AR converts to cash. ${cei >= 85 ? "Above 85% indicates strong execution." : cei >= 70 ? "Between 70–85% is industry-typical." : "Below 70% signals the team is reactive rather than systematic."} On-time payment rate trends weekly — high on-time rates with low effectiveness suggest large invoices slip while small ones clear.`,
    metrics: [
      { label: "CEI", value: `${cei.toFixed(0)}%`, color: cei >= 85 ? "text-accent-green" : cei >= 70 ? "text-accent-amber" : "text-accent-red" },
      { label: "On-Time Rate", value: `${avgOf(coll.onTimePayment.weekly).toFixed(0)}%`, color: "text-accent-blue" },
      { label: "Weeks ≥ Target", value: `${weeksAboveTarget}/${coll.collectionEffectiveness.weekly.length}`, color: weeksAboveTarget >= coll.collectionEffectiveness.weekly.length / 2 ? "text-accent-green" : "text-accent-amber" },
      { label: "Backlog Days", value: `${avgOf(slice.operational.daysToClearBacklog.weekly).toFixed(0)}d`, color: "text-accent-amber" },
    ],
    keyObservations: [
      `Average weekly on-time payment rate: ${avgOf(coll.onTimePayment.weekly).toFixed(0)}%.`,
      `Average weekly collection effectiveness: ${avgOf(coll.collectionEffectiveness.weekly).toFixed(0)}%.`,
      `Credit-period effectiveness varies by term: ${coll.creditPeriodEffectiveness.data.map(d => `${d.creditPeriod} ${d.value.toFixed(0)}%`).join(" · ")}.`,
    ],
    risksAndOpportunities: [
      ...(cei < 70 ? [{ type: "risk" as const, text: `CEI below 70% — team is converting less than three-fourths of what's due.` }] : []),
      ...(weeksAboveTarget < coll.collectionEffectiveness.weekly.length / 3 ? [{ type: "risk" as const, text: `Sustained underperformance across most weeks — staffing or process review needed.` }] : []),
      { type: "opportunity" as const, text: `Lifting CEI by 5 points releases ~${fmtMillions(sum.totalOpenAR * 0.05)} of stuck AR.` },
    ],
    actions: [
      `Set weekly CEI floor at 75% with daily standups when missing.`,
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
  type Result = Record<number, Record<Quarter, Slice & { aiInsights: ReturnType<typeof computeAIInsightsFromData> }>>;
  const result: Result = {} as Result;

  for (const fy of FYS) {
    console.log(`\n=== FY ${fy} ===`);
    result[fy] = {} as Result[number];
    for (const q of QUARTERS) {
      console.log(`  Computing ${q}...`);
      const slice = await computeForFYQuarter(fy, q);
      result[fy][q] = { ...slice, aiInsights: undefined as any };
    }
    // Second pass to attach AI insights with prev-quarter context.
    const orderedQs: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "All"];
    for (let i = 0; i < orderedQs.length; i++) {
      const q = orderedQs[i];
      const prevQ = i > 0 && q !== "All" ? orderedQs[i - 1] : undefined;
      const prevSlice = prevQ ? result[fy][prevQ] : undefined;
      result[fy][q].aiInsights = computeAIInsightsFromData(result[fy][q], fy, q, prevSlice);
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
    onTimePayment: { weekly: WeeklyPoint[] };
    collectionEffectiveness: { weekly: WeeklyPoint[] };
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
    daysToClearBacklog: { weekly: WeeklyPoint[] };
  };
  advanced: AdvancedKPIs;
  aiInsights: AIInsightsData;
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
