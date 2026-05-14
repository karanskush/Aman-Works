// ============================================================
// DSO VISIBILITY & WORKING CAPITAL DASHBOARD — INSIGHT DEFINITIONS
// Business purpose, formulas, and AI insights for each KPI
// Actual values come from computed-kpis.ts (database-derived)
// ============================================================

export interface KPIInsight {
  businessPurpose: string;
  formula: string;
  aiInsight: string;
  trend: "up" | "down" | "stable" | "warning";
}

// ---------- EXECUTIVE KPIs ----------

export const dsoInsight: KPIInsight = {
  businessPurpose:
    "Measures the average days to collect payment after a sale. Lower DSO = faster cash conversion. Benchmark: <45 days is healthy.",
  formula:
    "DSO = (Accounts Receivable / Total Credit Sales) x Number of Days in Period",
  aiInsight:
    "DSO is a leading indicator of cash flow health. Rising DSO signals slowing collections and growing working capital needs. Cross-reference with aging buckets and overdue ratio for root cause analysis.",
  trend: "warning",
};

export const overdueRatioInsight: KPIInsight = {
  businessPurpose:
    "Tracks the share of AR past due date. >30% signals systemic collection failure. Healthy target: <20%.",
  formula:
    "Overdue Ratio = (Overdue Receivables / Total Receivables) x 100",
  aiInsight:
    "The gap between count density and value density reveals whether the problem is many small invoices or a few large ones. A high overdue ratio with low value density means large accounts pay on time, but the long tail drags the metric.",
  trend: "warning",
};

export const revenueAtRiskInsight: KPIInsight = {
  businessPurpose:
    "Quantifies the share of booked revenue that may not convert to cash, calculated for customers with 45-60 day credit terms who are overdue.",
  formula:
    "Revenue at Risk = (Overdue AR for 45-60 day credit invoices / Total Open AR) x 100",
  aiInsight:
    "This directly ties to the aging distribution in longer credit terms. When combined with high DSO and overdue ratio, a liquidity crunch may materialize. CFO should monitor working capital contingency protocols.",
  trend: "warning",
};

export const receivablesTurnoverInsight: KPIInsight = {
  businessPurpose:
    "Shows how many times AR is collected per period. Higher = more efficient. Industry benchmark: 5-8x. Inversely related to DSO (365 / Turnover ~ DSO).",
  formula:
    "Receivables Turnover = Net Credit Sales / Average Accounts Receivable",
  aiInsight:
    "Declining turnover means AR is growing faster than sales — collections capacity is being overwhelmed. This correlates with backlog days rising. Sustained decline below 4x requires immediate collections intervention.",
  trend: "down",
};

export const netARMovementInsight: KPIInsight = {
  businessPurpose:
    "Shows monthly change in total receivables. Positive = AR growing (more billed than collected). Persistently positive = cash trap.",
  formula:
    "Net AR Movement = AR End of Period − AR Start of Period",
  aiInsight:
    "The waterfall reveals whether AR movements are structural or one-time. A dip followed by a rebound confirms structural problems. Persistently positive movement creates severe working capital pressure.",
  trend: "warning",
};

// ---------- COLLECTION EFFICIENCY ----------

export const ceiInsight: KPIInsight = {
  businessPurpose:
    "Measures how effectively the team converts outstanding receivables into cash. >90% = strong, 80-90% = acceptable, <80% = needs restructuring.",
  formula:
    "CEI = (Beg AR + Credit Sales − End Total AR) / (Beg AR + Credit Sales − End Current AR) x 100",
  aiInsight:
    "CEI reveals collection team quality. A declining trend approaching 80% triggers restructuring threshold. If Ending Total AR grows faster than collections (numerator shrinks) while current AR stays flat, CEI will deteriorate rapidly.",
  trend: "down",
};

export const onTimePaymentInsight: KPIInsight = {
  businessPurpose:
    "Tracks weekly compliance with payment terms. Target: >85%. Measures customer payment behavior, not collections effort.",
  formula:
    "On-Time Rate = (Invoices Paid Within Credit Terms / Total Invoices Due) x 100",
  aiInsight:
    "High volatility suggests inconsistent dunning cadence, not changing customer behavior. Quarter-end spikes may be anomalous push collections inflating the metric rather than sustained improvement.",
  trend: "up",
};

