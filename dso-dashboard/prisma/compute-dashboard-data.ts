import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "path";
import { writeFileSync } from "fs";

const adapter = new PrismaLibSql({ url: `file:${resolve("prisma/dev.db")}` });
const prisma = new PrismaClient({ adapter });

type Quarter = "Q1" | "Q2" | "Q3" | "Q4" | "All";

// Quarter → fiscal periods mapping (Indian FY: Apr=P1, Mar=P12)
// Q1: Apr-Jun (P1-P3), Q2: Jul-Sep (P4-P6), Q3: Oct-Dec (P7-P9), Q4: Jan-Mar (P10-P12)
const QUARTER_PERIODS: Record<Quarter, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
  All: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

async function computeForQuarter(quarter: Quarter) {
  console.log(`\n=== Computing for ${quarter} ===`);

  // Get fiscal period IDs for this quarter
  const fiscalPeriods = await prisma.fiscalPeriod.findMany({
    where: quarter === "All" ? {} : { fiscalPeriod: { in: QUARTER_PERIODS[quarter] } },
    orderBy: { fiscalPeriod: "asc" },
  });
  const fpIds = fiscalPeriods.map((fp) => fp.id);
  const fpLabels = fiscalPeriods.map((fp) => fp.periodLabel);
  console.log(`  Periods: ${fpLabels.join(", ")}`);

  // Get all invoices for these periods (include customer for segment data)
  const allInvoices = await prisma.invoice.findMany({
    where: { fiscalPeriodId: { in: fpIds } },
    include: { customer: true },
  });

  // Get all company codes for company code performance
  const companyCodes = await prisma.companyCode.findMany();
  const openInvoices = allInvoices.filter((i) => i.status === "OPEN" || i.status === "PARTIAL");
  const clearedInvoices = allInvoices.filter((i) => i.status === "CLEARED");
  const overdueInvs = openInvoices.filter((i) => i.isOverdue);

  const totalOpenAR = openInvoices.reduce((s, i) => s + i.amount, 0);
  const overdueAR = overdueInvs.reduce((s, i) => s + i.amount, 0);
  const currentAR = totalOpenAR - overdueAR;
  const totalSalesAll = allInvoices.reduce((s, i) => s + i.amount, 0);

  console.log(`  Invoices: ${allInvoices.length} total, ${openInvoices.length} open, ${overdueInvs.length} overdue`);

  // ========== EXECUTIVE KPIs ==========

  // 1. DSO — use period-adjusted days (90 for quarter, 365 for full year)
  const periodDays = quarter === "All" ? 365 : 90;
  const dso = totalSalesAll > 0 ? (totalOpenAR / totalSalesAll) * periodDays : 0;

  // DSO monthly breakdown — aggregate across company codes per fiscal period
  const rawSnapshots = await prisma.monthlySnapshot.findMany({
    where: { fiscalPeriodId: { in: fpIds } },
    include: { fiscalPeriod: true },
    orderBy: { fiscalPeriodId: "asc" },
  });
  // Aggregate snapshots by fiscal period
  const snapshotByPeriod = new Map<string, {
    label: string;
    totalAR: number; currentAR: number; overdueAR: number; beginningAR: number;
    totalCreditSales: number; totalCollections: number;
    invoiceCountTotal: number; invoiceCountOverdue: number; invoiceCountCleared: number;
    count: number;
    dsoSum: number; overdueRatioSum: number; ceiSum: number; turnoverSum: number; cpuSum: number;
  }>();
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
  const monthlySnapshots = [...snapshotByPeriod.values()];
  // Compute per-period DSO from aggregated figures: (totalAR / totalCreditSales) * days-in-period
  const dsoMonthly = monthlySnapshots.map((ms) => ({
    month: ms.label,
    value: parseFloat((ms.totalCreditSales > 0 ? (ms.totalAR / ms.totalCreditSales) * 30 : 0).toFixed(1)),
  }));
  const dsoOverall = parseFloat(dso.toFixed(1));

  // 2. Overdue Ratio
  const overdueRatio = totalOpenAR > 0 ? (overdueAR / totalOpenAR) * 100 : 0;
  const overdueRatioMonthly = monthlySnapshots.map((ms) => ({
    month: ms.label,
    value: parseFloat((ms.totalAR > 0 ? (ms.overdueAR / ms.totalAR) * 100 : 0).toFixed(1)),
  }));

  // 3. Revenue at Risk (45-60 day credit period overdue invoices)
  const riskInvoices = overdueInvs.filter((i) => i.creditPeriodDays >= 45);
  const riskAR = riskInvoices.reduce((s, i) => s + i.amount, 0);
  const revenueAtRisk = totalOpenAR > 0 ? (riskAR / totalOpenAR) * 100 : 0;

  // 4. Receivables Turnover
  const totalCreditSalesSum = monthlySnapshots.reduce((s, ms) => s + ms.totalCreditSales, 0);
  const avgAR = monthlySnapshots.length > 0
    ? (monthlySnapshots[0].beginningAR + monthlySnapshots[monthlySnapshots.length - 1].totalAR) / 2
    : totalOpenAR || 1;
  const turnover = avgAR > 0 ? totalCreditSalesSum / avgAR : 0;
  const turnoverMonthly = monthlySnapshots.map((ms) => ({
    month: ms.label,
    value: parseFloat((ms.turnoverSum / ms.count).toFixed(1)),
  }));

  // 5. Net AR Movement (monthly waterfall)
  const netARMonthly = monthlySnapshots.map((ms) => ({
    month: ms.label,
    value: Math.round(ms.totalAR - ms.beginningAR),
    label: ms.label,
  }));

  // ========== COLLECTION EFFICIENCY ==========

  // 6. CEI — weighted average across company codes
  const ceiMonthly = monthlySnapshots.map((ms) => ({
    month: ms.label,
    value: parseFloat((ms.ceiSum / ms.count).toFixed(1)),
  }));
  const ceiOverall = ceiMonthly.length > 0
    ? parseFloat((ceiMonthly.reduce((s, c) => s + c.value, 0) / ceiMonthly.length).toFixed(1))
    : 0;

  // 7. On-Time Payment Rate (weekly)
  const weeklyCashflows = await prisma.weeklyCashflow.findMany({
    where: { fiscalPeriodId: { in: fpIds } },
    orderBy: { weekNumber: "asc" },
  });
  // Aggregate by week across company codes
  const weekMap = new Map<number, { label: string; onTime: number[]; eff: number[]; overdueBalance: number; collectionRate: number; dueAmt: number; collAmt: number }>();
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
  const weekNumbers = [...weekMap.keys()].sort((a, b) => a - b);
  const onTimeWeekly = weekNumbers.map((w) => {
    const d = weekMap.get(w)!;
    const avg = d.onTime.length > 0 ? d.onTime.reduce((a, b) => a + b, 0) / d.onTime.length : 0;
    return { week: d.label, value: Math.round(avg) };
  });
  const collEffWeekly = weekNumbers.map((w) => {
    const d = weekMap.get(w)!;
    const avg = d.eff.length > 0 ? d.eff.reduce((a, b) => a + b, 0) / d.eff.length : 0;
    return { week: d.label, value: Math.round(avg) };
  });

  // 8. Collection Period Effectiveness (by credit term)
  const creditPeriodDays = [7, 15, 30, 45, 60];
  const cpEffectiveness = creditPeriodDays.map((days) => {
    const termCleared = clearedInvoices.filter((i) => i.creditPeriodDays === days);
    const onTime = termCleared.filter((i) => i.daysForPayment != null && i.daysForPayment <= days);
    const totalAmt = termCleared.reduce((s, i) => s + i.amount, 0);
    const onTimeAmt = onTime.reduce((s, i) => s + i.amount, 0);
    const rate = totalAmt > 0 ? (onTimeAmt / totalAmt) * 100 : 0;
    return { creditPeriod: `${days} days`, value: parseFloat(rate.toFixed(1)) };
  });

  // ========== AGING & RISK ==========

  // 9. Aging Bucket Distribution
  const agingCategories = [
    { key: "NOT_DUE", label: "Not Due", color: "#16a34a" },
    { key: "1_7", label: "1-7 days", color: "#22c55e" },
    { key: "8_15", label: "8-15 days", color: "#3b82f6" },
    { key: "16_30", label: "16-30 days", color: "#eab308" },
    { key: "31_45", label: "31-45 days", color: "#d97706" },
    { key: "46_60", label: "46-60 days", color: "#ea580c" },
    { key: "60_PLUS", label: "60+ days", color: "#dc2626" },
  ];
  const agingBuckets = agingCategories.map((cat) => {
    const bucket = openInvoices.filter((i) => i.overdueCategory === cat.key);
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

  // 10. Overdue Invoice Density
  const countDensity = openInvoices.length > 0 ? (overdueInvs.length / openInvoices.length) * 100 : 0;
  const valueDensity = totalOpenAR > 0 ? (overdueAR / totalOpenAR) * 100 : 0;

  // 11. Peak Overdue Exposure
  const peakInvoice = overdueInvs.sort((a, b) => b.amount - a.amount)[0];
  let peakExposure = { amount: 0, invoiceNo: "", companyCode: "", daysOverdue: 0 };
  if (peakInvoice) {
    const cc = await prisma.companyCode.findUnique({ where: { id: peakInvoice.companyCodeId } });
    peakExposure = {
      amount: Math.round(peakInvoice.amount),
      invoiceNo: peakInvoice.documentNumber,
      companyCode: cc?.code || "",
      daysOverdue: peakInvoice.elapsedDays,
    };
  }

  // ========== OPERATIONAL KPIs ==========

  // 12. Invoice-to-Cash P50/P90
  const payDays = clearedInvoices
    .filter((i) => i.daysForPayment != null)
    .map((i) => i.daysForPayment!)
    .sort((a, b) => a - b);
  const p50 = payDays.length > 0 ? payDays[Math.floor(payDays.length * 0.5)] : 0;
  const p90 = payDays.length > 0 ? payDays[Math.floor(payDays.length * 0.9)] : 0;

  // 13. Credit Period Utilization
  const cpuVals = clearedInvoices
    .filter((i) => i.daysForPayment != null && i.creditPeriodDays > 0)
    .map((i) => (i.daysForPayment! / i.creditPeriodDays) * 100);
  const avgCPU = cpuVals.length > 0 ? cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length : 0;
  // Compute CPU monthly from cleared invoices grouped by fiscal period
  const fpIdToLabel = new Map(fiscalPeriods.map((fp) => [fp.id, fp.periodLabel]));
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
  const cpuMonthly = fiscalPeriods.map((fp) => {
    const vals = cpuByPeriod.get(fp.periodLabel) || [];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { month: fp.periodLabel, value: parseFloat(avg.toFixed(1)) };
  });

  // 14. Days to Clear Backlog (weekly)
  const backlogWeekly = weekNumbers.map((w) => {
    const d = weekMap.get(w)!;
    const avgDailyCollection = d.collAmt / 7;
    const backlog = avgDailyCollection > 0 ? d.overdueBalance / avgDailyCollection : 0;
    // Cap at reasonable value
    const val = Math.min(backlog, 999);
    return { week: d.label, value: parseFloat(val.toFixed(1)) };
  });

  // ========== ADVANCED KPIs ==========

  // --- 1. DSO Bridge by Customer Segment ---
  const blendedDSO = dso; // reuse the already-computed overall DSO
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"] as const;
  const dsoBridgeSegments = segments.map((seg) => {
    const segInvs = allInvoices.filter((i) => i.customer.segment === seg);
    const segOpen = segInvs.filter((i) => i.status === "OPEN" || i.status === "PARTIAL");
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

  // --- 2. AR Health Score ---
  const overdueARForHealth = overdueAR;
  const overdueRatioForHealth = totalOpenAR > 0 ? (overdueARForHealth / totalOpenAR) * 100 : 0;

  // DSO component: 0-100, lower DSO = higher score
  const dsoHealthScore = Math.max(0, Math.min(100, 100 - (blendedDSO - 20) / (60 - 20) * 100));
  // CEI component
  const ceiHealthScore = Math.min(100, Math.max(0, ceiOverall));
  // Overdue component: lower overdue ratio = higher score
  const overdueHealthScore = Math.max(0, 100 - overdueRatioForHealth);
  // Aging component: % of AR that is NOT overdue
  const notDueAR = openInvoices.filter((i) => !i.isOverdue).reduce((s, i) => s + i.amount, 0);
  const agingHealthScore = totalOpenAR > 0 ? (notDueAR / totalOpenAR) * 100 : 100;
  // Concentration component: lower top-5 customer concentration = higher score
  const custARMap = new Map<string, number>();
  for (const i of openInvoices) {
    custARMap.set(i.customerId, (custARMap.get(i.customerId) || 0) + i.amount);
  }
  const top5Pct = totalOpenAR > 0
    ? [...custARMap.values()].sort((a, b) => b - a).slice(0, 5).reduce((s, v) => s + v, 0) / totalOpenAR * 100
    : 0;
  const concentrationHealthScore = Math.max(0, 100 - top5Pct * 2);
  // Trend component: based on DSO velocity from monthly data
  const dsoMonthlyValues = dsoMonthly.map((d) => d.value);
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

  // --- 3. Terms Mix Drag ---
  const weightedAvgTerms = totalOpenAR > 0
    ? openInvoices.reduce((s, i) => s + i.creditPeriodDays * i.amount, 0) / totalOpenAR
    : 0;
  const clearedWithPayDays = clearedInvoices.filter((i) => i.daysForPayment != null);
  const avgActualPayDays = clearedWithPayDays.length > 0
    ? clearedWithPayDays.reduce((s, i) => s + i.daysForPayment!, 0) / clearedWithPayDays.length
    : 0;
  const termsMixDrag = {
    weightedAvgTerms: parseFloat(weightedAvgTerms.toFixed(1)),
    avgActualPayDays: parseFloat(avgActualPayDays.toFixed(1)),
    drag: parseFloat((avgActualPayDays - weightedAvgTerms).toFixed(1)),
  };

  // --- 4. Carrying Cost ---
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

  // --- 5. Cash Flow Leakage ---
  const bestPossibleDSO = weightedAvgTerms; // if everyone paid on time
  const dailySales = totalSalesAll > 0 ? totalSalesAll / periodDays : 0;
  const leakageDays = blendedDSO - bestPossibleDSO;
  const leakageINR = leakageDays * dailySales;
  const cashFlowLeakage = {
    bestPossibleDSO: parseFloat(bestPossibleDSO.toFixed(1)),
    actualDSO: parseFloat(blendedDSO.toFixed(1)),
    leakageDays: parseFloat(leakageDays.toFixed(1)),
    leakageINR: Math.round(leakageINR),
  };

  // --- 6. Company Code Performance ---
  const companyCodePerformance = companyCodes.map((cc) => {
    const ccOpen = openInvoices.filter((i) => i.companyCodeId === cc.id);
    const ccAll = allInvoices.filter((i) => i.companyCodeId === cc.id);
    const ccOpenAR = ccOpen.reduce((s, i) => s + i.amount, 0);
    const ccOverdueAR = ccOpen.filter((i) => i.isOverdue).reduce((s, i) => s + i.amount, 0);
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

  // --- 7. Segment Efficiency ---
  const segmentEfficiency = segments.map((seg) => {
    const segInvs = allInvoices.filter((i) => i.customer.segment === seg);
    const segOpen = segInvs.filter((i) => i.status === "OPEN" || i.status === "PARTIAL");
    const segCleared = segInvs.filter((i) => i.status === "CLEARED");
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
    const segOverdue = segOpen.filter((i) => i.isOverdue).reduce((s, i) => s + i.amount, 0);
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

  console.log(`  Advanced KPIs: Health=${healthScoreValue}(${healthGrade}), Drag=${termsMixDrag.drag}d, Leakage=${Math.round(leakageINR)}`);

  // ========== SUMMARY ==========
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
      dso: {
        overall: dsoOverall,
        monthly: dsoMonthly,
      },
      overdueRatio: {
        overall: parseFloat(overdueRatio.toFixed(1)),
        monthly: overdueRatioMonthly,
      },
      revenueAtRisk: {
        value: parseFloat(revenueAtRisk.toFixed(1)),
      },
      receivablesTurnover: {
        overall: parseFloat(turnover.toFixed(1)),
        monthly: turnoverMonthly,
      },
      netARMovement: {
        monthly: netARMonthly,
      },
    },
    collection: {
      cei: {
        overall: ceiOverall,
        monthly: ceiMonthly,
      },
      onTimePayment: {
        weekly: onTimeWeekly,
      },
      collectionEffectiveness: {
        weekly: collEffWeekly,
      },
      creditPeriodEffectiveness: {
        data: cpEffectiveness,
      },
    },
    aging: {
      buckets: agingBuckets,
      overdueDensity: {
        count: parseFloat(countDensity.toFixed(1)),
        value: parseFloat(valueDensity.toFixed(1)),
      },
      peakExposure: peakExposure,
    },
    operational: {
      invoiceToCash: { p50, p90 },
      creditPeriodUtilization: {
        overall: parseFloat(avgCPU.toFixed(1)),
        monthly: cpuMonthly,
      },
      daysToClearBacklog: {
        weekly: backlogWeekly,
      },
    },
    advanced: {
      dsoBridge,
      arHealthScore,
      termsMixDrag,
      carryingCost,
      cashFlowLeakage,
      companyCodePerformance,
      segmentEfficiency,
    },
  };
}

async function main() {
  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "All"];
  const result: Record<string, any> = {};

  for (const q of quarters) {
    result[q] = await computeForQuarter(q);
  }

  // Write as TypeScript module
  const tsContent = `// ============================================================
// PRE-COMPUTED KPI DATA — Generated from 25,000-invoice SQLite DB
// Auto-generated by prisma/compute-dashboard-data.ts
// DO NOT EDIT MANUALLY — re-run the compute script to update
// ============================================================

export type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4" | "All";

export interface AgingBucket {
  bucket: string;
  key: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyPoint {
  month: string;
  value: number;
}

export interface WeeklyPoint {
  week: string;
  value: number;
}

export interface WaterfallPoint {
  month: string;
  value: number;
  label: string;
}

export interface DSOBridgeSegment {
  segment: string;
  dso: number;
  weight: number;
  contribution: number;
}

export interface HealthScoreComponents {
  DSO: number;
  CEI: number;
  Overdue: number;
  Aging: number;
  Concentration: number;
  Trend: number;
}

export interface CompanyCodePerf {
  code: string;
  name: string;
  dso: number;
  overdueRatio: number;
  openAR: number;
  invoiceCount: number;
}

export interface SegmentEfficiency {
  segment: string;
  dso: number;
  collectionRate: number;
  overdueRatio: number;
  efficiencyScore: number;
}

export interface AdvancedKPIs {
  dsoBridge: {
    blendedDSO: number;
    segments: DSOBridgeSegment[];
  };
  arHealthScore: {
    score: number;
    grade: string;
    components: HealthScoreComponents;
  };
  termsMixDrag: {
    weightedAvgTerms: number;
    avgActualPayDays: number;
    drag: number;
  };
  carryingCost: {
    dailyCost: number;
    monthlyCost: number;
    annualCost: number;
    avgDaysOutstanding: number;
  };
  cashFlowLeakage: {
    bestPossibleDSO: number;
    actualDSO: number;
    leakageDays: number;
    leakageINR: number;
  };
  companyCodePerformance: CompanyCodePerf[];
  segmentEfficiency: SegmentEfficiency[];
}

export interface QuarterData {
  summary: {
    totalInvoices: number;
    openInvoices: number;
    clearedInvoices: number;
    overdueInvoices: number;
    totalOpenAR: number;
    overdueAR: number;
    currentAR: number;
    totalSales: number;
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
}

export const COMPUTED_KPI_DATA: Record<QuarterKey, QuarterData> = ${JSON.stringify(result, null, 2)} as any;
`;

  writeFileSync(resolve("src/lib/computed-kpis.ts"), tsContent);
  console.log("\n✅ Written to src/lib/computed-kpis.ts");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
