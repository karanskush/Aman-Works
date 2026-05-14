// ============================================================
// CHATBOT ENGINE — KPI Knowledge Base + Cross-KPI Intelligence
// Formula-aware, health-scored, C-suite ready
// No external AI — all logic is rule-based on dashboard data
// ============================================================

import {
  dsoData,
  overdueRatioData,
  revenueAtRiskData,
  receivablesTurnoverData,
  netARMovementData,
  ceiData,
  onTimePaymentData,
  collectionEffectivenessWeeklyData,
  collectionPeriodEffectivenessData,
  agingBucketData,
  overdueInvoiceDensityData,
  peakOverdueExposureData,
  invoiceToCashData,
  creditPeriodUtilizationData,
  daysToClearBacklogData,
} from "./data";
import { formatCurrency } from "./utils";

// ---- Derived calculations ----
const totalARQ1 = netARMovementData.monthly.reduce((s, m) => s + m.value, 0);
const avgOnTime = Math.round(onTimePaymentData.weekly.reduce((s, w) => s + w.value, 0) / onTimePaymentData.weekly.length * 10) / 10;
const avgCollEff = Math.round(collectionEffectivenessWeeklyData.weekly.reduce((s, w) => s + w.value, 0) / collectionEffectivenessWeeklyData.weekly.length * 10) / 10;
const weeksAboveTarget = onTimePaymentData.weekly.filter(w => w.value >= 85).length;
const backlogLatest = daysToClearBacklogData.weekly[daysToClearBacklogData.weekly.length - 1].value;
const backlogMin = Math.min(...daysToClearBacklogData.weekly.map(w => w.value));
const agingHealthy = agingBucketData.data.filter(d => ["7 days", "15 days", "30 days"].includes(d.bucket)).reduce((s, d) => s + d.percentage, 0);
const agingRisky = agingBucketData.data.filter(d => ["45 days", "60 days"].includes(d.bucket)).reduce((s, d) => s + d.percentage, 0);
const dsoMoM = ((dsoData.monthly[2].value - dsoData.monthly[0].value) / dsoData.monthly[0].value * 100).toFixed(0);
const turnoverDecline = ((receivablesTurnoverData.monthly[0].value - receivablesTurnoverData.monthly[2].value) / receivablesTurnoverData.monthly[0].value * 100).toFixed(0);
const ceiDecline = (ceiData.monthly[1].value - ceiData.monthly[2].value).toFixed(1);
const cpuTrend = creditPeriodUtilizationData.monthly[0].value - creditPeriodUtilizationData.monthly[2].value;

// ---- Health Scoring System ----
interface CategoryHealth {
  score: number;
  grade: string;
  status: string;
  details: string[];
}

function scoreExecutive(): CategoryHealth {
  let score = 100;
  const details: string[] = [];

  // DSO scoring (target <30, warning >40, critical >50)
  if (dsoData.overall > 50) { score -= 30; details.push("DSO critically high at " + dsoData.overall + " days"); }
  else if (dsoData.overall > 40) { score -= 20; details.push("DSO elevated at " + dsoData.overall + " days (target <30)"); }
  else if (dsoData.overall > 30) { score -= 10; details.push("DSO slightly above target at " + dsoData.overall + " days"); }

  // Overdue ratio (target <20%, warning >30%, critical >40%)
  if (overdueRatioData.overall > 40) { score -= 25; details.push("Overdue ratio at " + overdueRatioData.overall + "% — nearly half of AR is past due"); }
  else if (overdueRatioData.overall > 30) { score -= 15; details.push("Overdue ratio elevated at " + overdueRatioData.overall + "%"); }

  // Revenue at risk (target <30%, warning >50%, critical >70%)
  if (revenueAtRiskData.value > 70) { score -= 25; details.push("Revenue at risk critically high at " + revenueAtRiskData.value + "%"); }
  else if (revenueAtRiskData.value > 50) { score -= 15; details.push("Revenue at risk elevated at " + revenueAtRiskData.value + "%"); }

  // Receivables turnover (target >5x, warning <3x, critical <2x)
  if (receivablesTurnoverData.overall < 2) { score -= 20; details.push("Receivables turnover critically low at " + receivablesTurnoverData.overall + "x"); }
  else if (receivablesTurnoverData.overall < 5) { score -= 10; details.push("Receivables turnover below benchmark at " + receivablesTurnoverData.overall + "x (target 5-8x)"); }

  score = Math.max(0, score);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const status = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  return { score, grade, status, details };
}

function scoreCollectionEfficiency(): CategoryHealth {
  let score = 100;
  const details: string[] = [];

  // CEI (target >90%, warning <85%, critical <80%)
  const latestCEI = ceiData.monthly[ceiData.monthly.length - 1].value;
  if (latestCEI < 80) { score -= 25; details.push("Latest CEI dropped to " + latestCEI + "% (below 80% threshold)"); }
  else if (latestCEI < 85) { score -= 15; details.push("Latest CEI at " + latestCEI + "% — approaching danger zone"); }
  else if (latestCEI < 90) { score -= 5; details.push("CEI at " + latestCEI + "% — acceptable but below strong threshold"); }

  // On-time payment avg (target >85%)
  if (avgOnTime < 70) { score -= 20; details.push("Average on-time payment at " + avgOnTime + "% — well below 85% target"); }
  else if (avgOnTime < 85) { score -= 10; details.push("Average on-time payment at " + avgOnTime + "% (target 85%)"); }

  // Collection effectiveness (target >70%)
  if (avgCollEff < 50) { score -= 25; details.push("Weekly collection effectiveness averaging " + avgCollEff + "% — critically low (target 70%)"); }
  else if (avgCollEff < 70) { score -= 15; details.push("Weekly collection effectiveness at " + avgCollEff + "% (target 70%)"); }

  // Credit period effectiveness spread
  const cpEffAvg = collectionPeriodEffectivenessData.data.reduce((s, d) => s + d.value, 0) / collectionPeriodEffectivenessData.data.length;
  if (cpEffAvg < 50) { score -= 10; details.push("Average credit period effectiveness only " + cpEffAvg.toFixed(1) + "%"); }

  score = Math.max(0, score);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const status = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  return { score, grade, status, details };
}

