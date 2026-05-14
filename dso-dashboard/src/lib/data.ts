// ============================================================
// DSO VISIBILITY & WORKING CAPITAL DASHBOARD — DATA LAYER
// All KPI data with business purpose + AI insights
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
      "Days Sales Outstanding measures the average number of days it takes to collect payment after a sale. Lower DSO = faster cash conversion.",
    aiInsight:
      "DSO has surged 13.5x from Jan to Mar (2 → 27 days), indicating a rapidly deteriorating collection cycle. At this trajectory, DSO could breach 45 days by Q2, pushing into the 45-day credit bucket. Recommend immediate escalation of AR follow-ups on 30+ day invoices.",
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
      "Overdue Ratio tracks the percentage of receivables past their due date. High ratios signal collection inefficiency and increased credit risk.",
    aiInsight:
      "Overdue ratio mirroring DSO trend confirms systemic collection delays, not isolated incidents. The 40% overall ratio means nearly half of all receivables are past due. Cross-referencing with 91.7% overdue invoice density suggests a high volume of small overdue invoices dragging the metric.",
    trend: "warning" as const,
  },
};

export const revenueAtRiskData = {
  value: 71.3,
  changeLabel: "vs last week",
  insight: {
    businessPurpose:
      "Revenue at Risk quantifies the percentage of booked revenue that may not convert to cash due to overdue invoices, disputes, or credit issues.",
    aiInsight:
      "71.3% revenue at risk is critically high — nearly 3 in 4 dollars of recognized revenue are in jeopardy. Combined with the 40-day DSO and 40% overdue ratio, this suggests a liquidity crunch could materialize within 30 days. CFO should trigger working capital contingency protocols.",
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
      "Receivables Turnover Ratio shows how many times receivables are collected during a period. Higher = more efficient. Industry benchmark: 5-8x.",
    aiInsight:
      "Turnover has collapsed from 3.1x → 1.0x in 3 months — a 68% decline. At 1.0x, the company is collecting receivables only once per period, far below the 5-8x industry benchmark. This directly correlates with the rising DSO and signals that collections capacity is overwhelmed relative to billing volume.",
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
      "Net AR Movement shows the change in total accounts receivable balance month-over-month. Positive values indicate growing receivables (more billed than collected).",
    aiInsight:
      "The waterfall pattern shows a massive Jan spike (211.9M), a sharp Feb dip (32.7M), then a Mar rebound to 197M. The Feb dip was likely a large payment or write-off, not improved collections. The Mar rebound to near-Jan levels confirms the structural collection problem persists. Total Q1 AR movement: 441.6M — this is the cash trapped in receivables.",
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
      "Collection Effectiveness Index (CEI) measures how effectively the collections team converts outstanding receivables into cash. 100% = perfect. >80% is acceptable, >90% is strong.",
    aiInsight:
      "Despite the 94.1% overall CEI (strong), the monthly trend shows deterioration: 87→91.7→80.4. The Mar drop to 80.4% is a red flag — approaching the 'needs attention' threshold. The overall figure is inflated by early months. If this trend continues, CEI will fall below 75% by May, requiring collections team restructuring.",
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
      "On-Time Payment Rate tracks the percentage of invoices paid within their credit terms each week. Target: >85%.",
    aiInsight:
      "Strong finish at W12-W13 (100%) but high volatility throughout Q1 (range: 49-100%). The W2 low of 49% and W10 dip to 58% suggest mid-quarter collection lulls. The W12-W13 spike likely reflects quarter-end push collections. Recommend smoothing collections cadence to avoid feast-or-famine cycles.",
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
      "Weekly Collection Effectiveness tracks real-time collection performance against targets. Helps identify weeks where collection effort drops.",
    aiInsight:
      "Highly erratic — swings from 0% (W2) to 80% (W3) with no discernible pattern. Average is ~45%, well below the 70% target. W11 crash to 19% and W13 at 38% show the team is not maintaining consistent effort. The contrast with On-Time Payment (which hit 100%) suggests payments are coming in but collections activity is inconsistent.",
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
      "Credit Period Effectiveness measures how efficiently receivables are collected within each credit term bucket. Highlights which credit periods drive timely cash conversion and where collection gaps exist.",
    aiInsight:
      "Striking pattern: 7-45 day credit terms all cluster around 39-41% effectiveness (essentially flat), but 60-day terms jump to 71.6%. Longer credit periods paradoxically yield better collection — likely because 60-day customers are larger, established accounts with dedicated AP teams. The short-term credit periods (7-30 days) need targeted intervention to close the effectiveness gap.",
    trend: "stable" as const,
  },
};

