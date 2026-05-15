// ============================================================
// KPI REGISTRY — Single Source of Truth for All KPIs
// Metadata-driven: name, category, formula, computed values
// All values computed from 25,000-invoice SQLite database
// ============================================================

export type KPICategory =
  | "basic-executive"
  | "basic-collection"
  | "basic-aging"
  | "basic-operational"
  | "dso-decomposition"
  | "organization-health"
  | "predictive"
  | "collection-productivity"
  | "customer-intelligence"
  | "process-bottleneck"
  | "dispute-analytics"
  | "working-capital"
  | "benchmarking";

export type DashboardSection = "basic" | "advanced" | "ai-insights";

export type VisualizationType =
  | "waterfall"
  | "sparkline"
  | "gauge"
  | "radar"
  | "bar"
  | "heatmap"
  | "table"
  | "kpi-card"
  | "funnel"
  | "scatter"
  | "stacked-bar"
  | "dual-metric";

export type TrendDirection = "up" | "down" | "stable" | "warning";

export interface KPIDefinition {
  id: string;
  name: string;
  shortName: string;
  category: KPICategory;
  categoryLabel: string;
  dashboardSection: DashboardSection;
  businessPurpose: string;
  formula: string;
  visualization: VisualizationType;
  refreshFrequency: string;
  trend: TrendDirection;
  primaryValue: string;
  primaryUnit: string;
  insight: string;
  details: Record<string, string | number | Record<string, string | number>>;
  enabled: boolean;
}

export const CATEGORY_LABELS: Record<KPICategory, string> = {
  "basic-executive": "Executive KPIs",
  "basic-collection": "Collection Efficiency",
  "basic-aging": "Aging & Risk",
  "basic-operational": "Operational",
  "dso-decomposition": "DSO Decomposition",
  "organization-health": "Organization Health",
  "predictive": "Predictive & Leading Indicators",
  "collection-productivity": "Collection Productivity",
  "customer-intelligence": "Customer Intelligence",
  "process-bottleneck": "Process Bottleneck",
  "dispute-analytics": "Dispute Analytics",
  "working-capital": "Working Capital Efficiency",
  "benchmarking": "Internal Benchmarking",
};

export const CATEGORY_COLORS: Record<KPICategory, string> = {
  "basic-executive": "#1d4ed8",
  "basic-collection": "#16a34a",
  "basic-aging": "#dc2626",
  "basic-operational": "#d97706",
  "dso-decomposition": "#3b82f6",
  "organization-health": "#7c3aed",
  "predictive": "#dc2626",
  "collection-productivity": "#16a34a",
  "customer-intelligence": "#0ea5e9",
  "process-bottleneck": "#d97706",
  "dispute-analytics": "#ea580c",
  "working-capital": "#0d9488",
  "benchmarking": "#6366f1",
};

// ============================================================
// FULL KPI REGISTRY — 25 Advanced KPIs
// ============================================================

// Helper: build a minimal Basic KPI registry entry. Basic dashboard
// sections render their own visualizations from useKPIData() — these
// entries exist so the Admin panel can toggle individual Basic tiles.
function basicEntry(
  id: string,
  shortName: string,
  name: string,
  category: KPICategory,
  businessPurpose: string,
  formula: string,
): KPIDefinition {
  return {
    id,
    name,
    shortName,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    dashboardSection: "basic",
    businessPurpose,
    formula,
    visualization: "kpi-card",
    refreshFrequency: "Live",
    trend: "stable",
    primaryValue: "—",
    primaryUnit: "",
    insight: businessPurpose,
    details: {},
    enabled: true,
  };
}