function scoreAgingRisk(): CategoryHealth {
  let score = 100;
  const details: string[] = [];

  // Aging concentration (healthy: 60%+ in 0-30 days)
  if (agingHealthy < 30) { score -= 30; details.push("Only " + agingHealthy + "% of AR in healthy 0-30 day range (target >60%)"); }
  else if (agingHealthy < 50) { score -= 20; details.push(agingHealthy + "% in 0-30 days — inverted aging pyramid"); }
  else if (agingHealthy < 60) { score -= 10; details.push(agingHealthy + "% in 0-30 days — below target"); }

  // Overdue density by count (target <50%)
  if (overdueInvoiceDensityData.count > 80) { score -= 25; details.push(overdueInvoiceDensityData.count + "% of invoices overdue by count — extremely high"); }
  else if (overdueInvoiceDensityData.count > 50) { score -= 15; details.push(overdueInvoiceDensityData.count + "% overdue by count"); }

  // Peak exposure days (target <30 days)
  if (peakOverdueExposureData.daysOverdue > 45) { score -= 20; details.push("Peak exposure at " + peakOverdueExposureData.daysOverdue + " days — nearing write-off zone"); }
  else if (peakOverdueExposureData.daysOverdue > 30) { score -= 10; details.push("Peak exposure at " + peakOverdueExposureData.daysOverdue + " days overdue"); }

  score = Math.max(0, score);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const status = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  return { score, grade, status, details };
}

function scoreOperational(): CategoryHealth {
  let score = 100;
  const details: string[] = [];

  // P90 cycle time (target <20 days)
  if (invoiceToCashData.p90 > 30) { score -= 20; details.push("P90 invoice-to-cash at " + invoiceToCashData.p90 + " days — long tail problem"); }
  else if (invoiceToCashData.p90 > 20) { score -= 10; details.push("P90 cycle time at " + invoiceToCashData.p90 + " days"); }

  // P50-P90 gap (target <10 days)
  const gap = invoiceToCashData.p90 - invoiceToCashData.p50;
  if (gap > 20) { score -= 15; details.push(gap + "-day P50-P90 gap indicates bimodal distribution"); }

  // Credit utilization (target 60-90%)
  if (creditPeriodUtilizationData.overall > 100) { score -= 20; details.push("Credit utilization at " + creditPeriodUtilizationData.overall + "% — customers paying beyond terms"); }
  else if (creditPeriodUtilizationData.overall > 95) { score -= 10; details.push("Credit utilization at " + creditPeriodUtilizationData.overall + "% — zero early payments"); }

  // Backlog (target <3 days)
  if (backlogLatest > 5) { score -= 20; details.push("Backlog at " + backlogLatest + " days and rising — team falling behind"); }
  else if (backlogLatest > 3) { score -= 10; details.push("Backlog at " + backlogLatest + " days (target <3)"); }

  score = Math.max(0, score);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const status = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  return { score, grade, status, details };
}

const execHealth = scoreExecutive();
const collHealth = scoreCollectionEfficiency();
const agingHealth = scoreAgingRisk();
const opsHealth = scoreOperational();
const overallScore = Math.round((execHealth.score + collHealth.score + agingHealth.score + opsHealth.score) / 4);
const overallGrade = overallScore >= 80 ? "A" : overallScore >= 60 ? "B" : overallScore >= 40 ? "C" : overallScore >= 20 ? "D" : "F";

// ---- KPI Knowledge Base ----
interface KPIEntry {
  keywords: string[];
  name: string;
  category: string;
  formula: string;
  situation: string;
}

