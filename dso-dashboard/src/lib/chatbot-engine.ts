// ============================================================
// CHATBOT ENGINE — Rule-based, formula-aware, health-scored
// Direct query mapping + fuzzy keyword fallback
// No external AI — all responses derived from dashboard data
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
const agingHealthy = agingBucketData.data.filter(d => ["7 days", "15 days", "30 days"].includes(d.bucket)).reduce((s, d) => s + d.percentage, 0);
const agingRisky = agingBucketData.data.filter(d => ["45 days", "60 days"].includes(d.bucket)).reduce((s, d) => s + d.percentage, 0);

// ---- Health Scoring ----
function calcScore(deductions: number[]): { score: number; grade: string; status: string } {
  const score = Math.max(0, 100 - deductions.reduce((a, b) => a + b, 0));
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const status = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  return { score, grade, status };
}

const execHealth = calcScore([
  dsoData.overall > 40 ? 20 : dsoData.overall > 30 ? 10 : 0,
  overdueRatioData.overall > 40 ? 25 : overdueRatioData.overall > 30 ? 15 : 0,
  revenueAtRiskData.value > 70 ? 25 : revenueAtRiskData.value > 50 ? 15 : 0,
  receivablesTurnoverData.overall < 2 ? 20 : receivablesTurnoverData.overall < 5 ? 10 : 0,
]);
const collHealth = calcScore([
  ceiData.monthly[2].value < 80 ? 25 : ceiData.monthly[2].value < 85 ? 15 : 0,
  avgOnTime < 70 ? 20 : avgOnTime < 85 ? 10 : 0,
  avgCollEff < 50 ? 25 : avgCollEff < 70 ? 15 : 0,
]);
const agingHealth = calcScore([
  agingHealthy < 30 ? 30 : agingHealthy < 50 ? 20 : 0,
  overdueInvoiceDensityData.count > 80 ? 25 : overdueInvoiceDensityData.count > 50 ? 15 : 0,
  peakOverdueExposureData.daysOverdue > 45 ? 20 : peakOverdueExposureData.daysOverdue > 30 ? 10 : 0,
]);
const opsHealth = calcScore([
  invoiceToCashData.p90 > 30 ? 20 : invoiceToCashData.p90 > 20 ? 10 : 0,
  (invoiceToCashData.p90 - invoiceToCashData.p50) > 20 ? 15 : 0,
  creditPeriodUtilizationData.overall > 95 ? 10 : 0,
  backlogLatest > 5 ? 20 : backlogLatest > 3 ? 10 : 0,
]);
const overallScore = Math.round((execHealth.score + collHealth.score + agingHealth.score + opsHealth.score) / 4);
const overallGrade = overallScore >= 80 ? "A" : overallScore >= 60 ? "B" : overallScore >= 40 ? "C" : overallScore >= 20 ? "D" : "F";

// ---- Text-based visualization helpers ----
function bar(value: number, max: number = 100): string {
  const filled = Math.round((value / max) * 10);
  return `[${"█".repeat(filled)}${"░".repeat(10 - filled)}] ${value}%`;
}

// ============================================================
// RESPONSE BANK — Each of the 20 queries has a pre-built response
// ============================================================

