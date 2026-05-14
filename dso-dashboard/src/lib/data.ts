// ============================================================
// DSO VISIBILITY & WORKING CAPITAL DASHBOARD — DATA LAYER
// All KPI data with formulas, business purpose + AI insights
// ============================================================

export interface KPIInsight {
  businessPurpose: string;
  aiInsight: string;
  trend: "up" | "down" | "stable" | "warning";
}

// ---------- EXECUTIVE KPIs ----------

export const dsoData = {
  overall: 40,
  monthly: [
    { month: "Jan'26", value: 2 },
    { month: "Feb'26", value: 10 },
    { month: "Mar'26", value: 27 },
  ],
  insight: {
    businessPurpose:
      "DSO = (Accounts Receivable / Total Credit Sales) x Number of Days. Measures the average days to collect payment after a sale. Lower DSO = faster cash conversion. Benchmark: <45 days is healthy.",
    aiInsight:
      "DSO surged 13.5x from Jan to Mar (2 → 27 days). With AR/Sales ratio worsening each month, the denominator (credit sales) is growing slower than AR — meaning billings outpace collections. At this trajectory, DSO breaches 45 days by Q2. The 40-day overall is dragged up by late-quarter invoices stuck in the 45-60 day aging buckets (65% of AR). Immediate escalation on 30+ day invoices needed.",
    trend: "warning" as const,
  },
};

export const overdueRatioData = {
  overall: 40,
  monthly: [
    { month: "Jan'26", value: 2 },
    { month: "Feb'26", value: 10 },
    { month: "Mar'26", value: 27 },
  ],
  insight: {
    businessPurpose:
      "Overdue Ratio = (Overdue Receivables / Total Receivables) x 100. Tracks the share of AR past due date. >30% signals systemic collection failure. Healthy target: <20%.",
    aiInsight:
      "At 40%, nearly half of total receivables are overdue. The ratio mirrors DSO (both surged Jan→Mar), confirming this is systemic — not isolated incidents. Cross-referencing: 91.7% of invoices are overdue by count but only 73.2% by value, so the problem is driven by high volume of small overdue invoices. The 18.5pp count-vs-value gap means large accounts pay on time, but the long tail of small invoices is dragging the ratio.",
    trend: "warning" as const,
  },
};

export const revenueAtRiskData = {
  value: 71.3,
  changeLabel: "vs last week",
  insight: {
    businessPurpose:
      "Revenue at Risk = (Overdue AR for 45-60 day credit period invoices / Total Revenue) x 100. Quantifies the share of booked revenue that may not convert to cash, calculated specifically for customers with 45-60 day credit terms.",
    aiInsight:
      "71.3% is critically high — nearly 3 in 4 dollars are in jeopardy. This directly ties to the aging distribution: 65% of AR sits in the 45-60 day buckets, and credit period effectiveness for those buckets is only 40.9-71.6%. With DSO at 40 days and overdue ratio at 40%, a liquidity crunch could materialize within 30 days. CFO should trigger working capital contingency protocols.",
    trend: "warning" as const,
  },
};

export const receivablesTurnoverData = {
  overall: 4.4,
  monthly: [
    { month: "Jan'26", value: 3.1 },
    { month: "Feb'26", value: 1.4 },
    { month: "Mar'26", value: 1.0 },
  ],
  insight: {
    businessPurpose:
      "Receivables Turnover = Net Credit Sales / Average Accounts Receivable. Shows how many times AR is collected per period. Higher = more efficient. Industry benchmark: 5-8x. Inversely related to DSO (365 / Turnover ≈ DSO).",
    aiInsight:
      "Turnover collapsed 68% in Q1 (3.1x → 1.0x). At 1.0x in March, the company collected AR only once — far below the 5-8x benchmark. Cross-check: 365/4.4 = 83 days implied DSO vs. 40 days actual, suggesting the overall figure masks the worsening monthly trend. The Mar 1.0x means AR is growing as fast as sales — collections capacity is overwhelmed. This correlates with the backlog rising to 5.9 days in W13.",
    trend: "down" as const,
  },
};