const kpiKnowledgeBase: KPIEntry[] = [
  {
    keywords: ["dso", "days sales outstanding", "collection days", "how long to collect"],
    name: "Days Sales Outstanding (DSO)",
    category: "Executive",
    formula: "DSO = (Accounts Receivable / Total Credit Sales) x Number of Days",
    situation: `Current DSO: ${dsoData.overall} days overall. Monthly: Jan=${dsoData.monthly[0].value}, Feb=${dsoData.monthly[1].value}, Mar=${dsoData.monthly[2].value} days. Surged ${dsoMoM}% from Jan→Mar. The AR/Sales ratio is worsening monthly — billings outpace collections. At this trajectory, DSO breaches 45 days by Q2. The 65% aging concentration in 45-60 day buckets directly inflates this metric. Inversely related to Receivables Turnover (365/${receivablesTurnoverData.overall} ≈ 83 implied DSO).`,
  },
  {
    keywords: ["overdue", "overdue ratio", "past due", "late payments"],
    name: "Overdue Ratio",
    category: "Executive",
    formula: "Overdue Ratio = (Overdue Receivables / Total Receivables) x 100",
    situation: `Overdue Ratio: ${overdueRatioData.overall}% overall. Monthly: Jan=${overdueRatioData.monthly[0].value}%, Feb=${overdueRatioData.monthly[1].value}%, Mar=${overdueRatioData.monthly[2].value}%. Mirrors DSO trend — systemic, not isolated. Cross-reference: 91.7% overdue by count vs. 73.2% by value = many small invoices driving the problem. Target is <20%, currently 2x that threshold. Every 5pp reduction in overdue ratio improves DSO by ~2 days.`,
  },
  {
    keywords: ["revenue at risk", "revenue risk", "revenue jeopardy", "cash risk"],
    name: "Revenue at Risk",
    category: "Executive",
    formula: "Revenue at Risk = (Overdue AR for 45-60 day credit invoices / Total Revenue) x 100",
    situation: `Revenue at Risk: ${revenueAtRiskData.value}% — calculated for 45-60 day credit period invoices. Nearly 3 in 4 dollars may not convert to cash. This ties directly to aging: 65% of AR is in 45-60 day buckets, and credit period effectiveness for those terms is only 40.9-71.6%. With DSO at ${dsoData.overall} days and overdue at ${overdueRatioData.overall}%, a liquidity crunch could hit within 30 days. Total AR trapped in Q1: ${formatCurrency(totalARQ1)}.`,
  },
  {
    keywords: ["receivables turnover", "turnover ratio", "collection frequency", "how often collected"],
    name: "Receivables Turnover Ratio",
    category: "Executive",
    formula: "Receivables Turnover = Net Credit Sales / Average Accounts Receivable",
    situation: `Turnover: ${receivablesTurnoverData.overall}x overall. Monthly: Jan=${receivablesTurnoverData.monthly[0].value}x, Feb=${receivablesTurnoverData.monthly[1].value}x, Mar=${receivablesTurnoverData.monthly[2].value}x. Declined ${turnoverDecline}% in Q1. At Mar's 1.0x, AR is collected only once per period — far below 5-8x benchmark. Inverse relationship: 365/${receivablesTurnoverData.overall}x = ~83 implied DSO. Mar's 1.0x means AR grows as fast as sales — collections capacity is overwhelmed.`,
  },
  {
    keywords: ["net ar", "ar movement", "accounts receivable movement", "receivable balance", "waterfall", "cash trapped"],
    name: "Net AR Movement",
    category: "Executive",
    formula: "Net AR Movement = AR End of Period - AR Start of Period",
    situation: `Q1 Movement: Jan=${formatCurrency(netARMovementData.monthly[0].value)}, Feb=${formatCurrency(netARMovementData.monthly[1].value)}, Mar=${formatCurrency(netARMovementData.monthly[2].value)}. Total: ${formatCurrency(totalARQ1)} trapped in AR. The Feb dip was likely a one-time payment, not improved collections (Mar rebounded). At this run rate, ~${formatCurrency(totalARQ1 * 4)} could be stuck annually. Each month AR stays uncollected costs ~1% in working capital financing.`,
  },
  {
    keywords: ["cei", "collection effectiveness index", "collection index"],
    name: "Collection Effectiveness Index (CEI)",
    category: "Collection Efficiency",
    formula: "CEI = (Beginning AR + Credit Sales - Ending Total AR) / (Beginning AR + Credit Sales - Ending Current AR) x 100",
    situation: `CEI: ${ceiData.overall}% overall. Monthly: Jan=${ceiData.monthly[0].value}%, Feb=${ceiData.monthly[1].value}%, Mar=${ceiData.monthly[2].value}%. The overall masks a ${ceiDecline}pp monthly decline (Feb→Mar). Mar's ${ceiData.monthly[2].value}% approaches the 80% restructuring threshold. If the ~5.6pp/month decline continues, CEI falls below 75% by May. The formula shows ending total AR is growing faster than collections (numerator shrinks while denominator stays stable).`,
  },
  {
    keywords: ["on time", "on-time payment", "timely payment", "payment rate", "paid on time"],
    name: "On-Time Payment Rate",
    category: "Collection Efficiency",
    formula: "On-Time Rate = (Invoices Paid Within Credit Terms / Total Invoices Due) x 100",
    situation: `Weekly range: ${Math.min(...onTimePaymentData.weekly.map(w => w.value))}-${Math.max(...onTimePaymentData.weekly.map(w => w.value))}%. Average: ${avgOnTime}% (target >85%). Only ${weeksAboveTarget} of 12 weeks exceeded target. W12-W13 hit 100% (quarter-end push), but this is anomalous. High volatility (σ≈17%) indicates inconsistent dunning cadence. This measures customer payment behavior — contrast with collection effectiveness (team effort) at only ${avgCollEff}%.`,
  },
  {
    keywords: ["weekly collection", "collection weekly", "weekly effectiveness", "collection effort", "team performance"],
    name: "Collection Effectiveness (Weekly)",
    category: "Collection Efficiency",
    formula: "Weekly Effectiveness = (Amount Collected / Amount Due) x 100",
    situation: `Average: ${avgCollEff}% — critically below 70% target. Paradox: On-Time Payment hit 100% in W12-W13, but collection effectiveness was only 54% and 38%. This means payments came in passively (customer-initiated), not from active effort. The team is reactive, not proactive. W11 crash to 19% may indicate staffing gaps. The ${avgOnTime}% on-time vs ${avgCollEff}% effectiveness gap proves the collections team underperforms even when customers are willing to pay.`,
  },
  {
    keywords: ["credit period", "credit period effectiveness", "credit term", "credit bucket", "collection period"],
    name: "Credit Period Effectiveness",
    category: "Collection Efficiency",
    formula: "CP Effectiveness = (Collected Within Credit Period / Total Due for Credit Period) x 100",
    situation: `By term: ${collectionPeriodEffectivenessData.data.map(d => `${d.creditPeriod}: ${d.value}%`).join(", ")}. The 30pp gap between short-term (39-41%) and 60-day (71.6%) reveals: larger 60-day accounts have dedicated AP teams and pay reliably. The ~40% rate on 7-30 day terms means 60% goes overdue — directly feeding the 65% aging concentration in 45-60 day buckets. Fixing short-term collections alone could reduce overdue ratio by ~15pp.`,
  },
  {
    keywords: ["aging", "aging bucket", "aging distribution", "how old", "invoice age"],
    name: "Aging Bucket Distribution",
    category: "Aging & Risk",
    formula: "Bucket % = (AR in Bucket / Total AR) x 100",
    situation: `Distribution: ${agingBucketData.data.map(d => `${d.bucket}: ${d.percentage}%`).join(", ")}. Inverted pyramid: only ${agingHealthy}% in 0-30 days vs ${agingRisky}% in 45-60 days. A healthy portfolio is the reverse (60%+ in 0-30). The 45-day bucket (34%) is the critical intervention point — these invoices are transitioning from 'late' to 'at risk'. Moving 10% from 45→30 day bucket would improve DSO by ~4 days and reduce revenue at risk by ~10pp.`,
  },
  {
    keywords: ["overdue density", "overdue invoice", "invoice count", "invoice value split", "density", "count vs value"],
    name: "Overdue Invoice Density",
    category: "Aging & Risk",
    formula: "Count Density = (Overdue Count / Total Count) x 100 | Value Density = (Overdue Value / Total Value) x 100",
    situation: `Count: ${overdueInvoiceDensityData.count}%, Value: ${overdueInvoiceDensityData.value}%. The ${(overdueInvoiceDensityData.count - overdueInvoiceDensityData.value).toFixed(1)}pp gap is diagnostic: many small invoices (91.7% by count) vs. fewer large ones (73.2% by value). Large accounts (26.8% of value) pay more reliably. Strategy: automate small invoice collections (reduce the count %), focus human effort on the value % — especially the ${formatCurrency(peakOverdueExposureData.amount)} peak exposure.`,
  },
  {
    keywords: ["peak exposure", "largest overdue", "biggest invoice", "highest risk", "peak overdue", "single invoice"],
    name: "Peak Overdue Exposure",
    category: "Aging & Risk",
    formula: "Peak Exposure = MAX(Individual Overdue Invoice Amounts)",
    situation: `Invoice #${peakOverdueExposureData.invoiceNo}: ${formatCurrency(peakOverdueExposureData.amount)}, Company ${peakOverdueExposureData.companyCode}, ${peakOverdueExposureData.daysOverdue} days overdue. At ${peakOverdueExposureData.daysOverdue} days, it sits at the DSO average (${dsoData.overall} days) — representative of systemic problems, not an outlier. Bad debt provision at 50% = ${formatCurrency(peakOverdueExposureData.amount * 0.5)} P&L impact. Needs CFO-to-CFO escalation before it crosses the 60-day threshold.`,
  },
  {
    keywords: ["invoice to cash", "cycle time", "p50", "p90", "how fast", "cash cycle", "median"],
    name: "Invoice to Cash Cycle Time",
    category: "Operational",
    formula: "I2C = Percentile of (Cash Receipt Date - Invoice Issue Date) across all invoices",
    situation: `P50=${invoiceToCashData.p50} days, P90=${invoiceToCashData.p90} days. The ${invoiceToCashData.p90 - invoiceToCashData.p50}-day gap reveals bimodal distribution: most clear fast, but ~10% get stuck. These stuck invoices feed the 45-60 day aging buckets (${agingRisky}% of AR) and inflate DSO from a theoretical ${invoiceToCashData.p50} to ${dsoData.overall} days. Reducing P90 to 20 days would: drop DSO to ~30 days, halve the 45-60 day aging concentration, and reduce revenue at risk by ~20pp.`,
  },
  {
    keywords: ["credit utilization", "credit period utilization", "payment timing", "paying late", "paying early", "early payment"],
    name: "Credit Period Utilization",
    category: "Operational",
    formula: "CPU = (Actual Payment Days / Allowed Credit Period Days) x 100",
    situation: `Overall: ${creditPeriodUtilizationData.overall}%. Monthly: Jan=${creditPeriodUtilizationData.monthly[0].value}%, Feb=${creditPeriodUtilizationData.monthly[1].value}%, Mar=${creditPeriodUtilizationData.monthly[2].value}%. Jan's 136.78% = paying 37% beyond terms. Trend improved ${cpuTrend.toFixed(0)}pp (Jan→Mar), but 98.3% overall = zero early payments. Offering 2/10 net 30 (2% discount for 10-day payment) could shift utilization below 50% and improve DSO by 15-20 days.`,
  },
  {
    keywords: ["backlog", "clear backlog", "days to clear", "overdue backlog", "collection capacity"],
    name: "Days to Clear Backlog",
    category: "Operational",
    formula: "Backlog Days = Overdue AR Balance / Average Daily Collection Rate",
    situation: `Latest: ${backlogLatest} days (W13). Trend: surged 3.5x in 3 weeks (W10: ${backlogMin} → W13: ${backlogLatest}). Target: <3 days. The overdue AR balance is growing 3.5x faster than collections can clear it. Correlates with weekly collection effectiveness dropping to 38% (W13) while 91.7% of invoices are overdue. At current trajectory, backlog reaches ~12 days by W16-W17, becoming unmanageable.`,
  },
];