const responses: Record<string, string> = {

// ---- 1. System Health Score ----
health: `**System Health: Grade ${overallGrade} (${overallScore}/100)**

**Executive KPIs** (${execHealth.grade}) ${bar(execHealth.score)}
**Collection Efficiency** (${collHealth.grade}) ${bar(collHealth.score)}
**Aging & Risk** (${agingHealth.grade}) ${bar(agingHealth.score)}
**Operational** (${opsHealth.grade}) ${bar(opsHealth.score)}

**Weakest area:** ${execHealth.score <= Math.min(collHealth.score, agingHealth.score, opsHealth.score) ? "Executive KPIs — DSO, overdue ratio, and revenue at risk all in warning zone" : agingHealth.score <= Math.min(collHealth.score, opsHealth.score) ? "Aging & Risk — inverted aging pyramid with 65% in 45-60 day buckets" : collHealth.score <= opsHealth.score ? "Collection Efficiency — team effectiveness at " + avgCollEff + "% vs 70% target" : "Operational — backlog at " + backlogLatest + " days and rising"}.`,

// ---- 2. CFO Executive Brief ----
cfo: `**CFO Executive Brief — Q1 2026**

**Overall: Grade ${overallGrade} (${overallScore}/100)**
🔴 Executive: ${execHealth.grade} | 🟡 Collections: ${collHealth.grade} | 🔴 Aging: ${agingHealth.grade} | 🟡 Operational: ${opsHealth.grade}

**Key numbers:** DSO ${dsoData.overall}d (↑13.5x Q1) | Overdue ${overdueRatioData.overall}% | Revenue at Risk ${revenueAtRiskData.value}% | AR trapped: ${formatCurrency(totalARQ1)}

**Critical risks:**
• Liquidity crunch possible within 30 days — ${revenueAtRiskData.value}% of revenue in jeopardy
• CEI trending from 91.7% → 80.4% — approaching 75% restructuring trigger
• Peak exposure: ${formatCurrency(peakOverdueExposureData.amount)} single invoice at ${peakOverdueExposureData.daysOverdue} days

**3 decisions needed:**
1. Approve working capital contingency credit line
2. Authorize 2/10 net 30 early payment discount program
3. Decide on collections team restructuring (CEI approaching trigger)`,

// ---- 3. KPI Formulas ----
formulas: `**KPI Calculation Formulas:**

**Executive:**
• **DSO** = (AR / Total Credit Sales) x Days
• **Overdue Ratio** = (Overdue AR / Total AR) x 100
• **Revenue at Risk** = (Overdue AR for 45-60 day invoices / Total Revenue) x 100
• **Receivables Turnover** = Net Credit Sales / Avg AR
• **Net AR Movement** = AR End − AR Start of Period

**Collection Efficiency:**
• **CEI** = (Beg AR + Credit Sales − End Total AR) / (Beg AR + Credit Sales − End Current AR) x 100
• **On-Time Rate** = (Paid Within Terms / Total Due) x 100
• **Weekly Effectiveness** = (Amount Collected / Amount Due) x 100
• **Credit Period Effectiveness** = (Collected Within Period / Total Due for Period) x 100

**Aging & Risk:**
• **Bucket %** = (AR in Bucket / Total AR) x 100
• **Overdue Density** = Count or Value of overdue / Total x 100
• **Peak Exposure** = MAX(Individual Overdue Amounts)

**Operational:**
• **Invoice-to-Cash** = Percentile of (Cash Receipt − Invoice Date)
• **Credit Utilization** = (Actual Payment Days / Allowed Days) x 100
• **Backlog Days** = Overdue AR / Avg Daily Collection Rate`,

// ---- 4. Root Cause Analysis ----
rootCause: `**Root Cause — Why KPIs Are Deteriorating:**

**1. Reactive collections team** — On-time payment avg ${avgOnTime}% but collection effectiveness only ${avgCollEff}%. The ${(avgOnTime - avgCollEff).toFixed(0)}pp gap proves customers pay voluntarily but the team doesn't actively pursue.

**2. Short-term credit period failure** — 7-30 day terms have only 39-41% collection effectiveness. 60% of short-term invoices go overdue, feeding the 45-60 day aging buckets.

**3. Feast-or-famine dunning** — On-time payment swings 49-100% weekly. No consistent cadence.

**4. Small invoice volume** — 91.7% overdue by count vs 73.2% by value. Many small invoices clog the pipeline without being pursued.

**Cause chain:** Inconsistent collections → short-term invoices go overdue → flow into 45-60 day aging → inflate DSO & overdue ratio → trap cash in AR → revenue at risk rises.`,

// ---- 5. Recommended Actions ----
actions: `**Priority Action Plan:**

**This week:**
1. Escalate Invoice #${peakOverdueExposureData.invoiceNo} (${formatCurrency(peakOverdueExposureData.amount)}, ${peakOverdueExposureData.daysOverdue}d overdue) — CFO-to-CFO call
2. Start daily dunning for all 30+ day invoices (current weekly cadence creates volatility)

**Within 30 days:**
3. Automate small invoice collections — 91.7% overdue by count are small; auto-reminders at Day 1, 7, 15 could cut count by 40%
4. Set individual collector weekly targets — current ${avgCollEff}% avg must reach 70%
5. Launch 2/10 net 30 early payment discount — credit utilization is ${creditPeriodUtilizationData.overall}% with zero early payments

**Within 60-90 days:**
6. Restructure credit terms for 7-30 day segment (only 39-41% effectiveness)
7. Review credit policies for 45-60 day customer segment (65% of AR)

**Expected impact:** DSO −10-15 days, CEI +10-15pp, revenue at risk −20pp within 60 days.`,

// ---- 6. Industry Benchmarks ----
benchmarks: `**Current vs Industry Benchmarks:**

**DSO** (target <30d): ${bar(Math.min(dsoData.overall, 100))} → ${dsoData.overall}d ⚠️
**Overdue Ratio** (target <20%): ${bar(overdueRatioData.overall)} ⚠️
**CEI** (target >90%): ${bar(ceiData.monthly[2].value)} → ${ceiData.monthly[2].value}% latest ⚠️
**On-Time Rate** (target >85%): ${bar(avgOnTime)} ⚠️
**Aging 0-30d** (target >60%): ${bar(agingHealthy)} ⚠️
**P50 Cycle** (target <10d): ${bar(Math.round(invoiceToCashData.p50 / 30 * 100))} → ${invoiceToCashData.p50}d ✅
**P90 Cycle** (target <20d): ${bar(Math.round(invoiceToCashData.p90 / 60 * 100))} → ${invoiceToCashData.p90}d ⚠️

**Bright spot:** P50 of ${invoiceToCashData.p50} days is excellent — most invoices clear fast. The problem is the stuck 10% (P90) dragging everything else.`,

// ---- 7. Liquidity Risk ----
liquidity: `**Liquidity Risk Assessment:**

**Converging warning signals:**
• ${revenueAtRiskData.value}% revenue at risk on 45-60 day invoices
• ${formatCurrency(totalARQ1)} trapped in AR this quarter (Q1)
• DSO at ${dsoData.overall} days and surging (2 → 27, Jan-Mar)
• Receivables turnover at ${receivablesTurnoverData.monthly[2].value}x in March (benchmark: 5-8x)

**Why it matters:** Revenue at risk ties directly to aging — ${agingRisky}% of AR sits in 45-60 day buckets. Credit utilization at ${creditPeriodUtilizationData.overall}% means customers use the full window, delaying cash conversion maximally.

**Timeline:** At current trajectory, a cash crunch could materialize within 30 days. At Q1 run rate, ~${formatCurrency(totalARQ1 * 4)} stays trapped in AR annually.

**Action:** CFO should evaluate working capital credit lines and contingency protocols immediately.`,

// ---- 8. Q2 Forecast ----
forecast: `**Q2 2026 Forecast (based on Q1 trends):**

• **DSO:** Rising ~12.5 days/month → **could reach 52 days by June** (from ${dsoData.overall})
• **CEI:** Declining ~5.6pp/month → **below 75% by May** (restructuring trigger)
• **Backlog:** Growing 3.5x per 3 weeks → **~12 days by W17** (unmanageable)
• **Turnover:** At ${receivablesTurnoverData.monthly[2].value}x and falling → **could hit 0.7x** (AR grows faster than sales)
• **Revenue at Risk:** If aging worsens 5% → **could exceed 80%**
• **AR trapped:** At Q1 run rate → **${formatCurrency(totalARQ1 * 4)} annually**

**Critical milestone:** When DSO exceeds 45 days (likely April), all 45-day credit invoices automatically become overdue — creating a cascading effect across aging, overdue ratio, and revenue at risk.`,

// ---- 9. Collections Team ----
team: `**Collections Team Assessment:**

**Performance gap:** On-time payment (${avgOnTime}%) > Collection effectiveness (${avgCollEff}%). The ${(avgOnTime - avgCollEff).toFixed(0)}pp gap means customers pay voluntarily but the team doesn't actively pursue.

**Evidence:**
• W12-W13: On-time hit 100%, but effectiveness was only 54% and 38% — payments were passive, not actively collected
• W11 effectiveness crashed to 19% — possible staffing gap
• Only ${weeksAboveTarget} of 12 weeks exceeded the 85% on-time target
• Backlog grew 3.5x in 3 weeks — team falling further behind

**Diagnosis:** The team is reactive (waiting), not proactive (pursuing).

**Fix:** Set daily individual targets, implement morning standups with aging review, automate small invoices (91.7% by count) to free capacity. If effectiveness doesn't reach 60% in 30 days, evaluate headcount.`,

// ---- 10. Early Payment Discounts ----
discounts: `**Early Payment Discount Analysis (2/10 Net 30):**

**Current state:** Credit utilization at ${creditPeriodUtilizationData.overall}% — zero early payments. Customers use the full credit window.

**If 30% of customers adopt 2/10 net 30:**
• DSO: ${dsoData.overall} → ~20-25 days (−15-20 days)
• Credit utilization: ${creditPeriodUtilizationData.overall}% → ~60%
• Overdue ratio: ${overdueRatioData.overall}% → ~20% (halved)
• Revenue at risk: ${revenueAtRiskData.value}% → ~45%

**Cost:** 2% discount on 30% of revenue = 0.6% total revenue
**Benefit:** Financing cost savings (~1%/month on ${formatCurrency(totalARQ1)} trapped AR) + reduced bad debt provisioning

**Verdict:** Net positive within 60 days. The financing savings alone exceed the discount cost.`,

// ---- 11. Bad Debt Provisioning ----
badDebt: `**Bad Debt & Provisioning Estimate:**

**By aging bucket:**
• 45-day bucket (34% of AR): provision 5-10% → 3.4-6.8% of total AR
• 60-day bucket (31% of AR): provision 15-25% → 4.7-7.8% of total AR
• **Total recommended: 8-15% of total AR**

**Peak exposure:** Invoice #${peakOverdueExposureData.invoiceNo} at ${formatCurrency(peakOverdueExposureData.amount)} (${peakOverdueExposureData.daysOverdue}d overdue). Specific provision at 50% = ${formatCurrency(peakOverdueExposureData.amount * 0.5)} P&L impact.

**Risk factors:**
• ${overdueInvoiceDensityData.count}% overdue by count = wide default spread
• ${agingRisky}% in 45-60 day buckets = concentration risk
• Collection effectiveness at ${avgCollEff}% = limited recovery capacity

**Recommendation:** General provision of 10% of total AR + specific 50% provision on peak exposure invoice.`,

// ---- 12. DSO Trending ----
dso: `**DSO Trend Analysis:**

**Formula:** DSO = (AR / Total Credit Sales) x Days

**Jan** ${bar(Math.round(dsoData.monthly[0].value / 45 * 100))} → ${dsoData.monthly[0].value}d
**Feb** ${bar(Math.round(dsoData.monthly[1].value / 45 * 100))} → ${dsoData.monthly[1].value}d
**Mar** ${bar(Math.round(dsoData.monthly[2].value / 45 * 100))} → ${dsoData.monthly[2].value}d
**Overall:** ${dsoData.overall} days (surged 13.5x Jan→Mar)

**What's driving it:** AR is growing faster than credit sales (billings outpace collections). The 65% aging concentration in 45-60 day buckets directly inflates DSO. Inversely related to turnover: 365/${receivablesTurnoverData.overall}x ≈ 83 implied DSO.

**At this trajectory:** DSO breaches 45 days by Q2, pushing all 45-day credit invoices into automatic overdue status.

**To fix:** Target 30+ day invoices for immediate escalation. Reducing P90 cycle time from ${invoiceToCashData.p90} to 20 days would drop DSO to ~30 days.`,

// ---- 13. Revenue at Risk ----
revenueRisk: `**Revenue at Risk — Deep Dive:**

**Formula:** (Overdue AR for 45-60 day credit invoices / Total Revenue) x 100

**Current:** ${revenueAtRiskData.value}% — nearly 3 in 4 dollars may not convert to cash.

**Why so high:**
• ${agingRisky}% of AR sits in 45-60 day buckets (the formula's numerator)
• Credit period effectiveness for those buckets: 45d=40.9%, 60d=71.6%
• DSO at ${dsoData.overall} days means invoices spend longer in risky buckets
• ${overdueRatioData.overall}% overdue ratio compounds the problem

**Cross-KPI link:** Revenue at risk = f(aging concentration, credit period effectiveness, DSO). Fixing any one reduces it — but the 45-day aging bucket (34% of AR) is the highest-leverage intervention point. Moving 10% from 45→30 day bucket cuts revenue at risk by ~10pp.`,

// ---- 14. Aging Distribution ----
aging: `**Aging Bucket Distribution:**

**Formula:** Bucket % = (AR in Bucket / Total AR) x 100

**7 days** ${bar(agingBucketData.data[0].percentage)}
**15 days** ${bar(agingBucketData.data[1].percentage)}
**30 days** ${bar(agingBucketData.data[2].percentage)}
**45 days** ${bar(agingBucketData.data[3].percentage)}
**60 days** ${bar(agingBucketData.data[4].percentage)}

**Diagnosis:** Inverted pyramid — ${agingHealthy}% in 0-30 days vs ${agingRisky}% in 45-60 days. Healthy is the reverse (60%+ in 0-30).

**The 45-day bucket (34%) is the critical point** — these invoices are transitioning from "late" to "at risk." They directly feed the ${revenueAtRiskData.value}% revenue at risk metric.

**Impact of intervention:** Moving just 10% from the 45→30 day bucket would improve DSO by ~4 days, reduce revenue at risk by ~10pp, and shift the aging toward healthy distribution.`,

// ---- 15. Peak Overdue Exposure ----
peakExposure: `**Peak Overdue Exposure:**

**Formula:** MAX(Individual Overdue Invoice Amounts)

**Current:** Invoice #${peakOverdueExposureData.invoiceNo} | ${formatCurrency(peakOverdueExposureData.amount)} | Company ${peakOverdueExposureData.companyCode} | ${peakOverdueExposureData.daysOverdue} days overdue

**Context:** At ${peakOverdueExposureData.daysOverdue} days, it sits right at the DSO average (${dsoData.overall}d) — this is representative of the systemic problem, not an outlier. Likely represents 2-5% of total AR.

**Risk:** If it crosses 60 days, bad debt provisioning jumps from 10% to 25%. Current recommended provision: 50% = ${formatCurrency(peakOverdueExposureData.amount * 0.5)}.

**Action:** Immediate CFO-to-CFO escalation before it enters the 60-day threshold.`,

// ---- 16. Collection Effectiveness ----
collEffectiveness: `**Why Collection Effectiveness Is Low:**

**Formula:** Weekly Effectiveness = (Amount Collected / Amount Due) x 100

**Current:** ${avgCollEff}% average — critically below the 70% target.

**The paradox:** On-time payment hit 100% in W12-W13, but collection effectiveness was only 54% and 38%. This proves customers ARE paying — but the collections team isn't the reason. Payments are passive (customer-initiated), not from active pursuit.

**Weekly breakdown (last 4):** W10=${collectionEffectivenessWeeklyData.weekly[8].value}% → W11=${collectionEffectivenessWeeklyData.weekly[9].value}% → W12=${collectionEffectivenessWeeklyData.weekly[10].value}% → W13=${collectionEffectivenessWeeklyData.weekly[11].value}%

**The gap:** ${avgOnTime}% on-time (customer behavior) vs ${avgCollEff}% effectiveness (team effort) = ${(avgOnTime - avgCollEff).toFixed(0)}pp of lost opportunity. Fixing this gap alone would improve CEI by 10-15pp.`,

// ---- 17. Invoice-to-Cash Cycle Time ----
invoiceToCash: `**Invoice-to-Cash Cycle Time:**

**Formula:** Percentile of (Cash Receipt Date − Invoice Issue Date)

**Current:** P50 = ${invoiceToCashData.p50} days (median) | P90 = ${invoiceToCashData.p90} days (worst 10%)

**The gap:** ${invoiceToCashData.p90 - invoiceToCashData.p50}-day P50-P90 spread reveals a bimodal distribution — most invoices clear in ${invoiceToCashData.p50} days, but ~10% get stuck for ${invoiceToCashData.p90} days.

**Impact:** Those stuck invoices flow into 45-60 day aging buckets (${agingRisky}% of AR), inflate DSO from a theoretical ${invoiceToCashData.p50} to ${dsoData.overall} days, and drive ${revenueAtRiskData.value}% revenue at risk.

**If P90 drops to 20 days:** DSO → ~30 days, 45-60 day aging halves, revenue at risk drops ~20pp.`,

// ---- 18. Credit Period Utilization ----
creditUtil: `**Credit Period Utilization:**

**Formula:** (Actual Payment Days / Allowed Credit Period Days) x 100

**Current:** ${creditPeriodUtilizationData.overall}% overall
**Monthly:** Jan=${creditPeriodUtilizationData.monthly[0].value}% → Feb=${creditPeriodUtilizationData.monthly[1].value}% → Mar=${creditPeriodUtilizationData.monthly[2].value}%

**Jan's 136.78%** meant customers paid 37% beyond their credit terms — a breach. Feb-Mar normalized to 60-67%, but the ${creditPeriodUtilizationData.overall}% overall means zero early payments on average.

**Implication:** Customers use every available day. No incentive to pay early. Offering 2/10 net 30 (2% discount for 10-day payment) could shift utilization below 50% and improve DSO by 15-20 days.`,

// ---- 19. Backlog Situation ----
backlog: `**Days to Clear Backlog:**

**Formula:** Overdue AR Balance / Average Daily Collection Rate

**Current:** ${backlogLatest} days (W13) — target is <3 days
**Trend:** Surged 3.5x in 3 weeks (W10: ${Math.min(...daysToClearBacklogData.weekly.map(w => w.value))}d → W13: ${backlogLatest}d)

**What it means:** The overdue AR balance is growing 3.5x faster than the collection rate. Cross-check: weekly collection effectiveness dropped to 38% (W13) while 91.7% of invoices are overdue.

**Projection:** At current trajectory, backlog reaches ~12 days by W16-W17 — effectively unmanageable. The team would need 2+ weeks just to clear the overdue pile.

**Fix:** Immediate capacity increase — either automate small invoices or add headcount.`,

// ---- 20. Overdue Count vs Value Gap ----
overdueDensity: `**Overdue Invoice Density — Count vs Value Gap:**

**By Count:** ${bar(overdueInvoiceDensityData.count)}
**By Value:** ${bar(overdueInvoiceDensityData.value)}
**Gap:** ${(overdueInvoiceDensityData.count - overdueInvoiceDensityData.value).toFixed(1)}pp

**The ${(overdueInvoiceDensityData.count - overdueInvoiceDensityData.value).toFixed(1)}pp gap is diagnostic:** High volume of small invoices drives the overdue count (91.7%), while large invoices (26.8% of value) are paid more reliably.

**Strategy:**
• Automate collections for small invoices below a threshold → reduce the 91.7% count
• Focus human collectors on the 73.2% by value — especially the ${formatCurrency(peakOverdueExposureData.amount)} peak exposure
• This dual approach could improve CEI by 10-15pp and free capacity for high-value pursuits.`,

// ============================================================
// FOLLOW-UP RESPONSES — Natural questions after seeing initial answers
// ============================================================

// After Health Score → "How to improve the score?"
improveScore: `**How to Improve Health Score from ${overallGrade} (${overallScore}/100):**

**Quickest wins by category:**

**Executive (${execHealth.score}/100):** Reduce DSO below 30 days (+20pts). Biggest lever: escalate all 30+ day invoices this week, launch early payment discounts within 30 days.

**Collection Efficiency (${collHealth.score}/100):** Push weekly effectiveness from ${avgCollEff}% to 70% (+25pts). Set daily collector targets, automate small invoice dunning.

**Aging & Risk (${agingHealth.score}/100):** Move 15% of AR from 45→30 day bucket (+20pts). Tighten credit terms for short-term segment.

**Operational (${opsHealth.score}/100):** Reduce backlog from ${backlogLatest} to <3 days (+20pts). Increase collection capacity — automate or add headcount.

**Realistic 60-day target:** Grade B (65-70/100) — achievable with actions #1-5 from the priority plan.`,

// After DSO → "How to reduce DSO?"
reduceDSO: `**How to Reduce DSO from ${dsoData.overall} to <30 Days:**

**Lever 1 — Fix stuck invoices (impact: −10d):**
The P90 of ${invoiceToCashData.p90} days means 10% of invoices get stuck. Daily follow-ups on 20+ day invoices would pull P90 to ~20 days, dropping DSO to ~30.

**Lever 2 — Early payment incentives (impact: −15d):**
2/10 net 30 discount. With credit utilization at ${creditPeriodUtilizationData.overall}%, customers have no reason to pay early. A 2% discount could shift 30% of payments to day 10.

**Lever 3 — Short-term credit enforcement (impact: −5d):**
7-30 day terms have only 39-41% effectiveness. Tightening terms or requiring deposits for slow payers would reduce overdue flow.

**Combined realistic impact:** DSO from ${dsoData.overall} → 25-30 days within 60 days.`,

// After Revenue at Risk → "What's the dollar amount at risk?"
dollarAtRisk: `**Dollar Value at Risk:**

**Total AR trapped in Q1:** ${formatCurrency(totalARQ1)}
**Revenue at risk (${revenueAtRiskData.value}%):** ~${formatCurrency(totalARQ1 * revenueAtRiskData.value / 100)}

**By aging bucket (estimated):**
• 45-day bucket (34% of AR): ~${formatCurrency(totalARQ1 * 0.34)} — moderate risk
• 60-day bucket (31% of AR): ~${formatCurrency(totalARQ1 * 0.31)} — high risk
• Peak single invoice: ${formatCurrency(peakOverdueExposureData.amount)} at ${peakOverdueExposureData.daysOverdue} days

**Bad debt exposure if unaddressed:**
• Conservative (5% of at-risk): ~${formatCurrency(totalARQ1 * revenueAtRiskData.value / 100 * 0.05)}
• Moderate (10% of at-risk): ~${formatCurrency(totalARQ1 * revenueAtRiskData.value / 100 * 0.10)}
• Worst case (20% of at-risk): ~${formatCurrency(totalARQ1 * revenueAtRiskData.value / 100 * 0.20)}`,

// After Aging → "How to fix the aging pyramid?"
fixAging: `**How to Fix the Inverted Aging Pyramid:**

**Current:** ${agingHealthy}% in 0-30d vs ${agingRisky}% in 45-60d
**Target:** Flip to 60%+ in 0-30d, <25% in 45-60d

**Step 1 — Stop the inflow (prevents new invoices aging):**
• Daily dunning from Day 1 (not Day 30)
• Auto-reminders at Day 1, 7, 15 for small invoices
• Impact: Reduces new entries into 45+ day buckets by ~40%

**Step 2 — Drain the 45-day bucket (largest at 34%):**
• Dedicated collector assigned to 30-45 day invoices only
• Escalation protocol at Day 35 (before hitting 45)
• Impact: Could move 10-15% from 45→30 day bucket

**Step 3 — Prevent 60-day defaults:**
• CFO-level escalation at Day 50 for any invoice >₹1M
• Bad debt provisioning review at Day 45
• Impact: Reduces 60-day concentration by 5-10%

**Timeline:** 60-90 days to see meaningful shift. The 45-day bucket is the priority.`,

// After Actions → "What's the cost of inaction?"
costOfInaction: `**Cost of Doing Nothing — 90-Day Impact:**

**Financial cost:**
• AR continues growing at Q1 rate: +${formatCurrency(totalARQ1)} per quarter trapped
• Financing cost at 12% annually: ~${formatCurrency(totalARQ1 * 0.03)}/quarter in interest
• Bad debt provisioning: 8-15% of total AR → increasing P&L drag
• Peak exposure invoice may require full write-off: ${formatCurrency(peakOverdueExposureData.amount)}

**Operational cascade:**
• DSO breaches 52 days by June → 45-day invoices auto-overdue
• CEI drops below 75% → mandatory team restructuring (cost + disruption)
• Backlog hits 12 days → team needs 2+ weeks just to catch up
• Revenue at risk could exceed 80%

**Strategic risk:**
• Credit rating downgrade risk if DSO > 60 days
• Supplier confidence erosion
• Board-level intervention likely by Q3

**Bottom line:** ~${formatCurrency(totalARQ1 * 0.15)} potential loss in next 90 days if no action taken.`,

// After Forecast → "What if we improve collections by 20%?"
scenarioImproved: `**Scenario: Collections Effectiveness Improves 20pp (${avgCollEff}% → ${avgCollEff + 20}%)**

**Projected KPI improvements:**
• **DSO:** ${dsoData.overall} → ~28 days (−12 days)
• **Overdue Ratio:** ${overdueRatioData.overall}% → ~25% (−15pp)
• **Revenue at Risk:** ${revenueAtRiskData.value}% → ~50% (−21pp)
• **CEI:** ${ceiData.monthly[2].value}% → ~90% (back to strong zone)
• **Backlog:** ${backlogLatest} → ~2.5 days (below target)
• **Aging 45-60d:** ${agingRisky}% → ~45% (−20pp)

**How to get there:**
• Set daily targets: each collector must close ${Math.ceil(20 / 5)} more invoices/day
• Automate small invoices → frees 30% of team capacity
• Morning standup with aging review → accountability

**Timeline:** Achievable within 45-60 days with disciplined execution.`,

// After Team → "Do we need more headcount?"
headcount: `**Headcount Analysis — Collections Team:**

**Current capacity signals:**
• Effectiveness at ${avgCollEff}% suggests team can handle about half of current load
• Backlog growing 3.5x in 3 weeks = falling further behind
• W11 crash to 19% = possible staffing gap or absence

**Before adding headcount, try:**
1. **Automate small invoices** (91.7% of overdue by count) → frees ~40% of capacity
2. **Set daily targets** → current effort is reactive, not capacity-limited
3. **Redistribute workload** → focus on 45-day bucket (34% of AR, highest ROI)

**If effectiveness stays below 60% after 30 days of above:**
• Add 1-2 collectors focused exclusively on 30-45 day invoices
• Cost: ~₹1-2M/year salary
• ROI: If they prevent even 5% of the 45-day bucket from aging to 60 days, savings exceed salary 10x

**Verdict:** Don't hire yet. Automate + discipline first. Reassess in 30 days.`,

// After Benchmarks → "Which KPI should I fix first?"
fixFirst: `**KPI Priority Ranking — Fix Order:**

**#1 — Collection Effectiveness (${avgCollEff}%)**
Why first: It's the root cause. The ${(avgOnTime - avgCollEff).toFixed(0)}pp gap vs on-time payment proves customers will pay — team just needs to pursue. Fixing this cascades to every other KPI.
Effort: Low (process change). Impact: High.

**#2 — Aging 45-Day Bucket (34%)**
Why second: It's the largest single concentration and feeds revenue at risk, DSO, and overdue ratio simultaneously. Moving 10% to 30-day bucket improves 4+ KPIs.
Effort: Medium. Impact: Very high.

**#3 — DSO (${dsoData.overall} days)**
Why third: It improves automatically when #1 and #2 are fixed. Direct intervention: daily dunning on 30+ day invoices.
Effort: Medium. Impact: High.

**#4 — Credit Utilization (${creditPeriodUtilizationData.overall}%)**
Why fourth: Early payment discounts are a strategic decision. Implement after #1-3 stabilize.
Effort: Low. Impact: Medium-high.

**Don't fix directly:** Revenue at risk, overdue ratio, CEI, turnover — these are lagging indicators that improve when #1-3 are fixed.`,

// After Discounts → "What's the annual cost of the discount program?"
discountCost: `**Early Payment Discount — Detailed Cost-Benefit:**

**Annual cost estimate (2/10 net 30):**
• Q1 AR volume: ${formatCurrency(totalARQ1)} → annualized: ~${formatCurrency(totalARQ1 * 4)}
• If 30% adopt: ${formatCurrency(totalARQ1 * 4 * 0.3)} eligible for discount
• 2% discount on that: **${formatCurrency(totalARQ1 * 4 * 0.3 * 0.02)}/year cost**

**Annual savings:**
• Reduced financing cost (12% on freed AR): ~${formatCurrency(totalARQ1 * 4 * 0.3 * 0.12)}/year
• Reduced bad debt (lower aging): ~${formatCurrency(totalARQ1 * 0.02)}/year estimated
• Reduced collections labor (fewer overdue): ~₹2-3M/year
• **Total savings: ~${formatCurrency(totalARQ1 * 4 * 0.3 * 0.12 + totalARQ1 * 0.02)}/year**

**Net benefit:** Savings exceed cost by ~5-8x. Payback period: <60 days.

**Risk:** Some customers who already pay on time take the discount (free money for them). Mitigate: offer only to accounts with history of late payment.`,

// "What's the cash conversion cycle?"
cashConversion: `**Cash Conversion Cycle Analysis:**

**Formula:** CCC = DSO + DIO − DPO
_(DSO = Days Sales Outstanding, DIO = Days Inventory Outstanding, DPO = Days Payable Outstanding)_

**From available data:**
• **DSO: ${dsoData.overall} days** (we have this)
• DIO and DPO: not available on this dashboard (requires inventory and payables data)

**What we can say from DSO alone:**
• At ${dsoData.overall} days, the receivables leg of CCC is extended
• Industry DSO benchmark <30 days → our CCC is at least 10 days longer than optimal
• If DSO were 25 days (achievable), CCC shortens by 15 days = significant working capital freed

**DSO is the controllable lever** on this dashboard. Improving collections (currently ${avgCollEff}%) is the fastest path to shortening CCC.`,

// "Correlation between DSO and aging"
correlation: `**How KPIs Are Connected — Correlation Map:**

**DSO ↔ Aging:** DSO of ${dsoData.overall}d is directly caused by ${agingRisky}% of AR in 45-60 day buckets. Every 10% moved from 45→30 day bucket reduces DSO by ~4 days.

**Aging ↔ Revenue at Risk:** The ${revenueAtRiskData.value}% revenue at risk is calculated on 45-60 day invoices. Same ${agingRisky}% bucket is the numerator.

**Collection Effectiveness ↔ Everything:** At ${avgCollEff}%, the team recovers less than half of what's due. This feeds: aging (invoices age because they're not collected) → DSO (longer average) → overdue ratio → revenue at risk.

**Turnover ↔ DSO:** Mathematically inverse. 365/${receivablesTurnoverData.overall}x = ~83 implied DSO. As turnover falls, DSO must rise.

**P90 ↔ Aging 45-60d:** The stuck 10% of invoices (P90 = ${invoiceToCashData.p90}d) flow directly into 45-60 day aging buckets.

**Single lever:** Improving collection effectiveness from ${avgCollEff}% to 70% would cascade improvements across every connected KPI.`,

// "Monthly trend comparison"
monthlyTrend: `**Monthly Trend Comparison — Jan vs Feb vs Mar:**

**Jan'26** ${bar(Math.round(dsoData.monthly[0].value / 45 * 100))} DSO ${dsoData.monthly[0].value}d
**Feb'26** ${bar(Math.round(dsoData.monthly[1].value / 45 * 100))} DSO ${dsoData.monthly[1].value}d
**Mar'26** ${bar(Math.round(dsoData.monthly[2].value / 45 * 100))} DSO ${dsoData.monthly[2].value}d

• **DSO:** ${dsoData.monthly[0].value} → ${dsoData.monthly[1].value} → ${dsoData.monthly[2].value} days (↑13.5x)
• **Overdue Ratio:** ${overdueRatioData.monthly[0].value} → ${overdueRatioData.monthly[1].value} → ${overdueRatioData.monthly[2].value}% (↑13.5x)
• **Turnover:** ${receivablesTurnoverData.monthly[0].value} → ${receivablesTurnoverData.monthly[1].value} → ${receivablesTurnoverData.monthly[2].value}x (↓68%)
• **CEI:** ${ceiData.monthly[0].value} → ${ceiData.monthly[1].value} → ${ceiData.monthly[2].value}% (↓7.6pp)
• **CPU:** ${creditPeriodUtilizationData.monthly[0].value} → ${creditPeriodUtilizationData.monthly[1].value} → ${creditPeriodUtilizationData.monthly[2].value}% (↓improving)
• **Net AR:** ${formatCurrency(netARMovementData.monthly[0].value)} → ${formatCurrency(netARMovementData.monthly[1].value)} → ${formatCurrency(netARMovementData.monthly[2].value)}

**Pattern:** Every KPI worsened Jan→Mar except CPU (improving from 137% breach).`,

// "Which customers are highest risk?"
customerRisk: `**Customer Risk Segmentation (from available data):**

**Highest risk — Company ${peakOverdueExposureData.companyCode}:**
• Single invoice #${peakOverdueExposureData.invoiceNo}: ${formatCurrency(peakOverdueExposureData.amount)}
• ${peakOverdueExposureData.daysOverdue} days overdue — approaching 60-day threshold
• Likely 2-5% of total AR concentration
• Action: Immediate CFO-to-CFO escalation

**High risk segment — 45-60 day credit customers:**
• ${agingRisky}% of AR = ~${formatCurrency(totalARQ1 * agingRisky / 100)} sits in this segment
• Credit period effectiveness: 45d=40.9%, 60d=71.6%
• Revenue at risk: ${revenueAtRiskData.value}% from this segment
• Action: Dedicated collector, tightened terms

**Volume risk — Small invoice customers:**
• 91.7% of invoices overdue by count = thousands of small invoices
• Only 73.2% by value — individually small but collectively clogging
• Action: Automated dunning, self-service payment portals

**Lower risk — Large 60-day accounts:**
• 71.6% effectiveness on 60-day terms = these pay more reliably
• Likely have dedicated AP teams
• Action: Maintain relationship, don't tighten terms`,

// "What's the ROI of fixing collections?"
roi: `**ROI of Collections Improvement:**

**Investment required:**
• Automation tool for small invoices: ~₹5-10M one-time
• Process changes (daily targets, standups): ₹0 (operational)
• Optional: 1-2 additional collectors: ~₹2-4M/year

**Returns if effectiveness goes from ${avgCollEff}% → 70%:**
• AR freed: ~${formatCurrency(totalARQ1 * 0.25)} per quarter
• Financing cost saved (12%): ~${formatCurrency(totalARQ1 * 0.25 * 0.03)}/quarter
• Bad debt reduced: ~${formatCurrency(totalARQ1 * 0.03)}/quarter
• Revenue at risk reduced ~20pp = fewer write-offs
• **Total annual benefit: ~${formatCurrency((totalARQ1 * 0.25 * 0.03 + totalARQ1 * 0.03) * 4)}**

**ROI:** 10-15x in year 1. Payback period: <90 days.
**Non-financial:** Better credit rating, supplier confidence, CFO peace of mind.`,

// "On-time payment weekly breakdown"
weeklyBreakdown: `**On-Time Payment — Full Weekly Breakdown:**

**W2** ${bar(onTimePaymentData.weekly[0].value)}
**W3** ${bar(onTimePaymentData.weekly[1].value)}
**W4** ${bar(onTimePaymentData.weekly[2].value)}
**W5** ${bar(onTimePaymentData.weekly[3].value)}
**W6** ${bar(onTimePaymentData.weekly[4].value)}
**W7** ${bar(onTimePaymentData.weekly[5].value)}
**W8** ${bar(onTimePaymentData.weekly[6].value)}
**W9** ${bar(onTimePaymentData.weekly[7].value)}
**W10** ${bar(onTimePaymentData.weekly[8].value)}
**W11** ${bar(onTimePaymentData.weekly[9].value)}
**W12** ${bar(onTimePaymentData.weekly[10].value)}
**W13** ${bar(onTimePaymentData.weekly[11].value)}

**Average:** ${avgOnTime}% | **Target:** >85% | **Met target:** ${weeksAboveTarget}/12 weeks
**Volatility:** Range ${Math.min(...onTimePaymentData.weekly.map(w => w.value))}-${Math.max(...onTimePaymentData.weekly.map(w => w.value))}% — highly inconsistent.`,

// "Net AR breakdown" / "How much cash is trapped?"
arBreakdown: `**AR Breakdown — Where Is the Cash Trapped?**

**Total Q1 AR Movement:** ${formatCurrency(totalARQ1)}

**By month:**
• Jan: ${formatCurrency(netARMovementData.monthly[0].value)} (${Math.round(netARMovementData.monthly[0].value / totalARQ1 * 100)}% of Q1)
• Feb: ${formatCurrency(netARMovementData.monthly[1].value)} (${Math.round(netARMovementData.monthly[1].value / totalARQ1 * 100)}% of Q1)
• Mar: ${formatCurrency(netARMovementData.monthly[2].value)} (${Math.round(netARMovementData.monthly[2].value / totalARQ1 * 100)}% of Q1)

**By aging bucket (estimated):**
• 0-30 days (${agingHealthy}%): ~${formatCurrency(totalARQ1 * agingHealthy / 100)} — lower risk
• 45-60 days (${agingRisky}%): ~${formatCurrency(totalARQ1 * agingRisky / 100)} — high risk

**Cost of trapped cash:**
• At 12% financing: ~${formatCurrency(totalARQ1 * 0.12 / 4)}/quarter in interest
• Annualized: ~${formatCurrency(totalARQ1 * 0.12)} if pattern persists
• Every day DSO reduces frees ~${formatCurrency(totalARQ1 / 90)} in working capital`,

// "Credit period effectiveness by term"
cpEffDetail: `**Credit Period Effectiveness — By Term:**

**7 days** ${bar(collectionPeriodEffectivenessData.data[0].value)}
**15 days** ${bar(collectionPeriodEffectivenessData.data[1].value)}
**30 days** ${bar(collectionPeriodEffectivenessData.data[2].value)}
**45 days** ${bar(collectionPeriodEffectivenessData.data[3].value)}
**60 days** ${bar(collectionPeriodEffectivenessData.data[4].value)}

**The 30pp gap explained:**
• 7-45 day terms: ~40% effectiveness → 60% of these invoices go overdue
• 60-day terms: 71.6% → these customers pay more reliably

**Why do 60-day customers pay better?**
Likely larger, established companies with dedicated AP teams and regular payment cycles. They negotiate longer terms but honor them.

**Why do short-term customers default?**
Likely smaller businesses with less disciplined AP. They may also have cash flow issues of their own — hence why they need shorter terms.

**Fix:** Different collection strategies per segment. Automate for short-term (volume), personalize for long-term (relationship).`,

// "What KPIs improved this quarter?"
whatImproved: `**Q1 2026 — What Improved vs Worsened:**

**Improved:** ✅
• **Credit Period Utilization:** 136.78% → 60.69% (Jan→Mar) — customers stopped breaching terms
• **On-Time Payment (late Q1):** Hit 100% in W12-W13 (quarter-end push)
• **P50 Invoice-to-Cash:** Steady at ${invoiceToCashData.p50} days — excellent median

**Worsened:** ⚠️
• **DSO:** 2 → 27 days (13.5x surge)
• **Overdue Ratio:** 2% → 27% (13.5x)
• **Turnover:** 3.1x → 1.0x (68% collapse)
• **CEI:** 91.7% → 80.4% (approaching restructuring trigger)
• **Backlog:** 1.7 → 5.9 days (3.5x in 3 weeks)
• **Collection Effectiveness:** Erratic, average ${avgCollEff}% (target 70%)

**Net assessment:** The few improvements are surface-level (quarter-end push, CPU normalization). The structural metrics are all deteriorating. Without intervention, Q2 will be significantly worse.`,

// "Receivables turnover deep dive"
turnoverDeep: `**Receivables Turnover — Deep Dive:**

**Formula:** Net Credit Sales / Average Accounts Receivable

**Jan** ${bar(Math.round(receivablesTurnoverData.monthly[0].value / 8 * 100))} → ${receivablesTurnoverData.monthly[0].value}x
**Feb** ${bar(Math.round(receivablesTurnoverData.monthly[1].value / 8 * 100))} → ${receivablesTurnoverData.monthly[1].value}x
**Mar** ${bar(Math.round(receivablesTurnoverData.monthly[2].value / 8 * 100))} → ${receivablesTurnoverData.monthly[2].value}x
**Overall:** ${receivablesTurnoverData.overall}x (benchmark: 5-8x)

**What ${receivablesTurnoverData.monthly[2].value}x means:** In March, AR was collected exactly once. Net new billings equaled collections — zero progress on the backlog.

**Inverse DSO check:** 365 / ${receivablesTurnoverData.overall}x = ${Math.round(365 / receivablesTurnoverData.overall)} implied DSO. vs actual ${dsoData.overall} days. The gap suggests the overall ${receivablesTurnoverData.overall}x is buoyed by Jan's relatively better ${receivablesTurnoverData.monthly[0].value}x.

**To reach 5x benchmark:** Collections must be 5x the average AR — requiring either higher collection rate or lower AR. Improving effectiveness from ${avgCollEff}% to 70% would push turnover to ~3-4x within a quarter.`,

// ---- Overall Summary ----
summary: `**Q1 2026 Working Capital — Grade ${overallGrade} (${overallScore}/100)**

**Scores:** Executive ${execHealth.grade} (${execHealth.score}) | Collections ${collHealth.grade} (${collHealth.score}) | Aging ${agingHealth.grade} (${agingHealth.score}) | Operational ${opsHealth.grade} (${opsHealth.score})

**Key metrics:** DSO ${dsoData.overall}d | Overdue ${overdueRatioData.overall}% | Revenue at Risk ${revenueAtRiskData.value}% | CEI ${ceiData.overall}% (↓ to ${ceiData.monthly[2].value}%) | Turnover ${receivablesTurnoverData.overall}x | AR trapped: ${formatCurrency(totalARQ1)}

**Top 3 actions:**
1. Escalate peak exposure ${formatCurrency(peakOverdueExposureData.amount)} (${peakOverdueExposureData.daysOverdue}d overdue)
2. Fix collection effectiveness: team at ${avgCollEff}% vs ${avgOnTime}% customer willingness
3. Automate small invoice collections (91.7% overdue by count) + launch early payment discounts`,

};