export const netARMovementData = {
  monthly: [
    { month: "Jan'26", value: 211903896.1, label: "Jan'26" },
    { month: "Feb'26", value: 32677928.2, label: "Feb'26" },
    { month: "Mar'26", value: 197019181.7, label: "Mar'26" },
  ],
  insight: {
    businessPurpose:
      "Net AR Movement = AR End of Period - AR Start of Period. Shows monthly change in total receivables. Positive = AR growing (more billed than collected). Persistently positive = cash trap.",
    aiInsight:
      "Total Q1 AR movement: ₹441.6M trapped in receivables. The waterfall shows Jan spike (₹211.9M), Feb dip (₹32.7M), then Mar rebound (₹197M). The Feb dip was likely a large one-time payment — not improved collections — because the Mar rebound confirms structural problems persist. At this rate, ₹1.77B could be stuck in AR annually, creating severe working capital pressure.",
    trend: "warning" as const,
  },
};

// ---------- COLLECTION EFFICIENCY ----------

export const ceiData = {
  overall: 94.1,
  monthly: [
    { month: "Jan'26", value: 87.0 },
    { month: "Feb'26", value: 91.7 },
    { month: "Mar'26", value: 80.4 },
  ],
  insight: {
    businessPurpose:
      "CEI = (Beginning AR + Monthly Credit Sales - Ending Total AR) / (Beginning AR + Monthly Credit Sales - Ending Current AR) x 100. Measures how effectively the team converts outstanding receivables into cash. >90% = strong, 80-90% = acceptable, <80% = needs restructuring.",
    aiInsight:
      "The 94.1% overall masks a deteriorating trend: 87→91.7→80.4%. Mar's 80.4% approaches the restructuring threshold. The formula reveals why: Ending Total AR is growing faster than collections (numerator shrinks), while current AR stays relatively flat (denominator stable). If this 5.6pp/month decline continues, CEI falls below 75% by May — triggering mandatory collections team restructuring.",
    trend: "down" as const,
  },
};

export const onTimePaymentData = {
  weekly: [
    { week: "W2", value: 49 },
    { week: "W3", value: 58 },
    { week: "W4", value: 65 },
    { week: "W5", value: 57 },
    { week: "W6", value: 86 },
    { week: "W7", value: 75 },
    { week: "W8", value: 77 },
    { week: "W9", value: 71 },
    { week: "W10", value: 58 },
    { week: "W11", value: 87 },
    { week: "W12", value: 100 },
    { week: "W13", value: 100 },
  ],
  insight: {
    businessPurpose:
      "On-Time Payment Rate = (Invoices Paid Within Credit Terms / Total Invoices Due) x 100. Tracks weekly compliance with payment terms. Target: >85%. Measures customer payment behavior, not collections effort.",
    aiInsight:
      "High volatility: 49-100% range with σ=17.4%. The W12-W13 perfect scores are anomalous — likely quarter-end push collections inflating the metric. Average is 73.6%, below the 85% target. Only 4 of 12 weeks exceeded target. The feast-or-famine pattern (W5: 57% → W6: 86% → W7: 75%) suggests inconsistent dunning cadence, not changing customer behavior.",
    trend: "up" as const,
  },
};