// ---- Cross-KPI Intelligence Responses ----
interface CrossKPIEntry {
  keywords: string[];
  name: string;
  response: string;
}

const crossKPIResponses: CrossKPIEntry[] = [
  {
    keywords: ["liquidity", "cash flow", "cash position", "cash crunch", "working capital risk"],
    name: "Liquidity & Cash Flow Risk",
    response: `**Liquidity Risk Assessment:**\n\nMultiple KPIs converge on a liquidity warning:\n• **${revenueAtRiskData.value}% revenue at risk** — 3 in 4 dollars may not convert\n• **${formatCurrency(totalARQ1)} trapped in AR** this quarter\n• **DSO at ${dsoData.overall} days** and rising (2→27 Jan-Mar)\n• **Receivables turnover at ${receivablesTurnoverData.monthly[2].value}x** in March (benchmark: 5-8x)\n\n**Formula linkage:** Revenue at Risk is directly proportional to the 45-60 day aging concentration (${agingRisky}%). Since Credit Period Utilization is ${creditPeriodUtilizationData.overall}% (customers use the full window), cash conversion is delayed to the maximum extent.\n\n**Projected timeline:** At current trajectory, a liquidity crunch could materialize within 30 days. CFO should evaluate working capital credit lines and contingency protocols.`,
  },
  {
    keywords: ["forecast", "projection", "predict", "next quarter", "q2", "what will happen", "trajectory"],
    name: "Q2 Projections",
    response: `**Q2 2026 Forecast Based on Q1 Trends:**\n\n• **DSO:** Rising at ~12.5 days/month → could reach **52 days by June** (from ${dsoData.overall} overall)\n• **CEI:** Declining ~5.6pp/month → **could fall below 75% by May**, triggering team restructuring\n• **Backlog:** Growing 3.5x in 3 weeks → **~12 days by W17**, becoming unmanageable\n• **Turnover:** At ${receivablesTurnoverData.monthly[2].value}x and falling → **could hit 0.7x**, meaning AR grows faster than sales\n• **Revenue at Risk:** If aging concentration worsens 5% → **could exceed 80%**\n• **AR trapped:** At Q1 run rate → **${formatCurrency(totalARQ1 * 4)} annually**\n\n**Critical milestone:** If DSO exceeds 45 days (likely by April), all 45-day credit period invoices automatically become overdue, creating a cascading effect on the aging distribution.`,
  },
  {
    keywords: ["root cause", "why", "what's causing", "reason", "diagnosis", "problem"],
    name: "Root Cause Analysis",
    response: `**Root Cause Diagnosis — Why KPIs Are Deteriorating:**\n\n**Primary causes (data-backed):**\n1. **Collection team is reactive, not proactive** — On-Time Payment (${avgOnTime}%) > Collection Effectiveness (${avgCollEff}%), meaning customers pay on their own but the team doesn't actively pursue. The ${(avgOnTime - avgCollEff).toFixed(1)}pp gap proves this.\n2. **Short-term credit period failure** — 7-30 day terms have only 39-41% effectiveness, meaning 60% of short-term invoices go overdue, feeding the 45-60 day aging buckets.\n3. **Feast-or-famine collections** — On-time payment swings 49-100% weekly (σ≈17%), indicating inconsistent dunning cadence.\n4. **Small invoice volume** — 91.7% overdue by count vs 73.2% by value = many small invoices clogging the pipeline and are not being actively collected.\n\n**Root cause chain:** Inconsistent collections → short-term invoices go overdue → flow into 45-60 day aging → inflate DSO, overdue ratio, and revenue at risk → reduce turnover → trap cash in AR.`,
  },
  {
    keywords: ["action", "recommend", "what should", "fix", "improve", "solution", "strategy", "what to do", "priority"],
    name: "Recommended Actions",
    response: `**Priority Action Plan (Ranked by Impact):**\n\n**Immediate (This Week):**\n1. **Escalate Invoice #${peakOverdueExposureData.invoiceNo}** — ${formatCurrency(peakOverdueExposureData.amount)} at ${peakOverdueExposureData.daysOverdue} days. CFO-to-CFO call. Consider 50% provision.\n2. **Implement daily dunning** for all 30+ day invoices — current weekly cadence creates feast-or-famine cycles.\n\n**Short-term (30 days):**\n3. **Automate small invoice collections** — 91.7% of overdue invoices by count are small. Auto-reminders at Day 1, 7, 15 would reduce count by ~40%.\n4. **Set weekly collection targets** — Current ${avgCollEff}% avg needs to reach 70%. Assign individual collector quotas.\n5. **Launch 2/10 net 30 early payment discount** — Currently 98.3% credit utilization with zero early payments.\n\n**Medium-term (60-90 days):**\n6. **Restructure credit terms** for 7-30 day segment — only 39-41% effectiveness. Consider tighter terms or deposits for high-risk accounts.\n7. **Review credit policies** for 45-60 day customer segment — 65% of AR sits here.\n\n**Expected impact:** These actions could reduce DSO by 10-15 days, improve CEI by 10-15pp, and cut revenue at risk by 20pp within 60 days.`,
  },
  {
    keywords: ["compare", "benchmark", "industry", "vs industry", "how do we compare", "standard", "best practice"],
    name: "Industry Benchmark Comparison",
    response: `**KPI vs Industry Benchmarks:**\n\n| KPI | Current | Benchmark | Gap | Status |\n|-----|---------|-----------|-----|--------|\n| DSO | ${dsoData.overall} days | <30 days | +${dsoData.overall - 30} days | ⚠️ Above |\n| Overdue Ratio | ${overdueRatioData.overall}% | <20% | +${overdueRatioData.overall - 20}pp | ⚠️ 2x target |\n| Turnover | ${receivablesTurnoverData.overall}x | 5-8x | -${(5 - receivablesTurnoverData.overall).toFixed(1)}x | ⚠️ Below |\n| CEI | ${ceiData.overall}% (${ceiData.monthly[2].value}% latest) | >90% | -${(90 - ceiData.monthly[2].value).toFixed(1)}pp latest | ⚠️ Declining |\n| On-Time Rate | ${avgOnTime}% avg | >85% | -${(85 - avgOnTime).toFixed(1)}pp | ⚠️ Below |\n| P50 Cycle | ${invoiceToCashData.p50} days | <10 days | ✅ Within | ✅ Good |\n| P90 Cycle | ${invoiceToCashData.p90} days | <20 days | +${invoiceToCashData.p90 - 20} days | ⚠️ Above |\n| Aging 0-30d | ${agingHealthy}% | >60% | -${60 - agingHealthy}pp | ⚠️ Inverted |\n\n**Bright spot:** P50 invoice-to-cash at ${invoiceToCashData.p50} days is excellent — the majority of invoices clear quickly. The problem is the long tail (P90) and inactive collection of the stuck invoices.`,
  },
  {
    keywords: ["formula", "how is it calculated", "calculation", "how do you calculate", "methodology", "how computed"],
    name: "KPI Formulas Reference",
    response: `**KPI Formulas & Calculation Logic:**\n\n**Executive KPIs:**\n• **DSO** = (AR / Total Credit Sales) × Days\n• **Overdue Ratio** = (Overdue AR / Total AR) × 100\n• **Revenue at Risk** = (Overdue AR for 45-60 day credit invoices / Total Revenue) × 100\n• **Receivables Turnover** = Net Credit Sales / Avg AR (inverse: 365/Turnover ≈ DSO)\n• **Net AR Movement** = AR End of Period − AR Start of Period\n\n**Collection Efficiency:**\n• **CEI** = (Beg AR + Credit Sales − End Total AR) / (Beg AR + Credit Sales − End Current AR) × 100\n• **On-Time Rate** = (Invoices Paid Within Terms / Total Due) × 100\n• **Weekly Effectiveness** = (Amount Collected / Amount Due) × 100\n• **Credit Period Effectiveness** = (Collected Within Credit Period / Total Due for Period) × 100\n\n**Aging & Risk:**\n• **Bucket %** = (AR in Bucket / Total AR) × 100\n• **Density (Count)** = (Overdue Count / Total Count) × 100\n• **Density (Value)** = (Overdue Value / Total Value) × 100\n• **Peak Exposure** = MAX(Individual Overdue Invoice Amounts)\n\n**Operational:**\n• **I2C Cycle** = Percentile of (Cash Receipt − Invoice Issue) across all invoices\n• **Credit Utilization** = (Actual Payment Days / Allowed Days) × 100\n• **Backlog Days** = Overdue AR Balance / Avg Daily Collection Rate`,
  },
  {
    keywords: ["bad debt", "write off", "provision", "allowance", "default", "uncollectible"],
    name: "Bad Debt & Provisioning Analysis",
    response: `**Bad Debt Risk Assessment:**\n\n**Current exposure by aging bucket:**\n• 45-day bucket (34% of AR): Industry provision rate = 5-10% → Estimated provision: 3.4-6.8% of total AR\n• 60-day bucket (31% of AR): Industry provision rate = 15-25% → Estimated provision: 4.7-7.8% of total AR\n• **Total recommended provision: 8-15% of total AR**\n\n**Peak exposure:** Invoice #${peakOverdueExposureData.invoiceNo} at ${formatCurrency(peakOverdueExposureData.amount)} (${peakOverdueExposureData.daysOverdue} days overdue). At 50% provision: ${formatCurrency(peakOverdueExposureData.amount * 0.5)} P&L impact.\n\n**Risk indicators:**\n• ${overdueInvoiceDensityData.count}% overdue by count = wide spread of potential defaults\n• ${agingRisky}% in 45-60 day buckets = concentration risk\n• Collection effectiveness at ${avgCollEff}% = team may not recover much\n\n**Recommendation:** Provision 10% of total AR as allowance for doubtful accounts. Specific provision for peak exposure invoice at 50%.`,
  },
  {
    keywords: ["team", "collector", "staff", "headcount", "capacity", "manpower", "resource"],
    name: "Collections Team Assessment",
    response: `**Collections Team Performance Assessment:**\n\n**Evidence of underperformance:**\n• Weekly collection effectiveness: ${avgCollEff}% avg (target 70%) — team collects less than half of what's due\n• On-time payment: ${avgOnTime}% avg — customers pay at higher rate than team collects, proving the issue is effort, not customer willingness\n• The ${(avgOnTime - avgCollEff).toFixed(1)}pp gap between customer payment and team effectiveness = lost opportunity\n• Backlog growing 3.5x in 3 weeks (${backlogMin}→${backlogLatest} days) = team falling further behind\n\n**Key issue:** Team is reactive (waiting for payments) not proactive (pursuing collections). Evidence: W12-W13 on-time hit 100% but effectiveness was 54%/38%.\n\n**Recommendations:**\n1. Set individual collector daily targets (not weekly)\n2. Implement morning standup with aging review\n3. Automate the small invoice tail (91.7% by count) to free capacity\n4. If effectiveness doesn't improve to 60%+ within 30 days, evaluate headcount increase`,
  },
  {
    keywords: ["cfo", "board", "board report", "executive summary", "management", "leadership", "c-suite"],
    name: "CFO / Board Report",
    response: `**CFO Executive Brief — Q1 2026 Working Capital**\n\n**Overall Health: Grade ${overallGrade} (${overallScore}/100)**\n\n**Traffic Light Summary:**\n• 🔴 Executive KPIs: ${execHealth.grade} (${execHealth.score}/100) — ${execHealth.status}\n• 🟡 Collection Efficiency: ${collHealth.grade} (${collHealth.score}/100) — ${collHealth.status}\n• 🔴 Aging & Risk: ${agingHealth.grade} (${agingHealth.score}/100) — ${agingHealth.status}\n• 🟡 Operational: ${opsHealth.grade} (${opsHealth.score}/100) — ${opsHealth.status}\n\n**Key numbers:** DSO ${dsoData.overall}d | Overdue ${overdueRatioData.overall}% | Revenue at Risk ${revenueAtRiskData.value}% | ${formatCurrency(totalARQ1)} trapped in AR\n\n**Critical risk:** Liquidity crunch within 30 days if collections don't improve. Revenue at risk at ${revenueAtRiskData.value}% on 45-60 day invoices.\n\n**3 board-level decisions needed:**\n1. Approve working capital contingency credit line\n2. Authorize early payment discount program (2/10 net 30)\n3. Decision on collections team restructuring (CEI trending toward 75% trigger)`,
  },
  {
    keywords: ["discount", "early payment", "incentive", "2/10", "payment terms", "terms restructure"],
    name: "Early Payment Discount Analysis",
    response: `**Early Payment Discount Impact Analysis:**\n\n**Current state:** Credit utilization at ${creditPeriodUtilizationData.overall}% — customers use the full credit window. Zero early payments.\n\n**Proposed: 2/10 Net 30 (2% discount for payment within 10 days)**\n\n**Projected impact if 30% of customers adopt:**\n• DSO reduction: ~15-20 days (from ${dsoData.overall} to ~20-25 days)\n• Credit utilization: drops from ${creditPeriodUtilizationData.overall}% to ~60%\n• Overdue ratio: could halve from ${overdueRatioData.overall}% to ~20%\n• Revenue at risk: drop from ${revenueAtRiskData.value}% to ~45%\n\n**Cost:** 2% discount on ~30% of revenue = 0.6% of total revenue\n**Benefit:** Reduced financing costs (~1% monthly on trapped AR of ${formatCurrency(totalARQ1)}) + reduced bad debt provisioning\n\n**Net benefit: Positive within 60 days.** The financing cost savings alone (${formatCurrency(totalARQ1 * 0.01)}/month) exceed the discount cost.`,
  },
];