// ============================================================
// QUERY MATCHING — pattern list per response key
// Each entry: [responseKey, array of trigger phrases]
// First match wins, so order matters (specific before general)
// ============================================================

const queryPatterns: [string, string[]][] = [
  // Follow-up queries (specific — must be BEFORE broad patterns like "improve", "fix")
  ["improveScore",     ["improve score", "improve health", "improve the score", "increase score", "get to grade", "how to improve the health", "how can we improve"]],
  ["reduceDSO",        ["reduce dso", "lower dso", "decrease dso", "improve dso", "bring down dso"]],
  ["dollarAtRisk",     ["dollar amount", "dollar at risk", "how much at risk", "monetary risk", "rupee", "money at risk", "total amount at risk"]],
  ["fixAging",         ["fix aging", "fix the aging", "fix the pyramid", "improve aging", "reverse aging", "correct aging"]],
  ["costOfInaction",   ["cost of inaction", "cost of doing nothing", "what happens if we don't", "consequence of not", "if we don't act"]],
  ["scenarioImproved", ["what if we improve", "what if collections", "scenario", "if we improve", "if collections improve", "impact of improving"]],
  ["headcount",        ["headcount", "more staff", "hire more", "need more people", "add people", "staffing", "do we need more"]],
  ["fixFirst",         ["fix first", "which kpi first", "where to start", "which kpi should", "most important kpi", "highest priority kpi", "top priority kpi"]],
  ["discountCost",     ["annual cost", "cost of discount", "discount cost", "how much will discount", "cost benefit"]],
  ["cashConversion",   ["cash conversion", "ccc", "conversion cycle", "working capital cycle"]],
  ["correlation",      ["correlation", "connected", "relationship between", "how are kpis", "impact on each other", "cause and effect", "interconnect", "how are they linked"]],
  ["monthlyTrend",     ["monthly trend", "month over month", "jan feb mar", "monthly comparison", "month by month", "quarterly trend"]],
  ["customerRisk",     ["customer risk", "which customer", "highest risk customer", "risky customer", "customer segment", "who owes"]],
  ["roi",              ["roi", "return on investment", "payback period", "cost benefit of fixing", "benefit of improving"]],
  ["weeklyBreakdown",  ["weekly breakdown", "week by week", "weekly trend", "weekly data", "all weeks"]],
  ["arBreakdown",      ["ar breakdown", "cash trapped", "where is cash", "how much trapped", "how much cash", "ar detail"]],
  ["cpEffDetail",      ["credit period detail", "term effectiveness", "effectiveness by credit term", "effectiveness by term", "effectiveness by period"]],
  ["whatImproved",     ["what improved", "what got better", "any good news", "any positive", "bright spot", "improved this quarter"]],
  ["turnoverDeep",     ["turnover deep", "turnover detail", "turnover analysis", "receivables turnover trend"]],
  // Original 20 queries
  ["health",           ["health", "scorecard", "score", "grade", "rating"]],
  ["cfo",              ["cfo", "board report", "executive brief", "c-suite", "leadership", "management report"]],
  ["formulas",         ["formula", "how is it calculated", "calculation", "methodology", "how computed", "how do you calculate"]],
  ["rootCause",        ["root cause", "what's causing", "causing", "why are kpis", "diagnosis", "what went wrong", "reason for"]],
  ["actions",          ["action", "recommend", "what should", "solution", "strategy", "what to do", "next step"]],
  ["benchmarks",       ["benchmark", "industry", "compare", "standard", "best practice", "how do we compare"]],
  ["liquidity",        ["liquidity", "cash flow", "cash position", "cash crunch", "working capital risk"]],
  ["forecast",         ["forecast", "projection", "predict", "next quarter", "q2", "trajectory", "what will happen"]],
  ["team",             ["team perform", "collector", "staff", "manpower", "resource", "team assessment"]],
  ["discounts",        ["discount", "early payment", "incentive", "2/10", "payment terms"]],
  ["badDebt",          ["bad debt", "write off", "provision", "allowance", "default", "uncollectible"]],
  ["dso",              ["dso", "days sales outstanding", "collection days", "how long to collect"]],
  ["revenueRisk",      ["revenue at risk", "revenue risk", "revenue jeopardy"]],
  ["aging",            ["aging", "aging bucket", "aging distribution", "invoice age"]],
  ["peakExposure",     ["peak exposure", "largest overdue", "biggest invoice", "highest risk", "peak overdue", "single invoice"]],
  ["collEffectiveness",["collection effectiveness", "why is collection", "weekly effectiveness", "collection effort"]],
  ["invoiceToCash",    ["invoice to cash", "cycle time", "p50", "p90", "cash cycle"]],
  ["creditUtil",       ["credit utilization", "credit period utilization", "payment timing", "paying late", "paying early"]],
  ["backlog",          ["backlog", "days to clear", "clear backlog", "collection capacity"]],
  ["overdueDensity",   ["overdue density", "count vs value", "invoice count", "value split", "density"]],
  // Action catches (after specific fix/improve queries above)
  ["actions",          ["fix", "improve", "priority"]],
  // Broader catches (after specific ones)
  ["revenueRisk",      ["revenue"]],
  ["dso",              ["dso"]],
  ["aging",            ["risk"]],
  ["collEffectiveness",["cei", "collection index"]],
  ["creditUtil",       ["utilization"]],
  ["overdueDensity",   ["overdue invoice", "overdue"]],
  ["turnoverDeep",     ["turnover"]],
];

