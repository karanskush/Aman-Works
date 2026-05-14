import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "path";

const adapter = new PrismaLibSql({ url: `file:${resolve(__dirname, "dev.db")}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const R: Record<string, any> = {};

  // Load all data into memory for fast computation
  const allInvoices = await prisma.invoice.findMany({ include: { customer: true, paymentTerms: true } });
  const openInvs = allInvoices.filter(i => i.status !== "CLEARED");
  const clearedInvs = allInvoices.filter(i => i.status === "CLEARED");
  const overdueInvs = openInvs.filter(i => i.isOverdue);
  const totalOpenAR = openInvs.reduce((s, i) => s + i.amount, 0);
  const totalSales = allInvoices.reduce((s, i) => s + i.amount, 0);
  const snapshots = await prisma.monthlySnapshot.findMany({ orderBy: { fiscalPeriodId: "asc" } });
  const wcfs = await prisma.weeklyCashflow.findMany({ orderBy: { weekNumber: "asc" } });
  const allDunning = await prisma.dunningHistory.findMany();

  // ---- 1. DSO Bridge (by Segment) ----
  const blendedDSO = totalSales > 0 ? (totalOpenAR / totalSales) * 365 : 0;
  const segments = ["STRATEGIC", "KEY", "STANDARD", "SMB"];
  const dsoBridge: Record<string, any> = { blendedDSO: blendedDSO.toFixed(1) };
  for (const seg of segments) {
    const segInvs = allInvoices.filter(i => i.customer.segment === seg);
    const segOpen = segInvs.filter(i => i.status !== "CLEARED");
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
    const segDSO = segSales > 0 ? (segOpenAR / segSales) * 365 : 0;
    const weight = segSales / totalSales;
    const contribution = (segDSO - blendedDSO) * weight;
    dsoBridge[seg] = { dso: segDSO.toFixed(1), weight: (weight * 100).toFixed(1) + "%", contribution: contribution.toFixed(1) + "d" };
  }
  R["1_DSO_Bridge"] = dsoBridge;

  // ---- 2. DSO Velocity ----
  const dsoVelocity: Record<string, any> = {};
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].dso || 0;
    const curr = snapshots[i].dso || 0;
    const vel = prev > 0 ? ((curr - prev) / prev * 100) : 0;
    dsoVelocity[`P${i + 1}`] = { dso: curr.toFixed(1), velocity: vel.toFixed(1) + "%" };
  }
  R["2_DSO_Velocity"] = dsoVelocity;

  // ---- 3. Terms Mix Drag ----
  const weightedTerms = openInvs.reduce((s, i) => s + i.creditPeriodDays * i.amount, 0) / (totalOpenAR || 1);
  const avgPayDays = clearedInvs.filter(i => i.daysForPayment != null).reduce((s, i) => s + i.daysForPayment!, 0) / (clearedInvs.filter(i => i.daysForPayment != null).length || 1);
  R["3_TermsMixDrag"] = { weightedAvgTerms: weightedTerms.toFixed(1) + "d", avgActualPayDays: avgPayDays.toFixed(1) + "d", drag: (avgPayDays - weightedTerms).toFixed(1) + "d" };

  // ---- 4. AR Health Score ----
  const overdueRatio = totalOpenAR > 0 ? (overdueInvs.reduce((s, i) => s + i.amount, 0) / totalOpenAR) * 100 : 0;
  const latestCEI = snapshots.length > 0 ? (snapshots[snapshots.length - 1].cei || 0) : 0;
  const notDuePct = totalOpenAR > 0 ? (openInvs.filter(i => !i.isOverdue).reduce((s, i) => s + i.amount, 0) / totalOpenAR) * 100 : 0;
  const top5AR = [...new Map<string, number>()].length; // compute below
  const custAR = new Map<string, number>();
  for (const i of openInvs) { custAR.set(i.customerId, (custAR.get(i.customerId) || 0) + i.amount); }
  const top5Pct = [...custAR.values()].sort((a, b) => b - a).slice(0, 5).reduce((s, v) => s + v, 0) / (totalOpenAR || 1) * 100;

  const dsoScore = Math.max(0, Math.min(100, 100 - (blendedDSO - 20) / (60 - 20) * 100));
  const ceiScore = Math.min(100, latestCEI);
  const overdueScore = Math.max(0, 100 - overdueRatio);
  const agingScore = notDuePct;
  const concScore = Math.max(0, 100 - top5Pct * 2);
  const velocities = Object.values(dsoVelocity).map((v: any) => parseFloat(v.velocity));
  const avgVel = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;
  const trendScore = Math.max(0, Math.min(100, 50 - avgVel));

  const healthScore = Math.round(dsoScore * 0.20 + ceiScore * 0.20 + overdueScore * 0.15 + agingScore * 0.15 + concScore * 0.15 + trendScore * 0.15);
  const healthGrade = healthScore >= 80 ? "A" : healthScore >= 65 ? "B" : healthScore >= 50 ? "C" : healthScore >= 35 ? "D" : "F";
  R["4_AR_HealthScore"] = {
    score: healthScore, grade: healthGrade,
    components: { DSO: Math.round(dsoScore), CEI: Math.round(ceiScore), Overdue: Math.round(overdueScore), Aging: Math.round(agingScore), Concentration: Math.round(concScore), Trend: Math.round(trendScore) }
  };

  // ---- 5. Payment Behavior Deterioration Index ----
  const now = new Date("2026-03-31");
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
  const d180 = new Date(now); d180.setDate(d180.getDate() - 180);
  const custDeterioration: { name: string; pbdi: number; recentAvg: number; priorAvg: number }[] = [];
  const custMap = new Map<string, typeof clearedInvs>();
  for (const i of clearedInvs) { if (!custMap.has(i.customerId)) custMap.set(i.customerId, []); custMap.get(i.customerId)!.push(i); }
  for (const [custId, invs] of custMap) {
    const recent = invs.filter(i => i.clearingDate && i.clearingDate >= d90 && i.daysForPayment != null);
    const prior = invs.filter(i => i.clearingDate && i.clearingDate >= d180 && i.clearingDate < d90 && i.daysForPayment != null);
    if (recent.length >= 2 && prior.length >= 2) {
      const recentAvg = recent.reduce((s, i) => s + i.daysForPayment!, 0) / recent.length;
      const priorAvg = prior.reduce((s, i) => s + i.daysForPayment!, 0) / prior.length;
      const pbdi = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg * 100) : 0;
      if (pbdi > 15) custDeterioration.push({ name: invs[0].customer.name, pbdi: Math.round(pbdi), recentAvg: Math.round(recentAvg), priorAvg: Math.round(priorAvg) });
    }
  }
  custDeterioration.sort((a, b) => b.pbdi - a.pbdi);
  R["5_PBDI_TopDeteriorating"] = { count: custDeterioration.length, top5: custDeterioration.slice(0, 5) };

  // ---- 6. Credit Limit Utilization ----
  const customers = await prisma.customer.findMany();
  const clBreached: { name: string; utilPct: number; openAR: number; limit: number }[] = [];
  for (const c of customers) {
    if (!c.creditLimit || c.creditLimit <= 0) continue;
    const ar = custAR.get(c.id) || 0;
    const util = (ar / c.creditLimit) * 100;
    if (util > 70) clBreached.push({ name: c.name, utilPct: Math.round(util), openAR: Math.round(ar), limit: Math.round(c.creditLimit) });
  }
  clBreached.sort((a, b) => b.utilPct - a.utilPct);
  R["6_CreditLimitUtil"] = { customersAbove70Pct: clBreached.length, customersAbove100Pct: clBreached.filter(c => c.utilPct > 100).length, top5: clBreached.slice(0, 5) };

  // ---- 8. Dunning Touches per Dollar ----
  const clearedIdSet = new Set(clearedInvs.map(i => i.id));
  const dunnedCleared = allDunning.filter(d => clearedIdSet.has(d.invoiceId));
  const dunnedClearedIds = [...new Set(dunnedCleared.map(d => d.invoiceId))];
  const touchCount = dunnedCleared.length;
  const dunnedClearedAmt = clearedInvs.filter(i => dunnedClearedIds.includes(i.id)).reduce((s, i) => s + i.amount, 0);
  const touchesPerCrore = dunnedClearedAmt > 0 ? (touchCount / (dunnedClearedAmt / 10000000)).toFixed(1) : "N/A";
  R["8_TouchesPerDollar"] = { totalTouches: touchCount, totalCollected: Math.round(dunnedClearedAmt).toLocaleString(), touchesPerCrore };

  // ---- 9. Dunning Escalation Velocity ----
  const invDunning = new Map<string, { level: number; date: Date }[]>();
  for (const d of allDunning) {
    if (!invDunning.has(d.invoiceId)) invDunning.set(d.invoiceId, []);
    invDunning.get(d.invoiceId)!.push({ level: d.dunningLevel, date: d.dunningDate });
  }
  const transitions: Record<string, number[]> = { "L1→L2": [], "L2→L3": [] };
  for (const [, records] of invDunning) {
    records.sort((a, b) => a.level - b.level);
    for (let i = 0; i < records.length - 1; i++) {
      const key = `L${records[i].level}→L${records[i + 1].level}`;
      if (transitions[key]) {
        const days = Math.round((records[i + 1].date.getTime() - records[i].date.getTime()) / 86400000);
        transitions[key].push(days);
      }
    }
  }
  const escVelocity: Record<string, string> = {};
  for (const [key, days] of Object.entries(transitions)) {
    escVelocity[key] = days.length > 0 ? (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1) + "d" : "N/A";
  }
  R["9_EscalationVelocity"] = escVelocity;

  // ---- 11. Payment Consistency Score ----
  const consistencyScores: { name: string; segment: string; avg: number; stddev: number; cv: number; score: number }[] = [];
  for (const [custId, invs] of custMap) {
    const pays = invs.filter(i => i.daysForPayment != null).map(i => i.daysForPayment!);
    if (pays.length < 5) continue;
    const avg = pays.reduce((a, b) => a + b, 0) / pays.length;
    const variance = pays.reduce((s, p) => s + (p - avg) ** 2, 0) / pays.length;
    const stddev = Math.sqrt(variance);
    const cv = avg > 0 ? stddev / avg : 0;
    const score = Math.round((1 - Math.min(cv, 1)) * 100);
    consistencyScores.push({ name: invs[0].customer.name, segment: invs[0].customer.segment, avg: Math.round(avg), stddev: Math.round(stddev), cv: Math.round(cv * 100) / 100, score });
  }
  consistencyScores.sort((a, b) => a.score - b.score);
  R["11_PaymentConsistency"] = { avgScore: Math.round(consistencyScores.reduce((s, c) => s + c.score, 0) / (consistencyScores.length || 1)), mostUnpredictable: consistencyScores.slice(0, 5).map(c => ({ name: c.name, score: c.score, cv: c.cv, avgDays: c.avg })), mostPredictable: consistencyScores.slice(-3).reverse().map(c => ({ name: c.name, score: c.score, avgDays: c.avg })) };

  // ---- 13. Early Payment Discount Capture Rate ----
  const discountEligible = clearedInvs.filter(i => i.paymentTerms.discountDays1 != null && i.paymentTerms.discountDays1 > 0);
  const discountCaptured = discountEligible.filter(i => i.daysForPayment != null && i.daysForPayment <= i.paymentTerms.discountDays1!);
  const captureRate = discountEligible.length > 0 ? (discountCaptured.length / discountEligible.length * 100) : 0;
  const missedDiscount = discountEligible.filter(i => i.daysForPayment != null && i.daysForPayment > i.paymentTerms.discountDays1!).reduce((s, i) => s + i.amount * (i.paymentTerms.discountPercent1 || 0) / 100, 0);
  R["13_DiscountCapture"] = { eligible: discountEligible.length, captured: discountCaptured.length, captureRate: captureRate.toFixed(1) + "%", missedDiscountValue: Math.round(missedDiscount).toLocaleString() };

  // ---- 15. Rolling Forecast Accuracy (MAPE) ----
  const recentWcfs = wcfs.filter(w => w.expectedCashInflow > 0).slice(-12);
  const mapeVals = recentWcfs.map(w => Math.abs(w.actualCashInflow - w.expectedCashInflow) / w.expectedCashInflow * 100);
  const mape = mapeVals.length > 0 ? mapeVals.reduce((a, b) => a + b, 0) / mapeVals.length : 0;
  const bias = recentWcfs.reduce((s, w) => s + (w.actualCashInflow - w.expectedCashInflow), 0);
  R["15_ForecastMAPE"] = { mape: mape.toFixed(1) + "%", bias: bias > 0 ? "Under-forecasting" : "Over-forecasting", biasAmount: Math.round(Math.abs(bias)).toLocaleString() };

  // ---- 16. Cash Conversion Efficiency ----
  const cceVals = wcfs.filter(w => w.salesAmount > 0).map(w => (w.actualCashInflow / w.salesAmount) * 100);
  const avgCCE = cceVals.length > 0 ? cceVals.reduce((a, b) => a + b, 0) / cceVals.length : 0;
  R["16_CashConversionEfficiency"] = { avgCCE: avgCCE.toFixed(1) + "%", interpretation: avgCCE >= 100 ? "Drawing down AR backlog" : "AR is building — collections lag sales" };

  // ---- 17. Invoice Posting Lag ----
  const postingLags = allInvoices.filter(i => i.postingDate && i.documentDate).map(i => Math.round((i.postingDate.getTime() - i.documentDate.getTime()) / 86400000));
  const avgLag = postingLags.length > 0 ? postingLags.reduce((a, b) => a + b, 0) / postingLags.length : 0;
  R["17_PostingLag"] = { avgDays: avgLag.toFixed(1), invoicesWithLag: postingLags.filter(l => l > 2).length, pctWithLag: ((postingLags.filter(l => l > 2).length / (postingLags.length || 1)) * 100).toFixed(1) + "%" };

  // ---- 18. Dunning Gap (days after due before first dunning) ----
  const firstDunning = new Map<string, Date>();
  for (const d of allDunning) {
    if (d.dunningLevel === 1) {
      const existing = firstDunning.get(d.invoiceId);
      if (!existing || d.dunningDate < existing) firstDunning.set(d.invoiceId, d.dunningDate);
    }
  }
  const gaps: number[] = [];
  for (const i of overdueInvs) {
    const fd = firstDunning.get(i.id);
    if (fd) { gaps.push(Math.round((fd.getTime() - i.dueDate.getTime()) / 86400000)); }
  }
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  R["18_DunningGap"] = { avgDaysAfterDue: avgGap.toFixed(1), median: gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 0, invoicesTracked: gaps.length };

  // ---- 20. Dispute-Adjusted DSO ----
  const blockedInvIds = new Set(allDunning.filter(d => d.dunningBlock != null).map(d => d.invoiceId));
  const blockedAR = openInvs.filter(i => blockedInvIds.has(i.id)).reduce((s, i) => s + i.amount, 0);
  const cleanAR = totalOpenAR - blockedAR;
  const cleanDSO = totalSales > 0 ? (cleanAR / totalSales) * 365 : 0;
  const disputeDSO = totalSales > 0 ? (blockedAR / totalSales) * 365 : 0;
  R["20_DisputeAdjustedDSO"] = { totalDSO: blendedDSO.toFixed(1) + "d", cleanDSO: cleanDSO.toFixed(1) + "d", disputeDSO: disputeDSO.toFixed(1) + "d", blockedInvoices: blockedInvIds.size, blockedAR: Math.round(blockedAR).toLocaleString() };

  // ---- 21. Dunning Block Rate ----
  const totalDunnedInvs = new Set(allDunning.map(d => d.invoiceId)).size;
  const blockRate = totalDunnedInvs > 0 ? (blockedInvIds.size / totalDunnedInvs * 100) : 0;
  R["21_DunningBlockRate"] = { rate: blockRate.toFixed(1) + "%", blockedCount: blockedInvIds.size, totalDunned: totalDunnedInvs };

  // ---- 22. Cost of Carrying Receivables ----
  const costOfCapital = 0.10; // 10%
  const avgDaysOut = openInvs.reduce((s, i) => s + i.daysOutstanding, 0) / (openInvs.length || 1);
  const dailyCost = totalOpenAR * costOfCapital / 365;
  const annualCost = totalOpenAR * costOfCapital * (avgDaysOut / 365);
  R["22_CarryingCost"] = { dailyCost: Math.round(dailyCost).toLocaleString(), monthlyCost: Math.round(dailyCost * 30).toLocaleString(), annualCost: Math.round(annualCost).toLocaleString(), avgDaysOutstanding: avgDaysOut.toFixed(0), costPerDayDSOReduction: Math.round(dailyCost).toLocaleString() };

  // ---- 23. Free Cash Flow Leakage ----
  const bestPossibleDSO = weightedTerms; // If everyone paid on time
  const dailySales = totalSales / 365;
  const leakageDays = blendedDSO - bestPossibleDSO;
  const leakageINR = leakageDays * dailySales;
  R["23_CashFlowLeakage"] = { bestPossibleDSO: bestPossibleDSO.toFixed(1) + "d", actualDSO: blendedDSO.toFixed(1) + "d", leakageDays: leakageDays.toFixed(1) + "d", leakageINR: Math.round(leakageINR).toLocaleString(), interpretation: leakageDays > 0 ? "Cash trapped due to late payments" : "Collecting faster than terms — no leakage" };

  // ---- 24. Company Code Performance Index ----
  const companyCodes = await prisma.companyCode.findMany();
  const ccIndex: Record<string, any> = {};
  for (const cc of companyCodes) {
    const ccInvs = openInvs.filter(i => i.companyCodeId === cc.id);
    const ccAll = allInvoices.filter(i => i.companyCodeId === cc.id);
    const ccOpenAR = ccInvs.reduce((s, i) => s + i.amount, 0);
    const ccOverdueAR = ccInvs.filter(i => i.isOverdue).reduce((s, i) => s + i.amount, 0);
    const ccSales = ccAll.reduce((s, i) => s + i.amount, 0);
    const ccDSO = ccSales > 0 ? (ccOpenAR / ccSales) * 365 : 0;
    const ccOverdueRatio = ccOpenAR > 0 ? (ccOverdueAR / ccOpenAR * 100) : 0;
    ccIndex[cc.code + " " + cc.name] = { dso: ccDSO.toFixed(1) + "d", overdueRatio: ccOverdueRatio.toFixed(1) + "%", openAR: Math.round(ccOpenAR).toLocaleString(), invoices: ccInvs.length };
  }
  R["24_CompanyCodeIndex"] = ccIndex;

  // ---- 25. Segment Efficiency Score ----
  const segEfficiency: Record<string, any> = {};
  for (const seg of segments) {
    const segInvs = allInvoices.filter(i => i.customer.segment === seg);
    const segOpen = segInvs.filter(i => i.status !== "CLEARED");
    const segCleared = segInvs.filter(i => i.status === "CLEARED");
    const segOpenAR = segOpen.reduce((s, i) => s + i.amount, 0);
    const segSales = segInvs.reduce((s, i) => s + i.amount, 0);
    const segOverdue = segOpen.filter(i => i.isOverdue).reduce((s, i) => s + i.amount, 0);
    const segDSO = segSales > 0 ? (segOpenAR / segSales) * 365 : 0;
    const segCollRate = segSales > 0 ? (segCleared.reduce((s, i) => s + i.amount, 0) / segSales * 100) : 0;
    const segOverdueRatio = segOpenAR > 0 ? (segOverdue / segOpenAR * 100) : 0;
    const efficiency = segDSO > 0 ? Math.round((1 / segDSO) * segCollRate * (1 - segOverdueRatio / 100) * 1000) : 0;
    segEfficiency[seg] = { dso: segDSO.toFixed(1) + "d", collectionRate: segCollRate.toFixed(1) + "%", overdueRatio: segOverdueRatio.toFixed(1) + "%", efficiencyScore: efficiency };
  }
  R["25_SegmentEfficiency"] = segEfficiency;

  console.log(JSON.stringify(R, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