// ---- Health Report ----
const healthReport = `**System Health Scorecard — Q1 2026**\n\n**Overall: Grade ${overallGrade} (${overallScore}/100)**\n\n` +
  `**1. Executive KPIs: ${execHealth.grade} (${execHealth.score}/100) — ${execHealth.status}**\n${execHealth.details.map(d => "• " + d).join("\n")}\n\n` +
  `**2. Collection Efficiency: ${collHealth.grade} (${collHealth.score}/100) — ${collHealth.status}**\n${collHealth.details.map(d => "• " + d).join("\n")}\n\n` +
  `**3. Aging & Risk: ${agingHealth.grade} (${agingHealth.score}/100) — ${agingHealth.status}**\n${agingHealth.details.map(d => "• " + d).join("\n")}\n\n` +
  `**4. Operational: ${opsHealth.grade} (${opsHealth.score}/100) — ${opsHealth.status}**\n${opsHealth.details.map(d => "• " + d).join("\n")}\n\n` +
  `**Highest priority:** ${execHealth.score <= collHealth.score && execHealth.score <= agingHealth.score && execHealth.score <= opsHealth.score ? "Executive KPIs" : agingHealth.score <= collHealth.score && agingHealth.score <= opsHealth.score ? "Aging & Risk" : collHealth.score <= opsHealth.score ? "Collection Efficiency" : "Operational"} category needs immediate attention.`;

