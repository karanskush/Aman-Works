// ============================================================
// ADVANCED & RECOMMENDED KPIs — "What's Driving DSO" Story Layer
// Computed from 25,000-invoice database (Apr'25 - Mar'26)
// Reference: HighRadius, SAP BPC, Tesorio, Billtrust, BlackLine
// ============================================================
// These KPIs go beyond standard metrics to tell a STORY:
// - What is decomposing/driving DSO?
// - What is the organization's overall health?
// - What will happen next (leading indicators)?
// - Where are process bottlenecks?
// - How efficient is the working capital machine?
// ============================================================

export const ADVANCED_KPIS = {

  // ============================================================
  // DSO DECOMPOSITION — "What's Actually Driving DSO?"
  // ============================================================

  "DSO_Bridge": {
    name: "DSO Bridge (Waterfall Decomposition)",
    category: "DSO Decomposition",
    formula: `Segment_DSO = (Segment_Open_AR / Segment_Total_Sales) × 365
Contribution = (Segment_DSO − Blended_DSO) × (Segment_Sales / Total_Sales)
Sum of all contributions = 0 (they explain deviations from blended DSO)`,
    businessPurpose: "Shows exactly which customer segments pull DSO up or down — turns a single number into an actionable decomposition, like a revenue bridge for receivables.",
    visualization: "Waterfall chart with positive (red) and negative (green) bars per segment",
    refreshFrequency: "Weekly",
    referencePlatform: "SAP BPC, BlackLine",
    computedValue: {
      blendedDSO: "96.7 days",
      STRATEGIC: "77.9d (34.1% weight) → REDUCES DSO by 6.4 days",
      KEY: "99.5d (38.8% weight) → INCREASES DSO by 1.1 days",
      STANDARD: "114.5d (17.5% weight) → INCREASES DSO by 3.1 days",
      SMB: "119.9d (9.6% weight) → INCREASES DSO by 2.2 days",
      insight: "STRATEGIC segment (34% of sales) pulls DSO DOWN 6.4 days. STANDARD+SMB segments (27% of sales) push it UP 5.3 days. Fixing STANDARD/SMB collection would compress DSO by 5+ days.",
    },
  },

  "DSO_Velocity": {
    name: "DSO Rate of Change (Velocity)",
    category: "DSO Decomposition",
    formula: "DSO Velocity = ((DSO_current − DSO_prior) / DSO_prior) × 100",
    businessPurpose: "DSO of 35 is meaningless without direction. Three consecutive months of +5% velocity is a structural deterioration signal, not noise.",
    visualization: "Sparkline with color arrows (green=declining, red=rising) and 3-month moving average",
    refreshFrequency: "Monthly",
    referencePlatform: "Tesorio",
    computedValue: {
      latestVelocity: "-3.3% (improving)",
      pattern: "Highly volatile (range: -56% to +187%). Recent trend: stabilizing around 17-23 day DSO for monthly snapshots.",
    },
  },

  "TermsMixDrag": {
    name: "Terms Mix Drag Index",
    category: "DSO Decomposition",
    formula: `Weighted Avg Terms = SUM(creditPeriodDays × amount) / SUM(amount)
Avg Actual Payment = AVG(daysForPayment) for CLEARED invoices
Drag = Actual Payment Days − Weighted Terms (positive = customers paying late)`,
    businessPurpose: "Separates DSO increases caused by customers paying late from those caused by sales granting longer terms — two different problems with different owners (collections vs sales).",
    visualization: "Dual-line chart: granted terms vs actual payment, gap shaded",
    refreshFrequency: "Monthly",
    referencePlatform: "BlackLine",
    computedValue: {
      weightedAvgTerms: "41.5 days",
      avgActualPayDays: "35.5 days",
      drag: "-6.0 days (customers paying FASTER than terms on average)",
      insight: "Negative drag means customers are paying 6 days before their terms on average. The DSO issue is NOT from late payments — it's from the 42.3% of AR stuck in 60+ day overdue where no clearing happens.",
    },
  },

  // ============================================================
  // ORGANIZATION HEALTH — "How Healthy Are We Overall?"
  // ============================================================

  "AR_HealthScore": {
    name: "AR Health Score (Composite 0-100)",
    category: "Organization Health",
    formula: `Score = DSO_Score(20%) + CEI_Score(20%) + Overdue_Score(15%) + Aging_Score(15%) + Concentration_Score(15%) + Trend_Score(15%)
Each sub-score normalized 0-100 against benchmarks`,
    businessPurpose: "A single number for board reporting — 'Our AR health is 49/100, Grade D' — synthesizing six dimensions of receivable quality into one actionable metric.",
    visualization: "Circular gauge (0-100) with color bands + spider/radar chart of 6 sub-scores",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius (AR Intelligence), BlackLine",
    computedValue: {
      score: 49,
      grade: "D",
      components: {
        DSO: "0/100 — DSO of 96.7d far exceeds benchmark (20-60d range scores 0-100)",
        CEI: "96/100 — Excellent collection effectiveness at 97%",
        Overdue: "44/100 — 56.1% overdue is severe",
        Aging: "44/100 — Only 43.9% of AR is not yet due",
        Concentration: "76/100 — Top-5 customers = 11.9% of AR (acceptable)",
        Trend: "37/100 — DSO velocity is volatile and mostly positive (worsening)",
      },
      insight: "Grade D driven by DSO (0/100) and overdue ratio (44/100). CEI is the bright spot at 96/100 — the team converts what they chase, but too much AR sits untouched in 60+ days. Fix the 60+ day bucket to raise score to C (60+).",
    },
  },

  // ============================================================
  // PREDICTIVE / LEADING INDICATORS — "What Will Go Wrong Next?"
  // ============================================================

  "PBDI": {
    name: "Payment Behavior Deterioration Index",
    category: "Predictive",
    formula: `PBDI = ((Avg payment days last 90d − Avg payment days prior 90d) / Avg prior) × 100
Flag customers where PBDI > 15% (deteriorating)`,
    businessPurpose: "Catches customers sliding toward default 60-90 days before they hit critical aging buckets — the earliest warning signal available in transactional data.",
    visualization: "Scatter plot: X=current avg days, Y=PBDI%. Top-right = slow AND getting slower. Table of flagged customers.",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius (AI Prioritization), Tesorio",
    computedValue: {
      customersDeterioring: 88,
      top5: [
        "Hindalco Group: PBDI +525% (4d → 23d avg payment)",
        "HDFC Group: PBDI +108% (9d → 18d)",
        "ICICI Enterprises: PBDI +103% (9d → 17d)",
        "Hindalco Chemicals: PBDI +93% (17d → 33d)",
        "Jindal Chemicals: PBDI +84% (12d → 22d)",
      ],
      insight: "88 customers showing deteriorating payment behavior. Hindalco Group surged from 4 to 23 day average — a 525% increase signals potential financial stress.",
    },
  },

  "CreditLimitUtilization": {
    name: "Credit Limit Utilization Heatmap",
    category: "Predictive",
    formula: "Utilization = (Open AR for Customer / Credit Limit) × 100",
    businessPurpose: "Customers approaching credit limits will either stop ordering (revenue risk) or be forced to pay (collection opportunity) — the CFO needs to know before it happens.",
    visualization: "Heatmap matrix: rows=customers sorted by utilization, red threshold at 80%+",
    refreshFrequency: "Daily",
    referencePlatform: "SAP BPC (Credit Management), HighRadius",
    computedValue: {
      customersAbove70Pct: 350,
      customersAbove100Pct: 349,
      insight: "349 of 350 customers exceed 100% credit limit utilization — credit limits in the seed data are set too low relative to AR volumes. In a production system, this would trigger order blocks.",
      top3: [
        "JSW Engineering: 6,511% utilization (₹65M open vs ₹1M limit)",
        "ONGC Corp: 6,391% utilization",
        "HDFC Engineering: 5,901% utilization",
      ],
    },
  },

  // ============================================================
  // COLLECTION TEAM PRODUCTIVITY — "How Efficient Is the Team?"
  // ============================================================

  "EscalationVelocity": {
    name: "Dunning Escalation Velocity",
    category: "Collection Productivity",
    formula: "Avg days between Level N and Level N+1 dunning for same invoice",
    businessPurpose: "Reveals whether the collection team escalates too slowly (giving delinquent customers free float) or too aggressively (damaging relationships).",
    visualization: "Box plot per transition (L1→L2, L2→L3) showing median, P25, P75",
    refreshFrequency: "Monthly",
    referencePlatform: "HighRadius",
    computedValue: {
      "L1→L2": "10.0 days",
      "L2→L3": "10.0 days",
      insight: "Uniform 10-day escalation cadence is built into the system. In practice, this should be risk-adjusted — CRITICAL customers escalate in 5 days, LOW risk in 15 days.",
    },
  },

  // ============================================================
  // CUSTOMER PAYMENT INTELLIGENCE — "Who Pays How?"
  // ============================================================

  "PaymentConsistency": {
    name: "Payment Consistency Score (CV-based)",
    category: "Customer Intelligence",
    formula: `Consistency Score = (1 − Coefficient of Variation) × 100
CV = StdDev(daysForPayment) / Avg(daysForPayment)
Score 100 = perfectly consistent, 0 = completely random`,
    businessPurpose: "A customer averaging 30 days with CV=0.1 is reliable for cash forecasting; one averaging 30 days with CV=0.8 makes treasury planning impossible despite the same average.",
    visualization: "Ranked bar chart of consistency scores with segment color coding",
    refreshFrequency: "Monthly",
    referencePlatform: "Tesorio, HighRadius",
    computedValue: {
      portfolioAvgScore: 48,
      mostUnpredictable: [
        "Adani Solutions: Score 0 (CV 1.01, avg 18d) — completely random",
        "Bajaj Pvt Ltd: Score 0 (CV 1.03, avg 18d)",
        "Mahindra Ltd: Score 0 (CV 1.05, avg 19d)",
      ],
      mostPredictable: [
        "ACC Corp: Score 78 (avg 58d) — reliable late payer",
        "BHEL Systems: Score 77 (avg 54d)",
        "ICICI Enterprises: Score 74 (avg 47d)",
      ],
      insight: "Portfolio avg score of 48/100 means payment behavior is generally unpredictable. The most predictable customers are actually LATE but CONSISTENT — better for planning than fast but random.",
    },
  },

  "DiscountCapture": {
    name: "Early Payment Discount Capture Rate",
    category: "Customer Intelligence",
    formula: `Capture Rate = (Invoices paid within discount window / Total discount-eligible invoices) × 100
Missed Value = SUM(discount % × amount) for invoices that missed the window`,
    businessPurpose: "If customers aren't taking available discounts, either the discount isn't attractive enough or customers don't know about it — both are fixable. Quantifies the missed opportunity.",
    visualization: "Funnel: eligible → captured. KPI card with missed discount value",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC, Billtrust",
    computedValue: {
      eligible: "17,317 invoices",
      captured: "1,087 invoices",
      captureRate: "6.3%",
      missedDiscountValue: "₹1,627,095,306",
      insight: "Only 6.3% of invoices captured the early payment discount. ₹1.63B in potential discount savings was missed — this suggests either customers don't know about discounts or the terms aren't attractive enough.",
    },
  },

  // ============================================================
  // PROCESS BOTTLENECK — "Where Do Things Get Stuck?"
  // ============================================================

  "DunningGap": {
    name: "Dunning Gap (Days to First Action)",
    category: "Process Bottleneck",
    formula: "Gap = First dunning date − Due date (how many days after overdue before anyone notices)",
    businessPurpose: "If first dunning averages 15 days after due date, that's 15 days of free float given to every delinquent customer before anyone notices — the single biggest controllable lever.",
    visualization: "Distribution histogram with target line at 1-3 days. Split by company code.",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, SAP BPC",
    computedValue: {
      avgDaysAfterDue: "12.5 days",
      median: "13 days",
      invoicesTracked: 5000,
      insight: "First dunning happens 12.5 days AFTER the invoice is overdue. That's 12.5 days of free float. Reducing this to 1-3 days could improve DSO by 10+ days. This is the #1 process fix available.",
    },
  },

  // ============================================================
  // DISPUTE / DEDUCTION ANALYTICS — "Won't Pay vs Can't Pay"
  // ============================================================

  "DisputeAdjustedDSO": {
    name: "Dispute-Adjusted DSO",
    category: "Dispute Analytics",
    formula: `Clean DSO = ((Total Open AR − Blocked/Disputed AR) / Total Sales) × 365
Dispute DSO = (Blocked AR / Total Sales) × 365
Total DSO = Clean DSO + Dispute DSO`,
    businessPurpose: "Separates 'won't pay' from 'can't pay due to dispute.' The collection team shouldn't be measured on disputed invoices they cannot influence.",
    visualization: "Stacked bar: Clean DSO (green) + Dispute DSO (orange) = Total. Monthly trend.",
    refreshFrequency: "Weekly",
    referencePlatform: "HighRadius, BlackLine",
    computedValue: {
      totalDSO: "96.7 days",
      cleanDSO: "87.6 days",
      disputeDSO: "9.1 days",
      blockedInvoices: 844,
      blockedAR: "₹3,213,190,299",
      insight: "9.1 days of DSO (9.4%) is caused by 844 disputed/blocked invoices worth ₹3.2B. The collection team should be measured on the 87.6-day Clean DSO, not the total. Dispute resolution is a separate process.",
    },
  },

  "DunningBlockRate": {
    name: "Dunning Block Rate",
    category: "Dispute Analytics",
    formula: "Block Rate = (Invoices with dunning block / Total dunned invoices) × 100",
    businessPurpose: "High block rates mean either the invoicing process generates errors or the team over-uses blocks to avoid difficult conversations — both are fixable.",
    visualization: "KPI card with trend. Drill-down by block reason code.",
    refreshFrequency: "Weekly",
    referencePlatform: "SAP BPC",
    computedValue: {
      rate: "16.9%",
      blockedCount: 844,
      totalDunned: 5000,
      insight: "16.9% of dunned invoices are blocked. This is moderate — industry avg is 10-15%. Review block reason codes to identify if blocks are legitimate disputes or team avoidance.",
    },
  },

  // ============================================================
  // WORKING CAPITAL EFFICIENCY — "How Much Does Slow Collection Cost?"
  // ============================================================

  "CarryingCost": {
    name: "Cost of Carrying Receivables",
    category: "Working Capital",
    formula: `Daily Cost = Total Open AR × (Cost of Capital / 365)
Annual Cost = Total Open AR × Cost of Capital × (Avg Days Outstanding / 365)
Cost per Day DSO Reduction = Total Open AR × Cost of Capital / 365`,
    businessPurpose: "Converts abstract DSO days into rupees — 'every day of DSO improvement saves ₹9.4M per day' makes the CFO's business case for investment in AR automation.",
    visualization: "KPI card with daily/monthly/annual cost. Sensitivity slider for cost-of-capital rate.",
    refreshFrequency: "Daily",
    referencePlatform: "SAP BPC, BlackLine, Tesorio",
    computedValue: {
      dailyCost: "₹9,375,047",
      monthlyCost: "₹281,251,409",
      annualCost: "₹1,272,801,425",
      avgDaysOutstanding: "136 days",
      costPerDayDSOReduction: "₹9,375,047/day",
      insight: "At 10% cost of capital, each day of DSO costs ₹9.4M. Reducing DSO by just 10 days saves ₹93.8M annually. The carrying cost of ₹1.27B/year is a direct P&L drag.",
    },
  },

  "CashFlowLeakage": {
    name: "Free Cash Flow Leakage",
    category: "Working Capital",
    formula: `Best Possible DSO = Weighted Avg Credit Terms (if everyone paid on time)
Leakage Days = Actual DSO − Best Possible DSO
Leakage INR = Leakage Days × (Total Sales / 365)`,
    businessPurpose: "Quantifies in absolute rupees how much cash is trapped due to customers exceeding their credit terms — the exact size of the improvement opportunity.",
    visualization: "Waterfall: Best-possible AR → Actual AR, gap labeled as leakage in ₹",
    refreshFrequency: "Weekly",
    referencePlatform: "Tesorio, BlackLine",
    computedValue: {
      bestPossibleDSO: "41.5 days",
      actualDSO: "96.7 days",
      leakageDays: "55.2 days",
      leakageINR: "₹19,538,505,540",
      insight: "₹19.5B is trapped in AR beyond what credit terms should allow. This is cash that SHOULD be in the bank but ISN'T. The 55.2-day gap between best-possible and actual DSO is the total collection failure window.",
    },
  },

  // ============================================================
  // INTERNAL BENCHMARKING — "Which Entity Performs Best?"
  // ============================================================

  "CompanyCodeIndex": {
    name: "Company Code Performance League Table",
    category: "Benchmarking",
    formula: "Per company code: compute DSO, Overdue Ratio, Open AR, invoice count. Rank across all metrics.",
    businessPurpose: "Forces healthy internal competition between business units and identifies which company code's practices should be replicated across the organization.",
    visualization: "Radar/spider chart with one polygon per company code, or league table with conditional formatting",
    refreshFrequency: "Monthly",
    referencePlatform: "SAP BPC",
    computedValue: {
      "1000_HQ": { dso: "96.8d", overdueRatio: "51.9%", openAR: "₹11.8B", invoices: 2559 },
      "2000_Manufacturing": { dso: "86.6d", overdueRatio: "57.6%", openAR: "₹9.8B", invoices: 2548 },
      "3000_Services": { dso: "106.3d", overdueRatio: "59.0%", openAR: "₹12.6B", invoices: 2576 },
      insight: "Manufacturing Division (2000) leads with lowest DSO (86.6d). Services (3000) lags at 106.3d with 59% overdue — needs targeted intervention. HQ (1000) is mid-range but has lowest overdue ratio.",
    },
  },

  "SegmentEfficiency": {
    name: "Segment Profitability-Adjusted AR Efficiency Score",
    category: "Benchmarking",
    formula: `Efficiency = (1 / Segment_DSO) × Collection_Rate × (1 − Overdue_Ratio)
Normalized to 0-1000 scale. Higher = more capital-efficient segment.`,
    businessPurpose: "A segment with high DSO but high collection rate may be more capital-efficient than one with low DSO but chronic disputes — this score captures the full picture.",
    visualization: "Quadrant scatter: X=DSO, Y=Collection Rate, bubble size=AR, color=segment",
    refreshFrequency: "Monthly",
    referencePlatform: "HighRadius, BlackLine",
    computedValue: {
      STRATEGIC: { dso: "77.9d", collectionRate: "78.6%", overdueRatio: "37.6%", efficiencyScore: 630 },
      KEY: { dso: "99.5d", collectionRate: "72.7%", overdueRatio: "52.1%", efficiencyScore: 350 },
      STANDARD: { dso: "114.5d", collectionRate: "68.6%", overdueRatio: "72.7%", efficiencyScore: 163 },
      SMB: { dso: "119.9d", collectionRate: "67.2%", overdueRatio: "83.5%", efficiencyScore: 93 },
      insight: "STRATEGIC is 6.8x more efficient than SMB (630 vs 93). The gap is driven by 83.5% overdue ratio in SMB vs 37.6% in STRATEGIC. SMB segment needs automated collections or tighter credit terms.",
    },
  },
};