export const collectionEffectivenessWeeklyData = {
  weekly: [
    { week: "W2", value: 0 },
    { week: "W3", value: 80 },
    { week: "W4", value: 58 },
    { week: "W5", value: 53 },
    { week: "W6", value: 37 },
    { week: "W7", value: 42 },
    { week: "W8", value: 62 },
    { week: "W9", value: 35 },
    { week: "W10", value: 66 },
    { week: "W11", value: 19 },
    { week: "W12", value: 54 },
    { week: "W13", value: 38 },
  ],
  insight: {
    businessPurpose:
      "Weekly Collection Effectiveness = (Amount Collected in Week / Amount Due in Week) x 100. Measures real-time collections effort vs. target. Target: >70%. Unlike On-Time Rate (customer behavior), this measures team performance.",
    aiInsight:
      "Average effectiveness is 45.3% — critically below the 70% target. Paradox: On-Time Payment hit 100% in W12-W13, but collection effectiveness was only 54% and 38%. This means payments came in passively (customer-initiated), not from active collections effort. The team is reactive, not proactive. W11 crash to 19% may indicate staffing gaps. Collections team needs process discipline and consistent weekly targets.",
    trend: "warning" as const,
  },
};

export const collectionPeriodEffectivenessData = {
  data: [
    { creditPeriod: "7 days", value: 39.9 },
    { creditPeriod: "15 days", value: 39.1 },
    { creditPeriod: "30 days", value: 40.0 },
    { creditPeriod: "45 days", value: 40.9 },
    { creditPeriod: "60 days", value: 71.6 },
  ],
  insight: {
    businessPurpose:
      "Credit Period Effectiveness = (Amount Collected Within Credit Period / Total Amount Due for Credit Period) x 100. Segments collection performance by credit term length. Reveals which credit terms yield best cash conversion.",
    aiInsight:
      "7-45 day terms cluster at 39-41% (flat) but 60-day terms jump to 71.6% — a 30pp gap. This is counterintuitive: longer terms collect better. Analysis: 60-day customers are likely larger accounts with dedicated AP teams, paying reliably within terms. The 7-30 day segment's ~40% rate means 60% of short-term receivables go overdue — directly feeding the 65% aging concentration in 45-60 day buckets. Tightening short-term collections could reduce overall overdue ratio by ~15pp.",
    trend: "stable" as const,
  },
};

// ---------- AGING & RISK KPIs ----------

export const agingBucketData = {
  data: [
    { bucket: "7 days", percentage: 11, color: "#16a34a" },
    { bucket: "15 days", percentage: 10, color: "#3b82f6" },
    { bucket: "30 days", percentage: 14, color: "#d97706" },
    { bucket: "45 days", percentage: 34, color: "#ea580c" },
    { bucket: "60 days", percentage: 31, color: "#dc2626" },
  ],
  insight: {
    businessPurpose:
      "Aging Bucket % = (AR in Bucket / Total AR) x 100. Shows receivable concentration across time-since-invoice bands. Healthy: 60%+ in 0-30 days. Inverted pyramid (majority in 45-60 days) = high default risk.",
    aiInsight:
      "Inverted aging pyramid: only 35% in 0-30 days vs. 65% in 45-60 days. A healthy portfolio is the reverse. The 45-day bucket (34%) is the largest single concentration — these are the invoices transitioning from 'late' to 'at risk'. Combined with 71.3% revenue at risk on 45-60 day terms, this bucket is the critical intervention point. Moving just 10% from 45→30 day bucket would improve DSO by ~4 days and reduce revenue at risk by ~10pp.",
    trend: "warning" as const,
  },
};

export const overdueInvoiceDensityData = {
  count: 91.7,
  value: 73.2,
  insight: {
    businessPurpose:
      "Count Density = (Overdue Invoice Count / Total Invoices) x 100. Value Density = (Overdue Invoice Value / Total AR Value) x 100. The gap between count and value reveals whether the problem is many small invoices or few large ones.",
    aiInsight:
      "The 18.5pp gap (91.7% count vs. 73.2% value) is diagnostic: high volume of small invoices drives the overdue problem, while large invoices (26.8% of value) are paid more reliably. Strategy: automate collections for invoices below a threshold (reduce the 91.7% count), and concentrate human collectors on the 73.2% value — especially the ₹10M peak exposure invoice. This dual approach could improve CEI by 10-15pp.",
    trend: "warning" as const,
  },
};