// ---- Overall Summary ----
const overallSummary = `**Q1 2026 Working Capital Health — Grade ${overallGrade} (${overallScore}/100)**\n\n` +
  `**Category Scores:**\n` +
  `• Executive KPIs: **${execHealth.grade}** (${execHealth.score}/100) — ${execHealth.status}\n` +
  `• Collection Efficiency: **${collHealth.grade}** (${collHealth.score}/100) — ${collHealth.status}\n` +
  `• Aging & Risk: **${agingHealth.grade}** (${agingHealth.score}/100) — ${agingHealth.status}\n` +
  `• Operational: **${opsHealth.grade}** (${opsHealth.score}/100) — ${opsHealth.status}\n\n` +
  `**Key Metrics:** DSO ${dsoData.overall}d | Overdue ${overdueRatioData.overall}% | Revenue at Risk ${revenueAtRiskData.value}% | CEI ${ceiData.overall}% (↓${ceiDecline}pp) | Turnover ${receivablesTurnoverData.overall}x | AR Trapped: ${formatCurrency(totalARQ1)}\n\n` +
  `**Top 3 Actions:**\n` +
  `1. Escalate peak exposure (${formatCurrency(peakOverdueExposureData.amount)}, ${peakOverdueExposureData.daysOverdue} days overdue)\n` +
  `2. Fix feast-or-famine collections — team effectiveness at ${avgCollEff}% vs ${avgOnTime}% customer willingness\n` +
  `3. Automate small invoice collections (91.7% overdue by count) and launch early payment discounts`;

