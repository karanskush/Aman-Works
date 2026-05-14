import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "path";

const adapter = new PrismaLibSql({ url: `file:${resolve("prisma/dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const results: Record<string, any> = {};

  // ---- EXECUTIVE KPIs ----
  const openInvoices = await prisma.invoice.findMany({ where: { status: { in: ["OPEN", "PARTIAL"] } } });
  const clearedInvoices = await prisma.invoice.findMany({ where: { status: "CLEARED" } });
  const allInvoices = await prisma.invoice.findMany();

  const totalOpenAR = openInvoices.reduce((s, i) => s + i.amount, 0);
  const overdueInvs = openInvoices.filter(i => i.isOverdue);
  const overdueAR = overdueInvs.reduce((s, i) => s + i.amount, 0);
  const currentAR = totalOpenAR - overdueAR;

  // 1. DSO - from monthly snapshots (latest)
  const latestSnapshot = await prisma.monthlySnapshot.findFirst({ orderBy: { fiscalPeriodId: "desc" } });
  results["1_DSO"] = { value: latestSnapshot?.dso?.toFixed(1), unit: "days" };

  // 2. Overdue Ratio
  const overdueRatio = totalOpenAR > 0 ? (overdueAR / totalOpenAR) * 100 : 0;
  results["2_OverdueRatio"] = { value: overdueRatio.toFixed(1), unit: "%" };

  // 3. Revenue at Risk (45-60 day credit period overdue)
  const riskInvoices = overdueInvs.filter(i => i.creditPeriodDays >= 45);
  const riskAR = riskInvoices.reduce((s, i) => s + i.amount, 0);
  const revenueAtRisk = totalOpenAR > 0 ? (riskAR / totalOpenAR) * 100 : 0;
  results["3_RevenueAtRisk"] = { value: revenueAtRisk.toFixed(1), unit: "%" };

  // 4. Receivables Turnover
  const snapshots = await prisma.monthlySnapshot.findMany({ orderBy: { fiscalPeriodId: "asc" } });
  const totalSales = snapshots.reduce((s, m) => s + m.totalCreditSales, 0);
  const avgAR = snapshots.length > 0 ? (snapshots[0].beginningAR + snapshots[snapshots.length - 1].totalAR) / 2 : 1;
  const turnover = avgAR > 0 ? totalSales / avgAR : 0;
  results["4_ReceivablesTurnover"] = { value: turnover.toFixed(2), unit: "x" };

  // 5. Net AR Movement (total Q1)
  const totalAR_movement = snapshots.reduce((s, m) => s + (m.totalAR - m.beginningAR), 0);
  results["5_NetARMovement"] = { value: Math.round(totalAR_movement).toLocaleString(), unit: "INR" };

  // 6. Total AR Outstanding
  results["6_TotalAR"] = { value: Math.round(totalOpenAR).toLocaleString(), unit: "INR" };

  // 7. Current vs Overdue Split
  results["7_CurrentVsOverdue"] = { current: Math.round(currentAR).toLocaleString(), overdue: Math.round(overdueAR).toLocaleString(), currentPct: totalOpenAR > 0 ? ((currentAR / totalOpenAR) * 100).toFixed(1) : "0", overduePct: totalOpenAR > 0 ? ((overdueAR / totalOpenAR) * 100).toFixed(1) : "0" };

  // 8. WADO (Weighted Average Days Overdue)
  const totalWeightedOverdue = overdueInvs.reduce((s, i) => s + i.weightedOverdue, 0);
  const wado = overdueAR > 0 ? totalWeightedOverdue / overdueAR : 0;
  results["8_WADO"] = { value: wado.toFixed(1), unit: "days" };

  // ---- COLLECTION PERFORMANCE ----
  // 9. CEI (latest month)
  results["9_CEI"] = { value: latestSnapshot?.cei?.toFixed(1), unit: "%" };

  // 10. On-Time Payment Rate (average)
  const wcfs = await prisma.weeklyCashflow.findMany({ where: { onTimePaymentRate: { not: null } } });
  const avgOnTime = wcfs.length > 0 ? wcfs.reduce((s, w) => s + (w.onTimePaymentRate || 0), 0) / wcfs.length : 0;
  results["10_OnTimePaymentRate"] = { value: avgOnTime.toFixed(1), unit: "%" };

  // 11. Weekly Collection Effectiveness (average)
  const effWcfs = wcfs.filter(w => w.collectionEffectiveness != null && w.collectionEffectiveness > 0);
  const avgEff = effWcfs.length > 0 ? effWcfs.reduce((s, w) => s + (w.collectionEffectiveness || 0), 0) / effWcfs.length : 0;
  results["11_CollectionEffectiveness"] = { value: avgEff.toFixed(1), unit: "%" };

  // 12. Collection Period Effectiveness (by credit term)
  const terms = await prisma.paymentTerms.findMany();
  const cpEff: Record<string, string> = {};
  for (const t of terms) {
    const termInvs = clearedInvoices.filter(i => i.creditPeriodDays === t.creditPeriodDays);
    const onTimeTerm = termInvs.filter(i => i.daysForPayment != null && i.daysForPayment <= t.creditPeriodDays);
    const rate = termInvs.length > 0 ? (onTimeTerm.reduce((s, i) => s + i.amount, 0) / termInvs.reduce((s, i) => s + i.amount, 0)) * 100 : 0;
    cpEff[`${t.creditPeriodDays}d`] = rate.toFixed(1) + "%";
  }
  results["12_CreditPeriodEffectiveness"] = cpEff;

  // 13. Collection Rate (overall)
  const totalDueAmt = wcfs.reduce((s, w) => s + w.invoicesDueAmount, 0);
  const totalCollAmt = wcfs.reduce((s, w) => s + w.invoicesCollectedAmount, 0);
  const collRate = totalDueAmt > 0 ? (totalCollAmt / totalDueAmt) * 100 : 0;
  results["13_CollectionRate"] = { value: collRate.toFixed(1), unit: "%" };

  // 14. Dunning Response Rate (use join instead of large IN list)
  const dunnedInvs = await prisma.invoice.findMany({
    where: { dunningHistory: { some: {} } },
    select: { id: true, status: true },
  });
  const dunnedCleared = dunnedInvs.filter(i => i.status === "CLEARED").length;
  const dunnResp = dunnedInvs.length > 0 ? (dunnedCleared / dunnedInvs.length) * 100 : 0;
  results["14_DunningResponseRate"] = { value: dunnResp.toFixed(1), unit: "%" };

  // ---- AGING & RISK ----
  // 15. Aging Bucket Distribution
  const agingBuckets: Record<string, { count: number; amount: number; pct: string }> = {};
  const categories = ["NOT_DUE", "1_7", "8_15", "16_30", "31_45", "46_60", "60_PLUS"];
  for (const cat of categories) {
    const bucket = openInvoices.filter(i => i.overdueCategory === cat);
    const amt = bucket.reduce((s, i) => s + i.amount, 0);
    agingBuckets[cat] = { count: bucket.length, amount: Math.round(amt), pct: totalOpenAR > 0 ? ((amt / totalOpenAR) * 100).toFixed(1) + "%" : "0%" };
  }
  results["15_AgingBuckets"] = agingBuckets;

  // 16. Overdue Invoice Density
  const countDensity = openInvoices.length > 0 ? (overdueInvs.length / openInvoices.length) * 100 : 0;
  const valueDensity = totalOpenAR > 0 ? (overdueAR / totalOpenAR) * 100 : 0;
  results["16_OverdueDensity"] = { countPct: countDensity.toFixed(1), valuePct: valueDensity.toFixed(1), gap: (countDensity - valueDensity).toFixed(1) };

  // 17. Peak Overdue Exposure
  const peakInvoice = overdueInvs.sort((a, b) => b.amount - a.amount)[0];
  if (peakInvoice) {
    const peakCust = await prisma.customer.findUnique({ where: { id: peakInvoice.customerId } });
    results["17_PeakExposure"] = { documentNumber: peakInvoice.documentNumber, amount: Math.round(peakInvoice.amount).toLocaleString(), daysOverdue: peakInvoice.elapsedDays, customer: peakCust?.name };
  }

  // 19. Concentration Risk (Top 10)
  const custExposure = new Map<string, { name: string; amount: number }>();
  for (const inv of openInvoices) {
    const existing = custExposure.get(inv.customerId);
    if (existing) { existing.amount += inv.amount; }
    else {
      const c = await prisma.customer.findUnique({ where: { id: inv.customerId }, select: { name: true } });
      custExposure.set(inv.customerId, { name: c?.name || "", amount: inv.amount });
    }
  }
  const top10 = [...custExposure.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const top10Pct = totalOpenAR > 0 ? (top10.reduce((s, c) => s + c.amount, 0) / totalOpenAR * 100).toFixed(1) : "0";
  results["19_Top5Concentration"] = { top5PctOfAR: top10Pct + "%", customers: top10.map(c => ({ name: c.name, amount: Math.round(c.amount).toLocaleString() })) };

  // 20. Bad Debt Provision Estimate
  const provRates: Record<string, number> = { "1_7": 0.005, "8_15": 0.01, "16_30": 0.02, "31_45": 0.05, "46_60": 0.10, "60_PLUS": 0.25 };
  let totalProvision = 0;
  const provDetail: Record<string, string> = {};
  for (const [cat, rate] of Object.entries(provRates)) {
    const bucketAmt = openInvoices.filter(i => i.overdueCategory === cat).reduce((s, i) => s + i.amount, 0);
    const prov = bucketAmt * rate;
    totalProvision += prov;
    provDetail[cat] = Math.round(prov).toLocaleString();
  }
  results["20_BadDebtProvision"] = { total: Math.round(totalProvision).toLocaleString(), byBucket: provDetail };

  // ---- OPERATIONAL ----
  // 21. Invoice-to-Cash P50/P90
  const payDays = clearedInvoices.filter(i => i.daysForPayment != null).map(i => i.daysForPayment!).sort((a, b) => a - b);
  const p50 = payDays[Math.floor(payDays.length * 0.5)];
  const p90 = payDays[Math.floor(payDays.length * 0.9)];
  results["21_I2C_CycleTime"] = { p50, p90, gap: p90 - p50, unit: "days" };

  // 22. Credit Period Utilization
  const cpuVals = clearedInvoices.filter(i => i.daysForPayment != null && i.creditPeriodDays > 0).map(i => (i.daysForPayment! / i.creditPeriodDays) * 100);
  const avgCPU = cpuVals.length > 0 ? cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length : 0;
  results["22_CreditPeriodUtil"] = { value: avgCPU.toFixed(1), unit: "%" };

  // 23. Days to Clear Backlog (latest week)
  const latestWcf = await prisma.weeklyCashflow.findFirst({ orderBy: { weekNumber: "desc" } });
  const backlog = latestWcf && latestWcf.collectionRate && latestWcf.collectionRate > 0 ? latestWcf.overdueBalance / (latestWcf.collectionRate) : 0;
  results["23_DaysToClearBacklog"] = { value: backlog.toFixed(1), unit: "days" };

  // 25. Average Days Delinquent
  const avgDD = overdueInvs.length > 0 ? overdueInvs.reduce((s, i) => s + i.elapsedDays, 0) / overdueInvs.length : 0;
  results["25_AvgDaysDelinquent"] = { value: avgDD.toFixed(1), unit: "days" };

  // ---- CUSTOMER ANALYTICS ----
  // 26. DSO by Segment
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"];
  const segDSO: Record<string, string> = {};
  for (const seg of segments) {
    const segCusts = await prisma.customer.findMany({ where: { segment: seg }, select: { id: true } });
    const segIds = segCusts.map(c => c.id);
    const segOpen = openInvoices.filter(i => segIds.includes(i.customerId));
    const segAll = allInvoices.filter(i => segIds.includes(i.customerId));
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segTotalSales = segAll.reduce((s, i) => s + i.amount, 0);
    const dso = segTotalSales > 0 ? (segOpenAR / segTotalSales) * 365 : 0;
    segDSO[seg] = dso.toFixed(1) + "d";
  }
  results["26_DSObySegment"] = segDSO;

  // 27. Overdue Rate by Region
  const regions = await prisma.region.findMany();
  const regionOverdue: Record<string, string> = {};
  const regionNames = [...new Set(regions.map(r => r.regionName))];
  for (const rn of regionNames) {
    const regIds = regions.filter(r => r.regionName === rn).map(r => r.id);
    const regCusts = await prisma.customer.findMany({ where: { regionId: { in: regIds } }, select: { id: true } });
    const custIds = regCusts.map(c => c.id);
    const regOpen = openInvoices.filter(i => custIds.includes(i.customerId));
    const regOverdue = regOpen.filter(i => i.isOverdue);
    const regOpenAR = regOpen.reduce((s, i) => s + i.amount, 0);
    const regOverdueAR = regOverdue.reduce((s, i) => s + i.amount, 0);
    regionOverdue[rn] = regOpenAR > 0 ? ((regOverdueAR / regOpenAR) * 100).toFixed(1) + "%" : "0%";
  }
  results["27_OverdueByRegion"] = regionOverdue;

  // 37. Portfolio Risk Distribution
  const riskCats = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const riskDist: Record<string, { customers: number; ar: string }> = {};
  for (const rc of riskCats) {
    const rcCusts = await prisma.customer.findMany({ where: { riskCategory: rc }, select: { id: true } });
    const rcIds = rcCusts.map(c => c.id);
    const rcAR = openInvoices.filter(i => rcIds.includes(i.customerId)).reduce((s, i) => s + i.amount, 0);
    riskDist[rc] = { customers: rcCusts.length, ar: Math.round(rcAR).toLocaleString() };
  }
  results["37_PortfolioRisk"] = riskDist;

  // 40. Dunning Coverage (use relation filter)
  const overdueWithDunning = overdueInvs.filter(i => {
    // Check if invoice has dunning records — we already have all dunning data
    return true; // Will compute from DB
  });
  const overdueInvIds = new Set(overdueInvs.map(i => i.id));
  const allDunning = await prisma.dunningHistory.findMany({ select: { invoiceId: true, dunningLevel: true } });
  const dunnedOverdueSet = new Set(allDunning.filter(d => overdueInvIds.has(d.invoiceId)).map(d => d.invoiceId));
  const coverage = overdueInvs.length > 0 ? (dunnedOverdueSet.size / overdueInvs.length) * 100 : 0;
  results["40_DunningCoverage"] = { value: coverage.toFixed(1), unit: "%" };

  // 41. Dunning Escalation Funnel
  const funnel: Record<string, number> = {};
  for (let l = 1; l <= 4; l++) {
    const levelInvs = new Set(allDunning.filter(d => d.dunningLevel === l).map(d => d.invoiceId));
    funnel[`L${l}`] = levelInvs.size;
  }
  results["41_DunningFunnel"] = funnel;

  // 43. Dunning Effectiveness by Level (use in-memory lookup)
  const clearedIdSet = new Set(clearedInvoices.map(i => i.id));
  const dunnEff: Record<string, string> = {};
  for (let l = 1; l <= 4; l++) {
    const levelInvs = new Set(allDunning.filter(d => d.dunningLevel === l).map(d => d.invoiceId));
    const clearedCount = [...levelInvs].filter(id => clearedIdSet.has(id)).length;
    dunnEff[`L${l}`] = levelInvs.size > 0 ? ((clearedCount / levelInvs.size) * 100).toFixed(1) + "%" : "0%";
  }
  results["43_DunningEffectiveness"] = dunnEff;

  // Print results
  console.log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