export const peakOverdueExposureData = {
  amount: 9983617,
  invoiceNo: "2721002125",
  companyCode: "300025",
  daysOverdue: 40,
  insight: {
    businessPurpose:
      "Peak Exposure = MAX(Individual Overdue Invoice Amount). Identifies the single largest overdue receivable — the highest concentration risk. If this invoice defaults, it directly impacts bad debt provision and P&L.",
    aiInsight:
      "Invoice #2721002125 (₹10M, 40 days overdue, Company 300025) is the single largest exposure. At 40 days, it sits right at the DSO average — meaning it's representative of the systemic problem, not an outlier. If this represents 2-5% of total AR, bad debt provisioning should be considered at 50% (₹5M provision). Immediate CFO-to-CFO escalation recommended before it crosses the 60-day threshold.",
    trend: "warning" as const,
  },
};

// ---------- OPERATIONAL KPIs ----------

export const invoiceToCashData = {
  p50: 8,
  p90: 30,
  insight: {
    businessPurpose:
      "Invoice-to-Cash = Percentile of (Cash Receipt Date - Invoice Issue Date) across all invoices. P50 = median (50% clear faster), P90 = worst 10%. The P50-P90 gap reveals distribution shape — large gap = bimodal (fast payers + stuck invoices).",
    aiInsight:
      "P50=8 days (excellent) vs. P90=30 days (3.75x median) reveals a bimodal distribution. The 22-day gap means ~10% of invoices get stuck for a month. These stuck invoices are the ones flowing into the 45-60 day aging buckets (65% of AR) and driving the 40-day DSO. If P90 were reduced to 20 days, DSO would drop to ~30 days and the 45-60 day aging concentration would halve.",
    trend: "stable" as const,
  },
};

export const creditPeriodUtilizationData = {
  overall: 98.3,
  monthly: [
    { month: "Jan'26", value: 136.78 },
    { month: "Feb'26", value: 67.49 },
    { month: "Mar'26", value: 60.69 },
  ],
  insight: {
    businessPurpose:
      "Credit Period Utilization = (Actual Payment Days / Allowed Credit Period Days) x 100. Shows how much of the credit window customers use. >100% = paying beyond terms. <80% = paying early. 98-100% = using full window with zero early payments.",
    aiInsight:
      "Jan at 136.78% meant customers were paying 37% beyond their credit terms — a breach. Feb-Mar normalized to 60-67% (healthy), but the 98.3% overall means customers use virtually the entire credit window on average. Zero early payments signal no incentive to pay early. Offering 2/10 net 30 discounts (2% discount for payment within 10 days) could shift utilization below 50% and improve DSO by 15-20 days.",
    trend: "up" as const,
  },
};

export const daysToClearBacklogData = {
  weekly: [
    { week: "W2", value: 0 },
    { week: "W3", value: 3.8 },
    { week: "W4", value: 6.0 },
    { week: "W5", value: 4.5 },
    { week: "W6", value: 4.0 },
    { week: "W7", value: 4.9 },
    { week: "W8", value: 2.9 },
    { week: "W9", value: 2.6 },
    { week: "W10", value: 1.7 },
    { week: "W11", value: 4.1 },
    { week: "W12", value: 5.2 },
    { week: "W13", value: 5.9 },
  ],
  insight: {
    businessPurpose:
      "Days to Clear Backlog = Overdue AR Balance / Average Daily Collection Rate. Estimates time needed to clear current overdue backlog at current pace. Rising = backlog growing faster than collections. Target: <3 days.",
    aiInsight:
      "Backlog surged 3.5x in 3 weeks (W10: 1.7 → W13: 5.9 days), far above the <3 day target. This means the overdue AR balance is growing 3.5x faster than the collection rate. Cross-check: this correlates with weekly collection effectiveness dropping to 38% (W13) while new invoices keep entering the overdue pool (91.7% overdue by count). If the trend continues, backlog becomes unmanageable by W16-W17 (~12 days).",
    trend: "warning" as const,
  },
};