// ---- Main Query Engine ----
export function getChatResponse(query: string): string {
  const q = query.toLowerCase().trim();

  // Health / scorecard queries
  if (q.includes("health") || q.includes("scorecard") || q.includes("score") || q.includes("grade") || q.includes("rating")) {
    return healthReport;
  }

  // General / summary questions
  const generalKeywords = [
    "overall", "summary", "how are we doing", "situation",
    "dashboard", "everything", "all kpi", "what's happening", "tell me",
    "status", "overview", "general", "what is the current",
    "working capital", "receivables health",
  ];
  if (generalKeywords.some((k) => q.includes(k)) || q.length < 10) {
    return overallSummary;
  }

  // Cross-KPI queries — check before individual KPIs
  let bestCross: CrossKPIEntry | null = null;
  let bestCrossScore = 0;
  for (const entry of crossKPIResponses) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.split(" ").length;
    }
    if (score > bestCrossScore) {
      bestCrossScore = score;
      bestCross = entry;
    }
  }
  if (bestCross && bestCrossScore >= 2) {
    return `**${bestCross.name}**\n\n${bestCross.response}`;
  }

  // Category-level questions
  if (q.includes("executive") || (q.includes("c-suite") && !q.includes("report"))) {
    const execs = kpiKnowledgeBase.filter((k) => k.category === "Executive");
    return `**Executive KPIs — Grade ${execHealth.grade} (${execHealth.score}/100) — ${execHealth.status}**\n\n${execs.map((k) => `**${k.name}:**\n_Formula: ${k.formula}_\n${k.situation}`).join("\n\n")}`;
  }
  if (q.includes("collection") && (q.includes("efficiency") || q.includes("section") || q.includes("all"))) {
    const cols = kpiKnowledgeBase.filter((k) => k.category === "Collection Efficiency");
    return `**Collection Efficiency — Grade ${collHealth.grade} (${collHealth.score}/100) — ${collHealth.status}**\n\n${cols.map((k) => `**${k.name}:**\n_Formula: ${k.formula}_\n${k.situation}`).join("\n\n")}`;
  }
  if (q.includes("aging") || (q.includes("risk") && !q.includes("revenue"))) {
    const risks = kpiKnowledgeBase.filter((k) => k.category === "Aging & Risk");
    return `**Aging & Risk — Grade ${agingHealth.grade} (${agingHealth.score}/100) — ${agingHealth.status}**\n\n${risks.map((k) => `**${k.name}:**\n_Formula: ${k.formula}_\n${k.situation}`).join("\n\n")}`;
  }
  if (q.includes("operational") || q.includes("process")) {
    const ops = kpiKnowledgeBase.filter((k) => k.category === "Operational");
    return `**Operational — Grade ${opsHealth.grade} (${opsHealth.score}/100) — ${opsHealth.status}**\n\n${ops.map((k) => `**${k.name}:**\n_Formula: ${k.formula}_\n${k.situation}`).join("\n\n")}`;
  }

  // Cross-KPI with lower threshold
  if (bestCross && bestCrossScore > 0) {
    return `**${bestCross.name}**\n\n${bestCross.response}`;
  }

  // Specific KPI matching
  let bestMatch: KPIEntry | null = null;
  let bestScore = 0;
  for (const entry of kpiKnowledgeBase) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.split(" ").length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  if (bestMatch && bestScore > 0) {
    return `**${bestMatch.name}** _(${bestMatch.category})_\n\n_Formula: ${bestMatch.formula}_\n\n${bestMatch.situation}`;
  }

  // Fallback — word match
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  for (const entry of kpiKnowledgeBase) {
    for (const kw of entry.keywords) {
      for (const word of words) {
        if (kw.includes(word) || word.includes(kw)) {
          return `**${entry.name}** _(${entry.category})_\n\n_Formula: ${entry.formula}_\n\n${entry.situation}`;
        }
      }
    }
  }
  for (const entry of crossKPIResponses) {
    for (const kw of entry.keywords) {
      for (const word of words) {
        if (kw.includes(word) || word.includes(kw)) {
          return `**${entry.name}**\n\n${entry.response}`;
        }
      }
    }
  }

  return `I can answer questions about:\n\n**KPIs:** DSO, Overdue Ratio, Revenue at Risk, Turnover, Net AR, CEI, On-Time Payment, Collection Effectiveness, Credit Period, Aging, Overdue Density, Peak Exposure, Invoice-to-Cash, Credit Utilization, Backlog\n\n**Analysis:** Health scorecard, Root cause, Forecasts, Benchmarks, Actions, Bad debt, Team performance, CFO report, Early payment discounts, Formulas\n\nTry: *"What's the system health?"* or *"Give me the CFO report"* or *"What are the formulas?"*`;
}

// 20 suggested questions — mix of operational and C-suite
export const suggestedQuestions = [
  "What's the system health score?",
  "Give me the CFO executive brief",
  "What are the KPI formulas?",
  "What's causing the deterioration?",
  "What actions should we take?",
  "How do we compare to industry benchmarks?",
  "What's the liquidity risk?",
  "What's the Q2 forecast?",
  "How is the collections team performing?",
  "Should we offer early payment discounts?",
  "What's the bad debt provision estimate?",
  "How is DSO trending?",
  "Why is revenue at risk so high?",
  "Tell me about the aging distribution",
  "What's the peak overdue exposure?",
  "Why is collection effectiveness so low?",
  "What's the invoice-to-cash cycle time?",
  "How is credit period utilization?",
  "What's the backlog situation?",
  "What's the overdue count vs value gap?",
];