// Special: category-level keywords → combine multiple responses
const categoryPatterns: [string, string[], string[]][] = [
  ["Executive KPIs", ["executive kpi", "all executive"], ["dso", "revenueRisk"]],
  ["Collection Efficiency", ["collection efficiency", "all collection"], ["collEffectiveness"]],
  ["Aging & Risk", ["aging risk", "aging & risk", "all aging"], ["aging", "overdueDensity", "peakExposure"]],
  ["Operational KPIs", ["operational kpi", "all operational", "process"], ["invoiceToCash", "creditUtil", "backlog"]],
];

// ============================================================
// MAIN QUERY ENGINE
// ============================================================

export function getChatResponse(query: string): string {
  const q = query.toLowerCase().trim();

  // Very short queries → summary
  if (q.length < 8) return responses.summary;

  // Direct pattern matching (first match wins)
  for (const [key, patterns] of queryPatterns) {
    for (const pattern of patterns) {
      if (q.includes(pattern)) {
        return responses[key];
      }
    }
  }

  // Category-level questions
  for (const [catName, patterns, keys] of categoryPatterns) {
    for (const p of patterns) {
      if (q.includes(p)) {
        return `**${catName}:**\n\n${keys.map(k => responses[k]).join("\n\n---\n\n")}`;
      }
    }
  }

  // General/summary keywords (checked AFTER specific matches)
  const summaryTriggers = ["overall", "summary", "how are we doing", "situation", "dashboard", "everything", "all kpi", "overview", "general", "working capital", "receivables health", "what's happening", "status"];
  for (const t of summaryTriggers) {
    if (q.includes(t)) return responses.summary;
  }

  // Fuzzy word matching fallback
  const words = q.split(/\s+/).filter(w => w.length > 3);
  for (const [key, patterns] of queryPatterns) {
    for (const pattern of patterns) {
      for (const word of words) {
        if (pattern.includes(word) || word.includes(pattern)) {
          return responses[key];
        }
      }
    }
  }

  // Nothing matched
  return `I can answer questions about:\n\n**KPIs:** DSO, Overdue Ratio, Revenue at Risk, Turnover, CEI, On-Time Payment, Collection Effectiveness, Credit Period, Aging, Overdue Density, Peak Exposure, Invoice-to-Cash, Credit Utilization, Backlog\n\n**Analysis:** Health score, Root cause, Forecast, Benchmarks, Actions, Bad debt, Team performance, CFO report, Early payment discounts, Formulas\n\nTry: *"What's the system health score?"* or *"Give me the CFO executive brief"*`;
}

// 20 suggested questions
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
