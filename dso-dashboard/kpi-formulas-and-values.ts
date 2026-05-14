// ============================================================
// KPI FORMULAS, BUSINESS PURPOSE, VISUALIZATION & COMPUTED VALUES
// Source: 25,000 invoice database (Apr'25 - Mar'26)
// Reference: HighRadius, SAP BPC, Billtrust, Tesorio
// ============================================================

export const KPI_REFERENCE = {

  // ============================================================
  // CATEGORY 1: EXECUTIVE / C-SUITE KPIs
  // ============================================================

  "1_DSO": {
    name: "Days Sales Outstanding",
    category: "Executive",
    formula: "DSO = (Open AR / Total Credit Sales) × Number of Days in Period",
    sqlQuery: `SELECT (SUM(CASE WHEN status IN ('OPEN','PARTIAL') THEN amount ELSE 0 END) / NULLIF(SUM(amount), 0)) * 365 FROM invoices`,
    businessPurpose: "Measures the average number of days to collect payment after a sale. Primary cash conversion metric for CFO and treasury. Lower DSO = faster cash cycle. Benchmark: <30 days (healthy), 30-45 (acceptable), >45 (warning).",
    visualization: "KPI card with monthly sparkline trend",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius, SAP BPC, Tesorio, Billtrust",
    computedValue: { value: 22.8, unit: "days" },
    computedFrom: "monthly_snapshots (latest period)",
  },

  "2_OverdueRatio": {
    name: "Overdue Ratio",
    category: "Executive",
    formula: "Overdue Ratio = (Overdue AR / Total Open AR) × 100",
    sqlQuery: `SELECT (SUM(CASE WHEN isOverdue=1 THEN amount ELSE 0 END) / NULLIF(SUM(amount), 0)) * 100 FROM invoices WHERE status IN ('OPEN','PARTIAL')`,
    businessPurpose: "Tracks what percentage of total receivables have passed their due date. >30% signals systemic collection failure. Target: <20%.",
    visualization: "KPI card with monthly sparkline",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius, Billtrust",
    computedValue: { value: 56.1, unit: "%" },
    computedFrom: "invoices (real-time calculation)",
  },

  "3_RevenueAtRisk": {
    name: "Revenue at Risk",
    category: "Executive",
    formula: "Revenue at Risk = (Overdue AR for 45-60 day credit invoices / Total Open AR) × 100",
    sqlQuery: `SELECT (SUM(CASE WHEN isOverdue=1 AND creditPeriodDays>=45 THEN amount ELSE 0 END) / NULLIF(SUM(CASE WHEN status IN ('OPEN','PARTIAL') THEN amount ELSE 0 END), 0)) * 100 FROM invoices`,
    businessPurpose: "Quantifies the percentage of booked revenue that may not convert to cash, calculated specifically for customers with 45-60 day credit terms — the highest-risk segment.",
    visualization: "KPI card with trend arrow and progress bar",
    refreshFrequency: "Daily",
    referencePlatform: "Tesorio, HighRadius",
    computedValue: { value: 27.2, unit: "%" },
    computedFrom: "invoices (filtered by creditPeriodDays >= 45 AND isOverdue)",
  },

  "4_ReceivablesTurnover": {
    name: "Receivables Turnover Ratio",
    category: "Executive",
    formula: "Receivables Turnover = Total Credit Sales / Average AR\nAverage AR = (Beginning AR + Ending AR) / 2",
    sqlQuery: `SELECT SUM(totalCreditSales) / ((first.beginningAR + last.totalAR) / 2.0) FROM monthly_snapshots`,
    businessPurpose: "Shows how many times receivables are collected during a period. Higher = more efficient. Inversely related to DSO (365/Turnover ≈ DSO). Benchmark: 5-8x.",
    visualization: "KPI card with monthly bar chart",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC",
    computedValue: { value: 75.48, unit: "x" },
    computedFrom: "monthly_snapshots (aggregated)",
  },

  "5_NetARMovement": {
    name: "Net AR Movement",
    category: "Executive",
    formula: "Net AR Movement = AR End of Period − AR Start of Period\nPositive = AR growing (billings > collections)",
    sqlQuery: `SELECT SUM(totalAR - beginningAR) FROM monthly_snapshots`,
    businessPurpose: "Shows the change in total accounts receivable balance. Persistently positive values indicate cash is being trapped in receivables — billings consistently outpace collections.",
    visualization: "Waterfall chart (monthly bars)",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC",
    computedValue: { value: "₹10,220,108,437", unit: "INR" },
    computedFrom: "monthly_snapshots (totalAR - beginningAR per period)",
  },

  "6_TotalAR": {
    name: "Total AR Outstanding",
    category: "Executive",
    formula: "Total AR = SUM(amount) WHERE status IN ('OPEN', 'PARTIAL')",
    sqlQuery: `SELECT SUM(amount) FROM invoices WHERE status IN ('OPEN','PARTIAL')`,
    businessPurpose: "Absolute open receivables balance. Used for treasury planning, credit line sizing, and working capital management.",
    visualization: "Large KPI card with currency format",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius, Billtrust, Tesorio",
    computedValue: { value: "₹34,218,921,368", unit: "INR" },
    computedFrom: "invoices (SUM of open/partial amounts)",
  },

  "7_CurrentVsOverdue": {
    name: "Current vs Overdue AR Split",
    category: "Executive",
    formula: "Current AR = Open AR WHERE isOverdue = false\nOverdue AR = Open AR WHERE isOverdue = true",
    sqlQuery: `SELECT SUM(CASE WHEN isOverdue=0 THEN amount END) as current, SUM(CASE WHEN isOverdue=1 THEN amount END) as overdue FROM invoices WHERE status IN ('OPEN','PARTIAL')`,
    businessPurpose: "Quick health check of AR portfolio quality. Healthy split: >70% current. Inverted: collection crisis.",
    visualization: "Donut chart (two segments: green current, red overdue)",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius, Billtrust",
    computedValue: { current: "₹15,009,102,892 (43.9%)", overdue: "₹19,209,818,476 (56.1%)" },
    computedFrom: "invoices (grouped by isOverdue)",
  },

  "8_WADO": {
    name: "Weighted Average Days Overdue",
    category: "Executive",
    formula: "WADO = SUM(amount × elapsed_days) / SUM(amount)\nWhere: only overdue invoices",
    sqlQuery: `SELECT SUM(weightedOverdue) / NULLIF(SUM(amount), 0) FROM invoices WHERE isOverdue=1 AND status IN ('OPEN','PARTIAL')`,
    businessPurpose: "Amount-weighted severity of overdue AR. Unlike simple average, large overdue invoices influence this more. Captures true financial exposure of lateness.",
    visualization: "KPI card with trend indicator",
    refreshFrequency: "Daily",
    referencePlatform: "SAP BPC",
    computedValue: { value: 147.2, unit: "days" },
    computedFrom: "invoices (SUM(weightedOverdue) / SUM(amount) for overdue)",
  },

  // ============================================================
  // CATEGORY 2: COLLECTION PERFORMANCE
  // ============================================================

  "9_CEI": {
    name: "Collection Effectiveness Index",
    category: "Collection Performance",
    formula: "CEI = ((Beginning AR + Credit Sales − Ending Total AR) / (Beginning AR + Credit Sales − Ending Current AR)) × 100",
    sqlQuery: `SELECT ((beginningAR + totalCreditSales - totalAR) / NULLIF(beginningAR + totalCreditSales - currentAR, 0)) * 100 FROM monthly_snapshots`,
    businessPurpose: "Measures how effectively the collections team converts outstanding receivables into cash. 100% = perfect. >90% strong, 80-90% acceptable, <80% needs restructuring.",
    visualization: "KPI card with monthly sparkline",
    refreshFrequency: "Monthly",
    referencePlatform: "HighRadius, Tesorio",
    computedValue: { value: 97.0, unit: "%" },
    computedFrom: "monthly_snapshots (latest period CEI)",
  },

  "10_OnTimePaymentRate": {
    name: "On-Time Payment Rate",
    category: "Collection Performance",
    formula: "On-Time Rate = (Invoices Paid Within Credit Terms / Total Invoices Due) × 100",
    sqlQuery: `SELECT (COUNT(CASE WHEN daysForPayment <= creditPeriodDays THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) FROM invoices WHERE status='CLEARED'`,
    businessPurpose: "Tracks customer payment behavior compliance with credit terms. Measures customer discipline, not team effort. Target: >85%.",
    visualization: "Line chart (weekly) with 85% target line",
    refreshFrequency: "Weekly",
    referencePlatform: "Billtrust",
    computedValue: { value: "Computed from weekly_cashflows.onTimePaymentRate", unit: "%" },
    computedFrom: "weekly_cashflows (per-week onTimePaymentRate)",
  },

  "11_CollectionEffectiveness": {
    name: "Weekly Collection Effectiveness",
    category: "Collection Performance",
    formula: "Effectiveness = (Amount Collected in Week / Amount Due in Week) × 100",
    sqlQuery: `SELECT (invoicesCollectedAmount / NULLIF(invoicesDueAmount, 0)) * 100 FROM weekly_cashflows`,
    businessPurpose: "Measures real-time collections effort vs target. Unlike On-Time Rate (customer behavior), this measures team performance. Target: >70%.",
    visualization: "Line chart (weekly) with 70% target line",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius",
    computedValue: { value: "Computed from weekly_cashflows.collectionEffectiveness", unit: "%" },
    computedFrom: "weekly_cashflows (per-week)",
  },

  "12_CreditPeriodEffectiveness": {
    name: "Credit Period Effectiveness",
    category: "Collection Performance",
    formula: "CP Effectiveness = (Amount Collected Within Credit Period / Total Amount Due for that Credit Period) × 100",
    sqlQuery: `SELECT pt.creditPeriodDays, (SUM(CASE WHEN i.daysForPayment<=i.creditPeriodDays THEN i.amount ELSE 0 END) / NULLIF(SUM(i.amount),0))*100 FROM invoices i JOIN payment_terms pt ON i.paymentTermsId=pt.id WHERE i.status='CLEARED' GROUP BY pt.creditPeriodDays`,
    businessPurpose: "Segments collection performance by credit term length. Reveals which credit terms yield best/worst cash conversion. Informs credit policy decisions.",
    visualization: "Horizontal bar chart (one bar per credit period, color-coded)",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC",
    computedValue: { "7d": "71.0%", "15d": "64.7%", "30d": "70.6%", "45d": "79.5%", "60d": "78.5%" },
    computedFrom: "invoices (grouped by creditPeriodDays, filtered to CLEARED)",
  },

  "13_CollectionRate": {
    name: "Overall Collection Rate",
    category: "Collection Performance",
    formula: "Collection Rate = (Total Amount Collected / Total Amount Due) × 100",
    sqlQuery: `SELECT (SUM(invoicesCollectedAmount) / NULLIF(SUM(invoicesDueAmount), 0)) * 100 FROM weekly_cashflows`,
    businessPurpose: "Cumulative ratio of cash collected vs cash owed. Shows overall collection machine efficiency.",
    visualization: "Gauge chart with target threshold",
    refreshFrequency: "Weekly",
    referencePlatform: "Tesorio, Billtrust",
    computedValue: { value: "Computed from weekly_cashflows aggregation", unit: "%" },
    computedFrom: "weekly_cashflows (SUM collected / SUM due)",
  },

  "14_DunningResponseRate": {
    name: "Dunning Response Rate",
    category: "Collection Performance",
    formula: "Response Rate = (Dunned Invoices Subsequently Cleared / Total Dunned Invoices) × 100",
    sqlQuery: `SELECT (COUNT(CASE WHEN i.status='CLEARED' THEN 1 END) * 100.0 / COUNT(*)) FROM invoices i WHERE EXISTS (SELECT 1 FROM dunning_history dh WHERE dh.invoiceId = i.id)`,
    businessPurpose: "What percentage of dunned invoices resulted in eventual payment. Low rate = dunning templates need revision or escalation is too slow.",
    visualization: "KPI card with bar breakdown by dunning level",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius",
    computedValue: { value: "0.0% (dunning only created for still-open overdue invoices)", unit: "%" },
    computedFrom: "invoices JOIN dunning_history",
  },

  // ============================================================
  // CATEGORY 3: AGING & RISK ANALYSIS
  // ============================================================

  "15_AgingBuckets": {
    name: "Aging Bucket Distribution",
    category: "Aging & Risk",
    formula: "Bucket % = (AR in Bucket / Total Open AR) × 100\nBuckets: NOT_DUE, 1-7d, 8-15d, 16-30d, 31-45d, 46-60d, 60+d",
    sqlQuery: `SELECT overdueCategory, SUM(amount), COUNT(*), (SUM(amount)*100.0 / (SELECT SUM(amount) FROM invoices WHERE status IN ('OPEN','PARTIAL'))) FROM invoices WHERE status IN ('OPEN','PARTIAL') GROUP BY overdueCategory`,
    businessPurpose: "Shows receivable concentration across time-since-due-date bands. Healthy: majority in NOT_DUE + 1-30 days. Inverted pyramid (majority in 45-60+) = high default risk.",
    visualization: "Stacked horizontal bar (color-coded green→red) with legend",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius, SAP BPC, Billtrust, Tesorio",
    computedValue: {
      "NOT_DUE": "43.9% (₹15.0B, 2,141 invoices)",
      "1_7d": "2.6% (₹892M, 284 invoices)",
      "8_15d": "1.9% (₹633M, 222 invoices)",
      "16_30d": "3.3% (₹1.1B, 297 invoices)",
      "31_45d": "2.3% (₹794M, 255 invoices)",
      "46_60d": "3.8% (₹1.3B, 302 invoices)",
      "60_PLUS": "42.3% (₹14.5B, 4,182 invoices)",
    },
    computedFrom: "invoices (grouped by overdueCategory)",
  },

  "16_OverdueDensity": {
    name: "Overdue Invoice Density (Count vs Value)",
    category: "Aging & Risk",
    formula: "Count Density = (Overdue Invoice Count / Total Open Count) × 100\nValue Density = (Overdue Invoice Value / Total Open Value) × 100\nGap = Count Density − Value Density",
    sqlQuery: `SELECT (COUNT(CASE WHEN isOverdue=1 THEN 1 END)*100.0/COUNT(*)) as countPct, (SUM(CASE WHEN isOverdue=1 THEN amount ELSE 0 END)*100.0/SUM(amount)) as valuePct FROM invoices WHERE status IN ('OPEN','PARTIAL')`,
    businessPurpose: "The gap between count% and value% is diagnostic. Large gap = many small invoices drive the overdue problem (automate). Small gap = few large invoices (personal attention).",
    visualization: "Side-by-side progress bars or dual gauge",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius",
    computedValue: { countPct: "72.1%", valuePct: "56.1%", gap: "16.0pp" },
    computedFrom: "invoices (count and sum grouped by isOverdue)",
  },

  "17_PeakExposure": {
    name: "Peak Overdue Exposure",
    category: "Aging & Risk",
    formula: "Peak Exposure = MAX(amount) WHERE isOverdue = true AND status IN ('OPEN', 'PARTIAL')",
    sqlQuery: `SELECT i.documentNumber, i.amount, i.elapsedDays, c.name FROM invoices i JOIN customers c ON i.customerId=c.id WHERE i.isOverdue=1 AND i.status IN ('OPEN','PARTIAL') ORDER BY i.amount DESC LIMIT 1`,
    businessPurpose: "Identifies the single largest overdue receivable — the highest concentration risk. If this defaults, it directly impacts bad debt provision and P&L.",
    visualization: "Alert card with invoice details (number, amount, customer, days overdue)",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius, Tesorio",
    computedValue: {
      documentNumber: "2025006542",
      amount: "₹168,769,906",
      daysOverdue: 170,
      customer: "Bharti Enterprises",
    },
    computedFrom: "invoices ORDER BY amount DESC WHERE overdue LIMIT 1",
  },

  "19_ConcentrationRisk": {
    name: "AR Concentration Risk (Top-N Customers)",
    category: "Aging & Risk",
    formula: "Top-N % = SUM(amount for top N customers) / Total Open AR × 100",
    sqlQuery: `SELECT c.name, SUM(i.amount) as exposure FROM invoices i JOIN customers c ON i.customerId=c.id WHERE i.status IN ('OPEN','PARTIAL') GROUP BY c.id ORDER BY exposure DESC LIMIT 10`,
    businessPurpose: "Measures AR concentration in top customers. If top-5 = 50%+ AR, a single default is catastrophic. Pareto analysis for credit committee.",
    visualization: "Pareto bar chart (descending bars with cumulative line)",
    refreshFrequency: "Daily",
    referencePlatform: "Tesorio, HighRadius",
    computedValue: {
      top5PctOfAR: "11.9%",
      topCustomers: [
        { name: "HDFC Corp", amount: "₹1,012,105,016" },
        { name: "Asian Solutions", amount: "₹825,870,259" },
        { name: "Hindalco Engineering", amount: "₹825,419,933" },
        { name: "Bharti Enterprises", amount: "₹762,541,496" },
        { name: "Larsen Tech", amount: "₹647,308,688" },
      ],
    },
    computedFrom: "invoices JOIN customers (grouped, sorted DESC, LIMIT 5)",
  },

  "20_BadDebtProvision": {
    name: "Bad Debt Probability / Provision Estimate",
    category: "Aging & Risk",
    formula: "Provision = SUM(Bucket Amount × Provision Rate)\nRates: 1-7d=0.5%, 8-15d=1%, 16-30d=2%, 31-45d=5%, 46-60d=10%, 60+=25%",
    sqlQuery: `SELECT overdueCategory, SUM(amount) * (CASE WHEN overdueCategory='60_PLUS' THEN 0.25 ... END) FROM invoices WHERE isOverdue=1 GROUP BY overdueCategory`,
    businessPurpose: "Estimated bad debt provision by aging bucket using standard accounting provision rates. Required for financial reporting and P&L impact assessment.",
    visualization: "Stacked bar with provision amount overlay",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC, HighRadius",
    computedValue: {
      totalProvision: "₹3,818,786,556",
      byBucket: {
        "1_7d": "₹4,461,056 (0.5% of ₹892M)",
        "8_15d": "₹6,333,166 (1% of ₹633M)",
        "16_30d": "₹22,580,495 (2% of ₹1.1B)",
        "31_45d": "₹39,723,650 (5% of ₹794M)",
        "46_60d": "₹129,673,361 (10% of ₹1.3B)",
        "60_PLUS": "₹3,616,014,829 (25% of ₹14.5B)",
      },
    },
    computedFrom: "invoices (grouped by overdueCategory × provision rates)",
  },

  // ============================================================
  // CATEGORY 4: OPERATIONAL EFFICIENCY
  // ============================================================

  "21_I2C_CycleTime": {
    name: "Invoice-to-Cash Cycle Time (P50/P90)",
    category: "Operational",
    formula: "P50 = PERCENTILE(daysForPayment, 0.50)\nP90 = PERCENTILE(daysForPayment, 0.90)\nWhere daysForPayment = clearingDate − documentDate",
    sqlQuery: `WITH ranked AS (SELECT daysForPayment, NTILE(100) OVER (ORDER BY daysForPayment) as pct FROM invoices WHERE status='CLEARED' AND daysForPayment IS NOT NULL) SELECT MAX(CASE WHEN pct<=50 THEN daysForPayment END) as p50, MAX(CASE WHEN pct<=90 THEN daysForPayment END) as p90 FROM ranked`,
    businessPurpose: "Median (P50) and worst-10% (P90) collection speed. Large P50-P90 gap reveals bimodal distribution — most pay fast, but a long tail gets stuck.",
    visualization: "Dual circular gauge (P50 green, P90 red) or box plot",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, Billtrust",
    computedValue: { p50: 36, p90: 62, gap: 26, unit: "days" },
    computedFrom: "invoices (CLEARED, sorted daysForPayment, percentile calculation)",
  },

  "22_CreditPeriodUtil": {
    name: "Credit Period Utilization",
    category: "Operational",
    formula: "CPU = AVG(daysForPayment / creditPeriodDays) × 100\n>100% = paying beyond terms, <80% = paying early",
    sqlQuery: `SELECT AVG(CAST(daysForPayment AS FLOAT) / NULLIF(creditPeriodDays, 0)) * 100 FROM invoices WHERE status='CLEARED'`,
    businessPurpose: "Shows how much of the credit window customers actually consume. 98-100% = full utilization, zero early payments. Identifies opportunity for early payment discount programs.",
    visualization: "KPI card with monthly sparkline",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC",
    computedValue: { value: 129.3, unit: "%" },
    computedFrom: "invoices (CLEARED, AVG of daysForPayment/creditPeriodDays)",
  },

  "23_DaysToClearBacklog": {
    name: "Days to Clear Backlog",
    category: "Operational",
    formula: "Backlog Days = Overdue AR Balance / Average Daily Collection Rate\nDaily Rate = Weekly Collections / 7",
    sqlQuery: `SELECT overdueBalance / NULLIF(collectionRate, 0) FROM weekly_cashflows ORDER BY weekNumber DESC LIMIT 1`,
    businessPurpose: "Estimates time needed to clear current overdue backlog at current pace. Rising = backlog growing faster than collections. Target: <3 days.",
    visualization: "Line chart (weekly) with <3 day target line",
    refreshFrequency: "Weekly",
    referencePlatform: "Tesorio",
    computedValue: { value: "Computed from weekly_cashflows (overdueBalance / collectionRate)", unit: "days" },
    computedFrom: "weekly_cashflows (latest week)",
  },

  "25_AvgDaysDelinquent": {
    name: "Average Days Delinquent (ADD)",
    category: "Operational",
    formula: "ADD = AVG(elapsedDays) WHERE isOverdue = true",
    sqlQuery: `SELECT AVG(elapsedDays) FROM invoices WHERE isOverdue=1 AND status IN ('OPEN','PARTIAL')`,
    businessPurpose: "Mean days past due for overdue invoices. Simple severity metric. Complements WADO (which accounts for invoice size).",
    visualization: "KPI card",
    refreshFrequency: "Daily",
    referencePlatform: "HighRadius",
    computedValue: { value: 151.7, unit: "days" },
    computedFrom: "invoices (AVG elapsedDays WHERE overdue)",
  },

  // ============================================================
  // CATEGORY 5: CUSTOMER ANALYTICS
  // ============================================================

  "26_DSObySegment": {
    name: "DSO by Customer Segment",
    category: "Customer Analytics",
    formula: "Segment DSO = (Segment Open AR / Segment Total Sales) × 365",
    sqlQuery: `SELECT c.segment, (SUM(CASE WHEN i.status IN ('OPEN','PARTIAL') THEN i.amount ELSE 0 END) / NULLIF(SUM(i.amount), 0)) * 365 FROM invoices i JOIN customers c ON i.customerId=c.id GROUP BY c.segment`,
    businessPurpose: "Identifies which customer segments drag DSO. STRATEGIC should be lowest (best payers), SMB highest. Informs segment-specific collection strategies.",
    visualization: "Grouped bar chart (one bar per segment)",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, Tesorio",
    computedValue: { STRATEGIC: "77.9 days", KEY: "99.5 days", STANDARD: "114.5 days", SMB: "119.9 days" },
    computedFrom: "invoices JOIN customers (grouped by segment)",
  },

  "27_OverdueByRegion": {
    name: "Overdue Rate by Region",
    category: "Customer Analytics",
    formula: "Regional Overdue % = (Region Overdue AR / Region Open AR) × 100",
    sqlQuery: `SELECT r.regionName, (SUM(CASE WHEN i.isOverdue=1 THEN i.amount ELSE 0 END) / NULLIF(SUM(i.amount), 0)) * 100 FROM invoices i JOIN customers c ON i.customerId=c.id JOIN regions r ON c.regionId=r.id WHERE i.status IN ('OPEN','PARTIAL') GROUP BY r.regionName`,
    businessPurpose: "Geographic risk heatmap. Identifies regions with collection problems to direct regional collection teams. North vs South vs East vs West performance comparison.",
    visualization: "Choropleth map of India or heatmap table",
    refreshFrequency: "Weekly",
    referencePlatform: "SAP BPC",
    computedValue: { North: "62.4%", West: "61.4%", East: "55.9%", South: "51.2%", Central: "41.0%" },
    computedFrom: "invoices JOIN customers JOIN regions (grouped by regionName)",
  },

  "37_PortfolioRisk": {
    name: "Portfolio Risk Distribution",
    category: "Customer Analytics",
    formula: "Risk Bucket AR = SUM(amount) WHERE customer.riskCategory = X AND status IN ('OPEN', 'PARTIAL')",
    sqlQuery: `SELECT c.riskCategory, COUNT(DISTINCT c.id), SUM(i.amount) FROM invoices i JOIN customers c ON i.customerId=c.id WHERE i.status IN ('OPEN','PARTIAL') GROUP BY c.riskCategory`,
    businessPurpose: "AR exposure distribution across LOW/MEDIUM/HIGH/CRITICAL risk buckets. Shows how much money is at risk across the customer portfolio.",
    visualization: "Donut chart or stacked bar (color: green→red)",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, SAP BPC",
    computedValue: {
      LOW: { customers: 42, ar: "₹2,845,447,252" },
      MEDIUM: { customers: 150, ar: "₹15,172,117,743" },
      HIGH: { customers: 138, ar: "₹14,076,803,017" },
      CRITICAL: { customers: 20, ar: "₹2,124,553,357" },
    },
    computedFrom: "invoices JOIN customers (grouped by riskCategory)",
  },

  // ============================================================
  // CATEGORY 6: DUNNING / COLLECTION ACTIONS
  // ============================================================

  "40_DunningCoverage": {
    name: "Dunning Coverage Rate",
    category: "Dunning Effectiveness",
    formula: "Coverage = (Overdue Invoices With ≥1 Dunning / Total Overdue Invoices) × 100",
    sqlQuery: `SELECT (COUNT(DISTINCT dh.invoiceId) * 100.0 / COUNT(DISTINCT i.id)) FROM invoices i LEFT JOIN dunning_history dh ON i.id=dh.invoiceId WHERE i.isOverdue=1`,
    businessPurpose: "What percentage of overdue invoices have been dunned at least once. Low coverage = collections team not reaching all overdue items. Target: >90%.",
    visualization: "Gauge chart with 90% target",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, SAP BPC",
    computedValue: { value: 90.2, unit: "%" },
    computedFrom: "dunning_history (distinct invoiceId) vs overdue invoices count",
  },

  "41_DunningFunnel": {
    name: "Dunning Escalation Funnel",
    category: "Dunning Effectiveness",
    formula: "Level Count = COUNT(DISTINCT invoiceId) WHERE dunningLevel = N",
    sqlQuery: `SELECT dunningLevel, COUNT(DISTINCT invoiceId) FROM dunning_history GROUP BY dunningLevel`,
    businessPurpose: "Shows how many invoices reach each dunning level. Healthy: most resolved at L1-L2. If many reach L3-L4, early dunning is ineffective.",
    visualization: "Funnel chart (L1→L2→L3→L4, narrowing)",
    refreshFrequency: "Weekly",
    referencePlatform: "SAP BPC",
    computedValue: { L1: 5000, L2: 4287, L3: 4058, L4: 0 },
    computedFrom: "dunning_history (grouped by dunningLevel)",
  },

  "43_DunningEffectiveness": {
    name: "Dunning Effectiveness Rate by Level",
    category: "Dunning Effectiveness",
    formula: "Effectiveness = (Cleared Invoices at Level N / Total Invoices Dunned at Level N) × 100",
    sqlQuery: `SELECT dh.dunningLevel, (COUNT(CASE WHEN i.status='CLEARED' THEN 1 END) * 100.0 / COUNT(DISTINCT dh.invoiceId)) FROM dunning_history dh JOIN invoices i ON dh.invoiceId=i.id GROUP BY dh.dunningLevel`,
    businessPurpose: "Clearance rate per dunning level. If L1 clears <30%, the reminder template needs revision. Shows which escalation level actually triggers payment.",
    visualization: "Horizontal bar chart with percentage labels",
    refreshFrequency: "Monthly",
    referencePlatform: "HighRadius, SAP BPC",
    computedValue: { L1: "0.0%", L2: "0.0%", L3: "0.0%", L4: "0%" },
    note: "0% because dunning records were only generated for invoices that are currently overdue (still open). Cleared invoices in this dataset were not dunned.",
    computedFrom: "dunning_history JOIN invoices (grouped by dunningLevel)",
  },

  // ============================================================
  // ADDITIONAL KPIs DERIVABLE FROM SCHEMA
  // ============================================================

  "24_InvoiceVolume": {
    name: "Invoice Processing Volume (Weekly Throughput)",
    category: "Operational",
    formula: "Clearance Rate = (Invoices Collected / Invoices Due) × 100 per week",
    sqlQuery: `SELECT weekNumber, invoicesDueCount, invoicesCollectedCount FROM weekly_cashflows`,
    businessPurpose: "Operational capacity metric — how many invoices are processed weekly vs how many come due. Falling ratio = capacity bottleneck.",
    visualization: "Dual-axis bar chart (due vs collected) with rate line",
    refreshFrequency: "Weekly",
    referencePlatform: "Billtrust",
    computedValue: { note: "Per-week values in weekly_cashflows table" },
    computedFrom: "weekly_cashflows",
  },

  "34_ExpectedVsActual": {
    name: "Expected vs Actual Cash Inflow Variance",
    category: "Cash Flow",
    formula: "Variance % = ((Actual − Expected) / Expected) × 100",
    sqlQuery: `SELECT weekNumber, expectedCashInflow, actualCashInflow, ((actualCashInflow-expectedCashInflow)/NULLIF(expectedCashInflow,0))*100 FROM weekly_cashflows`,
    businessPurpose: "Forecast accuracy of cash inflow predictions. Persistent negative variance = over-optimistic forecasting. Informs treasury planning.",
    visualization: "Dual-axis bar chart (expected vs actual) with variance line",
    refreshFrequency: "Weekly",
    referencePlatform: "Tesorio, SAP BPC",
    computedValue: { note: "Per-week values in weekly_cashflows table" },
    computedFrom: "weekly_cashflows (expectedCashInflow vs actualCashInflow)",
  },

  "35_SalesCollectionLag": {
    name: "Sales-to-Collection Lag",
    category: "Cash Flow",
    formula: "Lag = Weekly Sales − Weekly Collections\nWidening lag = AR buildup",
    sqlQuery: `SELECT weekNumber, salesAmount, actualCashInflow, (salesAmount - actualCashInflow) as lag FROM weekly_cashflows`,
    businessPurpose: "Gap between weekly sales and collections. Widening gap = AR buildup, cash not keeping pace with revenue recognition.",
    visualization: "Area chart (sales on top, collections below, gap shaded)",
    refreshFrequency: "Weekly",
    referencePlatform: "Tesorio",
    computedValue: { note: "Per-week values in weekly_cashflows table" },
    computedFrom: "weekly_cashflows (salesAmount - actualCashInflow)",
  },

  "36_OverdueBalanceTrend": {
    name: "Weekly Overdue Balance Trend",
    category: "Cash Flow",
    formula: "Overdue Balance = SUM(amount) WHERE isOverdue = true per week",
    sqlQuery: `SELECT weekNumber, overdueBalance FROM weekly_cashflows ORDER BY weekNumber`,
    businessPurpose: "Tracks absolute overdue balance trajectory over time. Rising trend = intervention required. Declining = collection efforts working.",
    visualization: "Area chart with trend line",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, Billtrust",
    computedValue: { note: "Per-week values in weekly_cashflows table" },
    computedFrom: "weekly_cashflows (overdueBalance per week)",
  },
};