export const collectionEffectivenessInsight: KPIInsight = {
  businessPurpose:
    "Measures real-time collections effort vs. target. Target: >70%. Unlike On-Time Rate (customer behavior), this measures team performance.",
  formula:
    "Weekly Effectiveness = (Amount Collected in Week / Amount Due in Week) x 100",
  aiInsight:
    "Paradox alert: if On-Time Payment is high but effectiveness is low, payments are passive (customer-initiated), not from active collections effort. This signals a reactive rather than proactive team.",
  trend: "warning",
};

export const collectionPeriodEffectivenessInsight: KPIInsight = {
  businessPurpose:
    "Segments collection performance by credit term length. Reveals which credit terms yield best cash conversion.",
  formula:
    "CP Effectiveness = (Collected Within Credit Period / Total Due for Period) x 100",
  aiInsight:
    "Counterintuitively, longer terms may collect better because those customers are larger accounts with dedicated AP teams. Tightening short-term collections could significantly reduce the overall overdue ratio.",
  trend: "stable",
};

// ---------- AGING & RISK KPIs ----------

export const agingBucketInsight: KPIInsight = {
  businessPurpose:
    "Shows receivable concentration across time-since-due bands. Healthy: 60%+ in Not Due or 0-15 days. Inverted pyramid (majority in 45+ days) = high default risk.",
  formula:
    "Aging Bucket % = (AR in Bucket / Total Open AR) x 100",
  aiInsight:
    "An inverted aging pyramid (majority in older buckets) signals systemic collection failure. Focus intervention on the largest bucket — moving 10% from the critical bucket to a younger one can improve DSO by 3-5 days.",
  trend: "warning",
};

export const overdueInvoiceDensityInsight: KPIInsight = {
  businessPurpose:
    "Compares overdue invoices by count vs. monetary value. The gap reveals whether the problem is many small invoices or few large ones.",
  formula:
    "Count Density = (Overdue Count / Total) x 100 | Value Density = (Overdue Value / Total) x 100",
  aiInsight:
    "A large gap (count >> value) means automate collections for small invoices below a threshold, and concentrate human collectors on high-value overdue. This dual approach could improve CEI by 10-15pp.",
  trend: "warning",
};

export const peakOverdueExposureInsight: KPIInsight = {
  businessPurpose:
    "Identifies the single largest overdue receivable — the highest concentration risk. If this invoice defaults, it directly impacts bad debt provision and P&L.",
  formula:
    "Peak Exposure = MAX(Individual Overdue Invoice Amounts)",
  aiInsight:
    "Immediate CFO-to-CFO escalation recommended for peak exposure invoices approaching the 60-day threshold. Bad debt provisioning should be considered at 50% if the invoice represents >2% of total AR.",
  trend: "warning",
};

// ---------- OPERATIONAL KPIs ----------

export const invoiceToCashInsight: KPIInsight = {
  businessPurpose:
    "Measures elapsed days from invoice issuance to cash receipt. P50 = median, P90 = worst 10%. Large P50-P90 gap = bimodal distribution (fast payers + stuck invoices).",
  formula:
    "I2C = Percentile of (Cash Receipt Date − Invoice Issue Date) across all cleared invoices",
  aiInsight:
    "A wide P50-P90 gap means ~10% of invoices get stuck. These stuck invoices flow into older aging buckets and drive DSO. Reducing P90 closer to P50 would dramatically improve DSO and aging distribution.",
  trend: "stable",
};

export const creditPeriodUtilizationInsight: KPIInsight = {
  businessPurpose:
    "Shows how much of the credit window customers use. >100% = paying beyond terms. <80% = paying early. 98-100% = using full window with zero early payments.",
  formula:
    "CPU = (Actual Payment Days / Allowed Credit Period Days) x 100",
  aiInsight:
    "A CPU >100% means customers pay beyond their terms — a breach. Offering 2/10 net 30 discounts (2% for payment within 10 days) could shift utilization below 50% and improve DSO by 15-20 days.",
  trend: "up",
};

export const daysToClearBacklogInsight: KPIInsight = {
  businessPurpose:
    "Estimates time needed to clear current overdue backlog at current pace. Rising = backlog growing faster than collections. Target: <3 days.",
  formula:
    "Backlog Days = Overdue AR Balance / Average Daily Collection Rate",
  aiInsight:
    "If the trend is rising, overdue AR is growing faster than the collection rate. When backlog exceeds 10 days, it typically becomes unmanageable and requires a dedicated task force.",
  trend: "warning",
};