// ---------- AGING & RISK KPIs ----------

export const agingBucketData = {
  data: [
    { bucket: "7 days", percentage: 11, color: "#3fb950" },
    { bucket: "15 days", percentage: 10, color: "#58a6ff" },
    { bucket: "30 days", percentage: 14, color: "#d29922" },
    { bucket: "45 days", percentage: 34, color: "#f0883e" },
    { bucket: "60 days", percentage: 31, color: "#f85149" },
  ],
  insight: {
    businessPurpose:
      "Aging Bucket Distribution shows how receivables are spread across time-since-invoice buckets. Concentration in higher buckets = higher default risk.",
    aiInsight:
      "65% of receivables are in the 45-60 day buckets (34% + 31%) — a dangerous concentration. Only 21% is in the healthy 7-15 day range. This is an inverted aging pyramid: a healthy distribution would show 60%+ in 0-30 days. The current distribution implies systematic late payments and potentially inadequate credit policies for the 45-60 day customer segment.",
    trend: "warning" as const,
  },
};

export const overdueInvoiceDensityData = {
  count: 91.7,
  value: 73.2,
  insight: {
    businessPurpose:
      "Overdue Invoice Density compares the count of overdue invoices vs. their monetary value. A high count% with lower value% means many small invoices are overdue.",
    aiInsight:
      "91.7% of invoices are overdue by count but only 73.2% by value. This 18.5pp gap confirms that the overdue problem is driven by a high volume of smaller invoices. The large invoices (26.8% by value) are being paid more reliably. Strategy: automate collections for small invoices (<threshold) and focus human effort on the high-value overdue accounts.",
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
      "Peak Overdue Exposure identifies the single largest overdue invoice — the highest-risk individual exposure in the portfolio.",
    aiInsight:
      "Single invoice #2721002125 represents ~10M in overdue exposure at 40 days past due. At company code 300025, this is likely a major B2B client. This single invoice may represent 2-5% of total AR. Recommend: immediate executive-level escalation, direct CFO-to-CFO communication, and evaluation of whether to provision a partial allowance for doubtful accounts.",
    trend: "warning" as const,
  },
};

// ---------- OPERATIONAL KPIs ----------

export const invoiceToCashData = {
  p50: 8,
  p90: 30,
  insight: {
    businessPurpose:
      "Invoice-to-Cash Cycle Time measures the elapsed days from invoice issuance to cash receipt. P50 = median, P90 = worst 10% of invoices.",
    aiInsight:
      "P50 of 8 days is excellent — half of invoices clear within 8 days. But the P90 of 30 days (3.75x the median) reveals a long tail problem. The gap between P50 and P90 (22 days) suggests a bimodal distribution: most invoices clear fast, but ~10% get stuck for a month. These stuck invoices are likely the ones driving the 40-day DSO and 65% aging in 45-60 day buckets.",
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
      "Credit Period Utilization measures what percentage of the allowed credit period customers actually use. >100% = paying beyond terms. <80% = paying early.",
    aiInsight:
      "January at 136.78% is alarming — customers were paying 37% beyond their credit terms. The improvement to 67.49% (Feb) and 60.69% (Mar) shows the trend is normalizing, but the overall 98.3% means customers are using virtually all their credit window. Zero early payments. Consider offering 2/10 net 30 discounts to incentivize earlier payment and break the 'pay at the last minute' behavior.",
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
      "Days to Clear Backlog estimates how many days it would take to clear the current overdue backlog at the current collection rate. Rising = backlog growing faster than collections.",
    aiInsight:
      "Backlog clearance time is trending upward: from 1.7 days (W10 low) to 5.9 days (W13). This 3.5x increase in just 3 weeks indicates the collection team is falling behind. If this trend persists, the backlog will become unmanageable by W16-W17. The W10 low coincides with the mid-quarter collection push — confirming the feast-or-famine collection pattern observed in On-Time Payment data.",
    trend: "warning" as const,
  },
};