export const KPI_REGISTRY: KPIDefinition[] = [
  // ============================================================
  // BASIC DASHBOARD KPIs — per-tile admin toggles
  // Visualization & values come from useKPIData() in each section;
  // these entries only drive admin visibility.
  // ============================================================
  basicEntry(
    "basic-dso", "DSO", "Days Sales Outstanding",
    "basic-executive",
    "Average days to collect payment after a sale. Lower = faster cash conversion. Benchmark: < 45 days.",
    "DSO = (Open AR / Total Credit Sales) × Days in Period",
  ),
  basicEntry(
    "basic-overdue-ratio", "Overdue Ratio", "Overdue AR Ratio",
    "basic-executive",
    "Share of AR past due. > 30% signals systemic collection failure. Target: < 20%.",
    "Overdue Ratio = (Overdue AR / Total AR) × 100",
  ),
  basicEntry(
    "basic-revenue-at-risk", "Revenue at Risk", "Revenue at Risk",
    "basic-executive",
    "Share of revenue tied up in overdue invoices with longer credit terms — direct working-capital exposure.",
    "Revenue at Risk = (Overdue AR for 45–60 day terms / Total Open AR) × 100",
  ),
  basicEntry(
    "basic-receivables-turnover", "Receivables Turnover", "Receivables Turnover Ratio",
    "basic-executive",
    "How many times AR is collected per period. Higher = more efficient. Benchmark: 5–8×.",
    "Turnover = Net Credit Sales / Average AR",
  ),
  basicEntry(
    "basic-net-ar-movement", "Net AR Movement", "Net AR Movement Waterfall",
    "basic-executive",
    "Monthly change in total receivables. Persistently positive = cash trap.",
    "Net Movement = AR End − AR Start of Period",
  ),
  basicEntry(
    "basic-cei", "CEI", "Collection Effectiveness Index",
    "basic-collection",
    "How well the team converts outstanding AR into cash. > 90% strong, < 80% needs restructuring.",
    "CEI = (Beg AR + Sales − End Total AR) / (Beg AR + Sales − End Current AR) × 100",
  ),
  basicEntry(
    "basic-on-time-payment", "On-Time Payment Rate", "On-Time Payment Rate (Weekly)",
    "basic-collection",
    "Weekly compliance with payment terms. Target > 85%.",
    "On-Time Rate = (Invoices Paid Within Terms / Total Invoices Due) × 100",
  ),
  basicEntry(
    "basic-collection-effectiveness-weekly", "Collection Effectiveness (Weekly)", "Weekly Collection Effectiveness",
    "basic-collection",
    "Active collection performance week-by-week. Target > 70%.",
    "Weekly Effectiveness = (Amount Collected / Amount Due) × 100",
  ),
  basicEntry(
    "basic-credit-period-effectiveness", "Credit Period Effectiveness", "Credit Period Effectiveness",
    "basic-collection",
    "Segments collection performance by credit-term length. Reveals which terms yield best conversion.",
    "Per-Term Effectiveness = (Collected Within Term / Due Within Term) × 100",
  ),
  basicEntry(
    "basic-aging-buckets", "Aging Buckets", "Aging Bucket Distribution",
    "basic-aging",
    "Receivable concentration across time-since-due bands. Inverted pyramid = high default risk.",
    "Aging % = (AR in Bucket / Total Open AR) × 100",
  ),
  basicEntry(
    "basic-aging-donut", "Aging Composition", "Aging Composition (Donut)",
    "basic-aging",
    "Donut split of AR across aging buckets — complements the bar distribution.",
    "Aging Composition = AR per Bucket as % of Total Open AR",
  ),
  basicEntry(
    "basic-overdue-density", "Overdue Density", "Overdue Invoice Density",
    "basic-aging",
    "Compares overdue invoices by count vs value. Large gap → many small invoices or few large ones.",
    "Count Density = Overdue Count / Total · Value Density = Overdue Value / Total",
  ),
  basicEntry(
    "basic-peak-exposure", "Peak Overdue Exposure", "Peak Overdue Exposure",
    "basic-aging",
    "The single largest overdue receivable — highest concentration risk for bad-debt impact.",
    "Peak Exposure = MAX(Individual Overdue Invoice Amounts)",
  ),
  basicEntry(
    "basic-invoice-to-cash", "Invoice-to-Cash", "Invoice-to-Cash (P50/P90)",
    "basic-operational",
    "Elapsed days from issuance to cash. Wide P50–P90 gap = bimodal distribution (fast payers + stuck).",
    "I2C = Percentile of (Clearing Date − Document Date) across cleared invoices",
  ),
  basicEntry(
    "basic-credit-period-utilization", "Credit Period Utilization", "Credit Period Utilization",
    "basic-operational",
    "How much of the credit window customers use. > 100% means paying beyond terms.",
    "CPU = (Actual Pay Days / Allowed Credit Period) × 100",
  ),
  basicEntry(
    "basic-days-to-clear-backlog", "Days to Clear Backlog", "Days to Clear Backlog (Weekly)",
    "basic-operational",
    "Time to clear current overdue backlog at present pace. Target < 3 days.",
    "Backlog Days = Overdue AR Balance / Avg Daily Collection Rate",
  ),

  // ============================================================
  // ADVANCED KPIs
  // ============================================================
  // ---- DSO DECOMPOSITION ----
  {
    id: "dso-bridge",
    name: "DSO Bridge (Waterfall Decomposition)",
    shortName: "DSO Bridge",
    category: "dso-decomposition",
    categoryLabel: "DSO Decomposition",
    dashboardSection: "advanced",
    businessPurpose:
      "Shows exactly which customer segments pull DSO up or down — turns a single number into an actionable decomposition.",
    formula:
      "Contribution = (Segment_DSO − Blended_DSO) × (Segment_Sales / Total_Sales)",
    visualization: "waterfall",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "96.7",
    primaryUnit: "days blended",
    insight:
      "STRATEGIC segment (34% of sales) pulls DSO DOWN 6.4 days. STANDARD+SMB segments (27% of sales) push it UP 5.3 days. Fixing STANDARD/SMB collection would compress DSO by 5+ days.",
    details: {
      blendedDSO: "96.7",
      STRATEGIC: "77.9d | 34.1% weight | -6.4d",
      KEY: "99.5d | 38.8% weight | +1.1d",
      STANDARD: "114.5d | 17.5% weight | +3.1d",
      SMB: "119.9d | 9.6% weight | +2.2d",
    },
    enabled: true,
  },
  {
    id: "dso-velocity",
    name: "DSO Rate of Change (Velocity)",
    shortName: "DSO Velocity",
    category: "dso-decomposition",
    categoryLabel: "DSO Decomposition",
    dashboardSection: "advanced",
    businessPurpose:
      "DSO of 35 is meaningless without direction. Three consecutive months of +5% velocity is structural deterioration.",
    formula: "DSO Velocity = ((DSO_current − DSO_prior) / DSO_prior) × 100",
    visualization: "sparkline",
    refreshFrequency: "Monthly",
    trend: "warning",
    primaryValue: "-3.3%",
    primaryUnit: "latest velocity",
    insight:
      "Highly volatile (range: -56% to +187%). Recent trend: stabilizing around 17-23 day DSO. Needs monitoring for sustained improvement.",
    details: {
      P2: "0.3d | N/A",
      P3: "0.3d | +5.8%",
      P4: "0.5d | +37.8%",
      P5: "0.6d | +27.4%",
      P6: "1.3d | +103.1%",
      P7: "3.8d | +187.0%",
      P8: "3.5d | -9.0%",
      P9: "7.2d | +106.0%",
      P10: "17.4d | +141.1%",
      P11: "23.1d | +32.8%",
      P12: "22.3d | -3.3%",
    },
    enabled: true,
  },
  {
    id: "terms-mix-drag",
    name: "Terms Mix Drag Index",
    shortName: "Terms Mix Drag",
    category: "dso-decomposition",
    categoryLabel: "DSO Decomposition",
    dashboardSection: "advanced",
    businessPurpose:
      "Separates DSO increases caused by late payments from longer credit terms — two different problems with different owners.",
    formula:
      "Drag = Avg Actual Payment Days − Weighted Avg Credit Terms (positive = late)",
    visualization: "dual-metric",
    refreshFrequency: "Monthly",
    trend: "up",
    primaryValue: "-6.0",
    primaryUnit: "days drag",
    insight:
      "Negative drag means customers are paying 6 days before their terms. The DSO issue is NOT from late payments — it's from 42.3% of AR stuck in 60+ day overdue.",
    details: {
      weightedAvgTerms: "41.5 days",
      avgActualPayDays: "35.5 days",
      drag: "-6.0 days",
    },
    enabled: true,
  },

  // ---- ORGANIZATION HEALTH ----
  {
    id: "ar-health-score",
    name: "AR Health Score (Composite 0-100)",
    shortName: "AR Health Score",
    category: "organization-health",
    categoryLabel: "Organization Health",
    dashboardSection: "advanced",
    businessPurpose:
      "A single number for board reporting — synthesizing six dimensions of receivable quality into one metric.",
    formula:
      "Score = DSO(20%) + CEI(20%) + Overdue(15%) + Aging(15%) + Concentration(15%) + Trend(15%)",
    visualization: "radar",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "49",
    primaryUnit: "/ 100 — Grade D",
    insight:
      "Grade D driven by DSO (0/100) and overdue ratio (44/100). CEI is the bright spot at 96/100. Fix the 60+ day bucket to raise score to C (60+).",
    details: {
      score: 49,
      grade: "D",
      DSO: 0,
      CEI: 96,
      Overdue: 44,
      Aging: 44,
      Concentration: 76,
      Trend: 37,
    },
    enabled: true,
  },

  // ---- PREDICTIVE ----
  {
    id: "pbdi",
    name: "Payment Behavior Deterioration Index",
    shortName: "PBDI",
    category: "predictive",
    categoryLabel: "Predictive",
    dashboardSection: "advanced",
    businessPurpose:
      "Catches customers sliding toward default 60-90 days before they hit critical aging buckets.",
    formula:
      "PBDI = ((Avg payment days last 90d − prior 90d) / prior) × 100. Flag if > 15%",
    visualization: "table",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "88",
    primaryUnit: "customers deteriorating",
    insight:
      "88 customers showing deteriorating payment behavior. Hindalco Group surged from 4 to 23 day average — a 525% increase signals financial stress.",
    details: {
      count: 88,
      top1: "Hindalco Group: +525% (4d→23d)",
      top2: "HDFC Group: +108% (9d→18d)",
      top3: "ICICI Enterprises: +103% (9d→17d)",
      top4: "Hindalco Chemicals: +93% (17d→33d)",
      top5: "Jindal Chemicals: +84% (12d→22d)",
    },
    enabled: true,
  },
  {
    id: "credit-limit-util",
    name: "Credit Limit Utilization Heatmap",
    shortName: "Credit Limit Util",
    category: "predictive",
    categoryLabel: "Predictive",
    dashboardSection: "advanced",
    businessPurpose:
      "Customers approaching limits will either stop ordering (revenue risk) or be forced to pay (collection opportunity).",
    formula: "Utilization = (Open AR / Credit Limit) × 100",
    visualization: "heatmap",
    refreshFrequency: "Daily",
    trend: "warning",
    primaryValue: "349",
    primaryUnit: "over 100% limit",
    insight:
      "349 of 350 customers above 70% exceed 100% credit limit — credit limits too low vs AR volumes. Would trigger order blocks in production.",
    details: {
      customersAbove70Pct: 350,
      customersAbove100Pct: 349,
      top1: "JSW Engineering: 6,511%",
      top2: "ONGC Corp: 6,391%",
      top3: "HDFC Engineering: 5,901%",
    },
    enabled: true,
  },

  // ---- COLLECTION PRODUCTIVITY ----
  {
    id: "touches-per-dollar",
    name: "Dunning Touches per Crore Collected",
    shortName: "Touches / ₹Cr",
    category: "collection-productivity",
    categoryLabel: "Collection Productivity",
    dashboardSection: "advanced",
    businessPurpose:
      "Measures effort vs outcome — how many collection touches to recover ₹1 Crore.",
    formula:
      "Touches per Crore = Total Dunning Touches / (Amount Collected via Dunning / 1Cr)",
    visualization: "kpi-card",
    refreshFrequency: "Monthly",
    trend: "stable",
    primaryValue: "3.2",
    primaryUnit: "touches / ₹Cr",
    insight:
      "3.2 dunning touches to collect ₹1 Crore. This is moderate efficiency — industry best is <2.0. Automating Level-1 reminders could halve this.",
    details: {
      totalTouches: "15,000",
      totalCollected: "₹47.2B",
      touchesPerCrore: "3.2",
    },
    enabled: true,
  },
  {
    id: "escalation-velocity",
    name: "Dunning Escalation Velocity",
    shortName: "Escalation Speed",
    category: "collection-productivity",
    categoryLabel: "Collection Productivity",
    dashboardSection: "advanced",
    businessPurpose:
      "Reveals whether collection team escalates too slowly (free float) or too aggressively (relationship damage).",
    formula: "Avg days between dunning Level N → Level N+1",
    visualization: "bar",
    refreshFrequency: "Monthly",
    trend: "stable",
    primaryValue: "10.0",
    primaryUnit: "days L1→L2",
    insight:
      "Uniform 10-day escalation cadence. Should be risk-adjusted — CRITICAL in 5 days, LOW risk in 15 days.",
    details: {
      "L1→L2": "10.0 days",
      "L2→L3": "10.0 days",
    },
    enabled: true,
  },

  // ---- CUSTOMER INTELLIGENCE ----
  {
    id: "payment-consistency",
    name: "Payment Consistency Score",
    shortName: "Pay Consistency",
    category: "customer-intelligence",
    categoryLabel: "Customer Intelligence",
    dashboardSection: "advanced",
    businessPurpose:
      "CV-based score distinguishes reliable payers from random ones. A consistent late payer is better for planning than a random fast one.",
    formula:
      "Score = (1 − CV) × 100 where CV = StdDev(daysForPayment) / Avg(daysForPayment)",
    visualization: "bar",
    refreshFrequency: "Monthly",
    trend: "warning",
    primaryValue: "48",
    primaryUnit: "/ 100 avg score",
    insight:
      "Portfolio avg 48/100 means generally unpredictable. Most predictable customers are actually LATE but CONSISTENT — better for planning than fast but random.",
    details: {
      portfolioAvg: 48,
      unpredictable1: "Adani Solutions: Score 0 (CV 1.01)",
      unpredictable2: "Bajaj Pvt Ltd: Score 0 (CV 1.03)",
      predictable1: "ACC Corp: Score 78 (avg 58d)",
      predictable2: "BHEL Systems: Score 77 (avg 54d)",
    },
    enabled: true,
  },
  {
    id: "discount-capture",
    name: "Early Payment Discount Capture Rate",
    shortName: "Discount Capture",
    category: "customer-intelligence",
    categoryLabel: "Customer Intelligence",
    dashboardSection: "advanced",
    businessPurpose:
      "Quantifies missed discount opportunity — either discounts aren't attractive or customers don't know about them.",
    formula:
      "Capture Rate = (Paid within discount window / Discount-eligible) × 100",
    visualization: "funnel",
    refreshFrequency: "Monthly",
    trend: "warning",
    primaryValue: "6.3%",
    primaryUnit: "capture rate",
    insight:
      "Only 6.3% captured discounts. ₹1.63B in savings missed — customers either unaware or terms not attractive enough.",
    details: {
      eligible: "17,317",
      captured: "1,087",
      captureRate: "6.3%",
      missedValue: "₹1,627,095,306",
    },
    enabled: true,
  },

  // ---- PROCESS BOTTLENECK ----
  {
    id: "posting-lag",
    name: "Invoice Posting Lag",
    shortName: "Posting Lag",
    category: "process-bottleneck",
    categoryLabel: "Process Bottleneck",
    dashboardSection: "advanced",
    businessPurpose:
      "Delay between invoice creation and SAP posting. Every day of lag delays the DSO clock start.",
    formula: "Lag = Posting Date − Document Date",
    visualization: "kpi-card",
    refreshFrequency: "Weekly",
    trend: "stable",
    primaryValue: "3.0",
    primaryUnit: "days avg lag",
    insight:
      "3-day avg posting lag means DSO clock starts 3 days late. Reducing to same-day would improve DSO visibility by 3 days.",
    details: {
      avgDays: "3.0",
      invoicesWithLag: "18,750",
      pctWithLag: "75.0%",
    },
    enabled: true,
  },
  {
    id: "dunning-gap",
    name: "Dunning Gap (Days to First Action)",
    shortName: "Dunning Gap",
    category: "process-bottleneck",
    categoryLabel: "Process Bottleneck",
    dashboardSection: "advanced",
    businessPurpose:
      "Days after overdue before first dunning — the single biggest controllable lever for DSO improvement.",
    formula: "Gap = First Dunning Date − Due Date",
    visualization: "kpi-card",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "12.5",
    primaryUnit: "days avg gap",
    insight:
      "First dunning 12.5 days after overdue = 12.5 days free float. Reducing to 1-3 days could improve DSO by 10+ days. #1 process fix available.",
    details: {
      avgDaysAfterDue: "12.5",
      median: "13",
      invoicesTracked: "5,000",
    },
    enabled: true,
  },

  // ---- DISPUTE ANALYTICS ----
  {
    id: "dispute-adjusted-dso",
    name: "Dispute-Adjusted DSO",
    shortName: "Clean DSO",
    category: "dispute-analytics",
    categoryLabel: "Dispute Analytics",
    dashboardSection: "advanced",
    businessPurpose:
      "Separates 'won't pay' from 'can't pay due to dispute.' Collections team shouldn't be measured on disputed invoices.",
    formula:
      "Clean DSO = ((Open AR − Blocked AR) / Sales) × 365; Dispute DSO = (Blocked AR / Sales) × 365",
    visualization: "stacked-bar",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "87.6",
    primaryUnit: "days clean DSO",
    insight:
      "9.1 days (9.4%) of DSO from 844 disputed invoices worth ₹3.2B. Team should be measured on 87.6-day Clean DSO, not the total 96.7.",
    details: {
      totalDSO: "96.7 days",
      cleanDSO: "87.6 days",
      disputeDSO: "9.1 days",
      blockedInvoices: 844,
      blockedAR: "₹3,213,190,299",
    },
    enabled: true,
  },
  {
    id: "dunning-block-rate",
    name: "Dunning Block Rate",
    shortName: "Block Rate",
    category: "dispute-analytics",
    categoryLabel: "Dispute Analytics",
    dashboardSection: "advanced",
    businessPurpose:
      "High block rates mean invoicing errors or team over-using blocks to avoid difficult conversations.",
    formula: "Block Rate = (Blocked Invoices / Total Dunned) × 100",
    visualization: "kpi-card",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "16.9%",
    primaryUnit: "block rate",
    insight:
      "16.9% blocked (industry avg 10-15%). Review block reason codes to identify legitimate disputes vs team avoidance.",
    details: {
      rate: "16.9%",
      blockedCount: 844,
      totalDunned: 5000,
    },
    enabled: true,
  },

  // ---- WORKING CAPITAL ----
  {
    id: "carrying-cost",
    name: "Cost of Carrying Receivables",
    shortName: "Carrying Cost",
    category: "working-capital",
    categoryLabel: "Working Capital",
    dashboardSection: "advanced",
    businessPurpose:
      "Converts DSO days into rupees — makes the CFO's business case for AR automation investment.",
    formula:
      "Daily Cost = Open AR × (Cost of Capital / 365); Annual = Open AR × CoC × (Avg Days / 365)",
    visualization: "kpi-card",
    refreshFrequency: "Daily",
    trend: "warning",
    primaryValue: "₹9.4M",
    primaryUnit: "per day",
    insight:
      "At 10% cost of capital, each DSO day costs ₹9.4M. Reducing DSO by 10 days saves ₹93.8M annually. Total carrying cost: ₹1.27B/year.",
    details: {
      dailyCost: "₹9,375,047",
      monthlyCost: "₹281,251,409",
      annualCost: "₹1,272,801,425",
      avgDaysOutstanding: "136 days",
      costPerDayReduction: "₹9,375,047",
    },
    enabled: true,
  },
  {
    id: "cash-flow-leakage",
    name: "Free Cash Flow Leakage",
    shortName: "Cash Leakage",
    category: "working-capital",
    categoryLabel: "Working Capital",
    dashboardSection: "advanced",
    businessPurpose:
      "Quantifies in rupees how much cash is trapped due to customers exceeding credit terms.",
    formula:
      "Leakage = (Actual DSO − Best Possible DSO) × Daily Sales. Best Possible = Weighted Avg Terms.",
    visualization: "waterfall",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "₹19.5B",
    primaryUnit: "trapped cash",
    insight:
      "₹19.5B trapped beyond credit terms. The 55.2-day gap between best-possible (41.5d) and actual DSO (96.7d) is the total collection failure window.",
    details: {
      bestPossibleDSO: "41.5 days",
      actualDSO: "96.7 days",
      leakageDays: "55.2 days",
      leakageINR: "₹19,538,505,540",
    },
    enabled: true,
  },
  {
    id: "forecast-mape",
    name: "Rolling Forecast Accuracy (MAPE)",
    shortName: "Forecast MAPE",
    category: "working-capital",
    categoryLabel: "Working Capital",
    dashboardSection: "advanced",
    businessPurpose:
      "Measures how accurately cash inflows were predicted vs actual — critical for treasury planning.",
    formula:
      "MAPE = AVG(|Actual − Expected| / Expected) × 100 over last 12 weeks",
    visualization: "kpi-card",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "42.1%",
    primaryUnit: "MAPE",
    insight:
      "42.1% MAPE is very high — forecasts are off by nearly half. Systematic under-forecasting bias detected. Treasury can't rely on these projections.",
    details: {
      mape: "42.1%",
      bias: "Under-forecasting",
      biasAmount: "Significant",
    },
    enabled: true,
  },
  {
    id: "cash-conversion-efficiency",
    name: "Cash Conversion Efficiency",
    shortName: "Cash Conversion",
    category: "working-capital",
    categoryLabel: "Working Capital",
    dashboardSection: "advanced",
    businessPurpose:
      "Shows what percentage of each rupee billed is actually collected in the same period.",
    formula: "CCE = (Actual Cash Inflow / Sales Amount) × 100",
    visualization: "kpi-card",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "68.4%",
    primaryUnit: "avg CCE",
    insight:
      "68.4% means only ₹0.68 collected for every ₹1 billed. AR is building — collections lag sales significantly.",
    details: {
      avgCCE: "68.4%",
      interpretation: "AR building — collections lag sales",
    },
    enabled: true,
  },

  // ---- BENCHMARKING ----
  {
    id: "company-code-index",
    name: "Company Code Performance League Table",
    shortName: "CC League Table",
    category: "benchmarking",
    categoryLabel: "Benchmarking",
    dashboardSection: "advanced",
    businessPurpose:
      "Healthy internal competition between business units — identifies which practices to replicate.",
    formula:
      "Per company code: DSO, Overdue Ratio, Open AR, invoice count. Rank across metrics.",
    visualization: "table",
    refreshFrequency: "Monthly",
    trend: "stable",
    primaryValue: "3",
    primaryUnit: "company codes",
    insight:
      "Manufacturing (2000) leads with 86.6d DSO. Services (3000) lags at 106.3d with 59% overdue — needs intervention.",
    details: {
      "1000 HQ Operations": {
        dso: "96.8d",
        overdueRatio: "51.9%",
        openAR: "₹11.8B",
        invoices: 2559,
      },
      "2000 Manufacturing": {
        dso: "86.6d",
        overdueRatio: "57.6%",
        openAR: "₹9.8B",
        invoices: 2548,
      },
      "3000 Services": {
        dso: "106.3d",
        overdueRatio: "59.0%",
        openAR: "₹12.6B",
        invoices: 2576,
      },
    },
    enabled: true,
  },
  {
    id: "segment-efficiency",
    name: "Segment AR Efficiency Score",
    shortName: "Segment Efficiency",
    category: "benchmarking",
    categoryLabel: "Benchmarking",
    dashboardSection: "advanced",
    businessPurpose:
      "Captures the full capital-efficiency picture per segment — high DSO with high collection rate may beat low DSO with disputes.",
    formula:
      "Efficiency = (1 / DSO) × Collection Rate × (1 − Overdue Ratio), normalized 0-1000",
    visualization: "bar",
    refreshFrequency: "Monthly",
    trend: "stable",
    primaryValue: "6.8x",
    primaryUnit: "STRATEGIC vs SMB gap",
    insight:
      "STRATEGIC is 6.8x more efficient than SMB (630 vs 93). SMB's 83.5% overdue ratio vs STRATEGIC's 37.6% drives the gap.",
    details: {
      STRATEGIC: {
        dso: "77.9d",
        collectionRate: "78.6%",
        overdueRatio: "37.6%",
        score: 630,
      },
      KEY: {
        dso: "99.5d",
        collectionRate: "72.7%",
        overdueRatio: "52.1%",
        score: 350,
      },
      STANDARD: {
        dso: "114.5d",
        collectionRate: "68.6%",
        overdueRatio: "72.7%",
        score: 163,
      },
      SMB: {
        dso: "119.9d",
        collectionRate: "67.2%",
        overdueRatio: "83.5%",
        score: 93,
      },
    },
    enabled: true,
  },

  // ---- AI INSIGHTS-ONLY KPIs ----
  {
    id: "executive-summary",
    name: "Executive Summary",
    shortName: "Exec Summary",
    category: "organization-health",
    categoryLabel: "Organization Health",
    dashboardSection: "ai-insights",
    businessPurpose:
      "One-page CFO brief synthesizing all AR metrics into actionable intelligence.",
    formula: "Composite analysis of all KPIs with trend-weighted scoring",
    visualization: "kpi-card",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "D",
    primaryUnit: "overall grade",
    insight:
      "AR portfolio health is Grade D (49/100). Key drivers: DSO at 96.7d (2x benchmark), 56% overdue ratio, ₹19.5B cash trapped. Bright spot: CEI at 97% shows the team converts what it chases.",
    details: {
      healthGrade: "D",
      healthScore: 49,
      dso: "96.7 days",
      overdueRatio: "56.1%",
      cei: "97%",
      cashTrapped: "₹19.5B",
    },
    enabled: true,
  },
  {
    id: "risk-heatmap",
    name: "Multi-Dimensional Risk Assessment",
    shortName: "Risk Heatmap",
    category: "predictive",
    categoryLabel: "Predictive",
    dashboardSection: "ai-insights",
    businessPurpose:
      "Cross-references multiple risk signals to identify accounts requiring immediate executive attention.",
    formula:
      "Risk Score = PBDI_weight(30%) + Credit_Util(25%) + Overdue_Days(25%) + Consistency(20%)",
    visualization: "heatmap",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "12",
    primaryUnit: "critical accounts",
    insight:
      "12 accounts flagged critical: deteriorating payment + breached credit limits + inconsistent behavior. Combined exposure: ₹4.2B.",
    details: {
      criticalAccounts: 12,
      highRiskAccounts: 45,
      exposure: "₹4.2B",
    },
    enabled: true,
  },
  {
    id: "cash-forecast",
    name: "30-Day Cash Inflow Forecast",
    shortName: "Cash Forecast",
    category: "working-capital",
    categoryLabel: "Working Capital",
    dashboardSection: "ai-insights",
    businessPurpose:
      "Statistical projection of expected cash inflows based on historical payment patterns and current AR aging.",
    formula:
      "Forecast = SUM(Invoice Amount × P(payment in window)) based on historical segment payment curves",
    visualization: "bar",
    refreshFrequency: "Weekly",
    trend: "stable",
    primaryValue: "₹8.2B",
    primaryUnit: "expected 30d",
    insight:
      "₹8.2B expected in next 30 days based on payment history. Confidence: 62% (±₹3.1B range). STRATEGIC segment most predictable at 78% confidence.",
    details: {
      expected30d: "₹8.2B",
      confidence: "62%",
      range: "₹5.1B — ₹11.3B",
      bySegment: {
        STRATEGIC: "₹3.4B (78% conf)",
        KEY: "₹2.8B (65% conf)",
        STANDARD: "₹1.4B (52% conf)",
        SMB: "₹0.6B (41% conf)",
      },
    },
    enabled: true,
  },
  {
    id: "working-capital-opportunity",
    name: "Working Capital Release Opportunities",
    shortName: "WC Opportunities",
    category: "working-capital",
    categoryLabel: "Working Capital",
    dashboardSection: "ai-insights",
    businessPurpose:
      "Prioritized list of actions to release trapped working capital, ranked by impact and feasibility.",
    formula: "Impact = Days Saved × Daily Sales; Feasibility scored 1-5",
    visualization: "table",
    refreshFrequency: "Monthly",
    trend: "stable",
    primaryValue: "₹12.4B",
    primaryUnit: "releasable",
    insight:
      "₹12.4B working capital releasable through 5 initiatives: dunning gap reduction (#1, ₹3.5B), STANDARD/SMB focus (#2, ₹2.8B), discount program (#3, ₹2.1B).",
    details: {
      initiative1: "Close dunning gap: 10d reduction → ₹3.5B",
      initiative2: "STANDARD/SMB collection blitz: 5d DSO cut → ₹2.8B",
      initiative3: "Discount awareness program: 15% capture → ₹2.1B",
      initiative4: "Dispute fast-track: halve resolution time → ₹2.0B",
      initiative5: "Posting lag elimination: 3d saving → ₹2.0B",
    },
    enabled: true,
  },
  {
    id: "collections-efficiency-trend",
    name: "Collections Efficiency Deep Dive",
    shortName: "Collections Trend",
    category: "collection-productivity",
    categoryLabel: "Collection Productivity",
    dashboardSection: "ai-insights",
    businessPurpose:
      "Identifies whether collection improvements are structural or temporary, with leading vs lagging indicator comparison.",
    formula: "Cross-correlation of CEI, On-Time Rate, Backlog, and Dunning volume",
    visualization: "sparkline",
    refreshFrequency: "Weekly",
    trend: "warning",
    primaryValue: "45.3%",
    primaryUnit: "avg effectiveness",
    insight:
      "Paradox: On-Time Rate hit 100% in W12-13 but effectiveness was only 54%/38%. Payments are passive (customer-initiated), not from active collection. Team is reactive.",
    details: {
      avgEffectiveness: "45.3%",
      target: "70%",
      weeksAboveTarget: "2 of 12",
      pattern: "Reactive — passive collections dominate",
    },
    enabled: true,
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getKPIsBySection(section: DashboardSection): KPIDefinition[] {
  return KPI_REGISTRY.filter((kpi) => kpi.dashboardSection === section);
}

export function getKPIsByCategory(category: KPICategory): KPIDefinition[] {
  return KPI_REGISTRY.filter((kpi) => kpi.category === category);
}

export function getEnabledKPIs(
  section: DashboardSection,
  enabledMap: Record<string, boolean>
): KPIDefinition[] {
  return KPI_REGISTRY.filter(
    (kpi) =>
      kpi.dashboardSection === section &&
      (enabledMap[kpi.id] !== undefined ? enabledMap[kpi.id] : kpi.enabled)
  );
}

export function getCategoriesForSection(
  section: DashboardSection
): KPICategory[] {
  const cats = new Set<KPICategory>();
  KPI_REGISTRY.filter((kpi) => kpi.dashboardSection === section).forEach(
    (kpi) => cats.add(kpi.category)
  );
  return [...cats];
}

export function getDefaultEnabledMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  KPI_REGISTRY.forEach((kpi) => {
    map[kpi.id] = kpi.enabled;
  });
  return map;
}
