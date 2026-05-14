// ============================================================
// CHATBOT ENGINE — KPI Knowledge Base + Query Matching
// Returns situation-aware answers based on actual dashboard data
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

interface KPIEntry {
  keywords: string[];
  name: string;
  category: string;
  situation: string;
}

const kpiKnowledgeBase: KPIEntry[] = [
  {
    keywords: ["dso", "days sales outstanding", "collection days", "how long to collect"],
    name: "Days Sales Outstanding (DSO)",
    category: "Executive",
    situation: `Current DSO stands at ${dsoData.overall} days overall. Monthly trend: Jan'26 = ${dsoData.monthly[0].value} days, Feb = ${dsoData.monthly[1].value} days, Mar = ${dsoData.monthly[2].value} days. This is a WARNING situation — DSO has surged 13.5x from Jan to Mar, indicating a rapidly deteriorating collection cycle. At this trajectory, DSO could breach 45 days by Q2. Immediate action recommended: escalate AR follow-ups on all invoices 30+ days overdue.`,
  },
  {
    keywords: ["overdue", "overdue ratio", "past due", "late payments"],
    name: "Overdue Ratio",
    category: "Executive",
    situation: `Overdue Ratio is at ${overdueRatioData.overall}% overall. Monthly trend: Jan = ${overdueRatioData.monthly[0].value}%, Feb = ${overdueRatioData.monthly[1].value}%, Mar = ${overdueRatioData.monthly[2].value}%. WARNING: Nearly half of all receivables are past due. The ratio mirrors the DSO trend, confirming systemic collection delays — not isolated incidents. Combined with 91.7% overdue invoice density by count, the problem is driven by a high volume of small overdue invoices.`,
  },
  {
    keywords: ["revenue at risk", "revenue risk", "revenue jeopardy", "cash risk"],
    name: "Revenue at Risk",
    category: "Executive",
    situation: `Revenue at Risk is critically high at ${revenueAtRiskData.value}% (vs last week). Nearly 3 in 4 dollars of recognized revenue may not convert to cash. Combined with 40-day DSO and 40% overdue ratio, a liquidity crunch could materialize within 30 days. This is a CRITICAL alert — CFO should evaluate triggering working capital contingency protocols.`,
  },
  {
    keywords: ["receivables turnover", "turnover ratio", "collection frequency", "how often collected"],
    name: "Receivables Turnover Ratio",
    category: "Executive",
    situation: `Receivables Turnover is ${receivablesTurnoverData.overall}x overall. Monthly trend: Jan = ${receivablesTurnoverData.monthly[0].value}x, Feb = ${receivablesTurnoverData.monthly[1].value}x, Mar = ${receivablesTurnoverData.monthly[2].value}x. DECLINING: Turnover has collapsed 68% in 3 months (3.1x → 1.0x). At 1.0x, receivables are being collected only once per period — far below the 5-8x industry benchmark. Collections capacity is overwhelmed relative to billing volume.`,
  },
  {
    keywords: ["net ar", "ar movement", "accounts receivable movement", "receivable balance", "waterfall"],
    name: "Net AR Movement",
    category: "Executive",
    situation: `Net AR Movement: Jan = ${formatCurrency(netARMovementData.monthly[0].value)}, Feb = ${formatCurrency(netARMovementData.monthly[1].value)}, Mar = ${formatCurrency(netARMovementData.monthly[2].value)}. The waterfall shows a massive Jan spike, a sharp Feb dip (likely a large payment/write-off, not improved collections), and a Mar rebound to near-Jan levels. Total Q1 AR movement is ~441.6M — this represents cash trapped in receivables. The structural collection problem persists.`,
  },
  {
    keywords: ["cei", "collection effectiveness", "collection index", "collection efficiency"],
    name: "Collection Effectiveness Index (CEI)",
    category: "Collection Efficiency",
    situation: `CEI is ${ceiData.overall}% overall (strong on paper). But monthly trend tells a different story: Jan = ${ceiData.monthly[0].value}%, Feb = ${ceiData.monthly[1].value}%, Mar = ${ceiData.monthly[2].value}%. DECLINING: The Mar drop to 80.4% is a red flag, approaching the "needs attention" threshold. The overall figure is inflated by earlier months. If the trend continues, CEI will fall below 75% by May, requiring collections team restructuring.`,
  },
  {
    keywords: ["on time", "on-time payment", "timely payment", "payment rate", "paid on time"],
    name: "On-Time Payment Rate",
    category: "Collection Efficiency",
    situation: `On-Time Payment Rate (weekly): ranges from ${Math.min(...onTimePaymentData.weekly.map(w => w.value))}% (W2) to ${Math.max(...onTimePaymentData.weekly.map(w => w.value))}% (W12-W13). Strong finish at 100% in final 2 weeks, but high volatility throughout Q1. The W2 low of 49% and W10 dip to 58% suggest mid-quarter collection lulls. W12-W13 spike likely reflects quarter-end push collections. Recommendation: smooth the collections cadence to avoid feast-or-famine cycles. Target is >85%.`,
  },
  {
    keywords: ["weekly collection", "collection weekly", "weekly effectiveness"],
    name: "Collection Effectiveness (Weekly)",
    category: "Collection Efficiency",
    situation: `Weekly Collection Effectiveness is highly erratic: swings from 0% (W2) to 80% (W3) with no discernible pattern. Average is ~45%, well below the 70% target. W11 crashed to 19%, W13 at 38%. The contrast with On-Time Payment (which hit 100%) suggests payments ARE coming in, but collections activity is inconsistent. The team is not maintaining consistent effort — this needs process discipline.`,
  },
  {
    keywords: ["collection period", "credit period effectiveness", "credit term", "credit bucket"],
    name: "Collection Period Effectiveness",
    category: "Collection Efficiency",
    situation: `Collection Period Effectiveness by credit terms: ${collectionPeriodEffectivenessData.data.map(d => `${d.creditPeriod}: ${d.value}%`).join(", ")}. Striking pattern: 7-45 day terms cluster around 39-41% (flat), but 60-day terms jump to 71.6%. Longer credit terms paradoxically yield better collection — likely because 60-day customers are larger, established accounts with dedicated AP teams. The 7-30 day segment needs targeted intervention.`,
  },
  {
    keywords: ["aging", "aging bucket", "aging distribution", "how old", "invoice age"],
    name: "Aging Bucket Distribution",
    category: "Aging & Risk",
    situation: `Aging Distribution: ${agingBucketData.data.map(d => `${d.bucket}: ${d.percentage}%`).join(", ")}. WARNING: 65% of receivables are concentrated in 45-60 day buckets (34% + 31%). Only 21% is in the healthy 7-15 day range. This is an inverted aging pyramid — a healthy distribution should show 60%+ in 0-30 days. Implies systematic late payments and potentially inadequate credit policies for the 45-60 day customer segment.`,
  },
  {
    keywords: ["overdue density", "overdue invoice", "invoice count", "invoice value split", "density"],
    name: "Overdue Invoice Density vs Value Split",
    category: "Aging & Risk",
    situation: `Overdue Invoice Density: ${overdueInvoiceDensityData.count}% by count, ${overdueInvoiceDensityData.value}% by value. The 18.5 percentage point gap confirms the overdue problem is driven by high volume of smaller invoices. Large invoices (26.8% by value) are being paid more reliably. Strategy: automate collections for small invoices below a threshold, and focus human effort on high-value overdue accounts.`,
  },
  {
    keywords: ["peak exposure", "largest overdue", "biggest invoice", "highest risk", "peak overdue"],
    name: "Peak Overdue Exposure",
    category: "Aging & Risk",
    situation: `Peak Overdue Exposure: ${formatCurrency(peakOverdueExposureData.amount)} on Invoice #${peakOverdueExposureData.invoiceNo}, Company Code ${peakOverdueExposureData.companyCode}, ${peakOverdueExposureData.daysOverdue} days overdue. This single ~10M invoice likely represents 2-5% of total AR. CRITICAL: Requires immediate executive-level escalation, direct CFO-to-CFO communication, and evaluation of whether to provision a partial allowance for doubtful accounts.`,
  },
  {
    keywords: ["invoice to cash", "cycle time", "p50", "p90", "how fast", "cash cycle"],
    name: "Invoice to Cash Cycle Time",
    category: "Operational",
    situation: `Invoice-to-Cash Cycle Time: P50 (median) = ${invoiceToCashData.p50} days, P90 (worst 10%) = ${invoiceToCashData.p90} days. P50 of 8 days is excellent — half of invoices clear within 8 days. But the P90 of 30 days reveals a long tail problem. The 22-day gap between P50 and P90 suggests a bimodal distribution: most invoices clear fast, but ~10% get stuck for a month. These stuck invoices are driving the 40-day DSO and 65% aging concentration in 45-60 day buckets.`,
  },
  {
    keywords: ["credit utilization", "credit period utilization", "payment timing", "paying late", "paying early"],
    name: "Credit Period Utilization",
    category: "Operational",
    situation: `Credit Period Utilization: ${creditPeriodUtilizationData.overall}% overall. Monthly: Jan = ${creditPeriodUtilizationData.monthly[0].value}%, Feb = ${creditPeriodUtilizationData.monthly[1].value}%, Mar = ${creditPeriodUtilizationData.monthly[2].value}%. IMPROVING but concerning: Jan at 136.78% meant customers paying 37% beyond terms. Feb-Mar normalized to 60-67%, but overall 98.3% means customers use virtually all their credit window. Zero early payments. Consider 2/10 net 30 discounts to incentivize earlier payment.`,
  },
  {
    keywords: ["backlog", "clear backlog", "days to clear", "overdue backlog"],
    name: "Days to Clear Backlog",
    category: "Operational",
    situation: `Days to Clear Backlog (weekly): trending upward from ${Math.min(...daysToClearBacklogData.weekly.map(w => w.value))} days (W10) to ${daysToClearBacklogData.weekly[daysToClearBacklogData.weekly.length - 1].value} days (W13). This 3.5x increase in 3 weeks indicates the collection team is falling behind. If this trend persists, the backlog will become unmanageable by W16-W17. The W10 low coincides with mid-quarter collection push — confirming the feast-or-famine pattern.`,
  },
];

// --- Overall summary for general questions ---
const overallSummary = `
**Q1 2026 Working Capital Health Summary:**

The dashboard shows a CONCERNING overall picture:

• **DSO: ${dsoData.overall} days** — surging rapidly (2→27 days, Jan-Mar), collection cycle is deteriorating
• **Overdue Ratio: ${overdueRatioData.overall}%** — nearly half of all receivables are past due
• **Revenue at Risk: ${revenueAtRiskData.value}%** — 3 in 4 dollars of revenue in jeopardy
• **Receivables Turnover: ${receivablesTurnoverData.overall}x** — far below the 5-8x industry benchmark, declining monthly
• **CEI: ${ceiData.overall}%** — looks strong overall but trending down (80.4% in Mar)
• **Aging: 65% in 45-60 day buckets** — inverted aging pyramid, dangerous concentration
• **Peak Exposure: ${formatCurrency(peakOverdueExposureData.amount)}** — single invoice at ${peakOverdueExposureData.daysOverdue} days overdue
• **Backlog: trending up to ${daysToClearBacklogData.weekly[daysToClearBacklogData.weekly.length - 1].value} days** — collection team falling behind

**Top 3 Actions Needed:**
1. Escalate AR follow-ups on all 30+ day invoices, especially Invoice #${peakOverdueExposureData.invoiceNo}
2. Address the feast-or-famine collection pattern — smooth weekly collections effort
3. Automate small invoice collections and focus human effort on high-value overdue accounts
`.trim();

export function getChatResponse(query: string): string {
  const q = query.toLowerCase().trim();

  // General / summary questions
  const generalKeywords = [
    "overall", "summary", "how are we doing", "situation", "health",
    "dashboard", "everything", "all kpi", "what's happening", "tell me",
    "status", "overview", "general", "how is", "what is the current",
    "working capital", "receivables health",
  ];
  if (generalKeywords.some((k) => q.includes(k)) || q.length < 10) {
    return overallSummary;
  }

  // Category-level questions
  if (q.includes("executive") || q.includes("c-suite") || q.includes("cfo")) {
    const execs = kpiKnowledgeBase.filter((k) => k.category === "Executive");
    return `**Executive KPIs — Current Situation:**\n\n${execs.map((k) => `**${k.name}:**\n${k.situation}`).join("\n\n")}`;
  }
  if (q.includes("collection") && (q.includes("efficiency") || q.includes("section") || q.includes("all"))) {
    const cols = kpiKnowledgeBase.filter((k) => k.category === "Collection Efficiency");
    return `**Collection Efficiency — Current Situation:**\n\n${cols.map((k) => `**${k.name}:**\n${k.situation}`).join("\n\n")}`;
  }
  if (q.includes("aging") || (q.includes("risk") && !q.includes("revenue"))) {
    const risks = kpiKnowledgeBase.filter((k) => k.category === "Aging & Risk");
    return `**Aging & Risk KPIs — Current Situation:**\n\n${risks.map((k) => `**${k.name}:**\n${k.situation}`).join("\n\n")}`;
  }
  if (q.includes("operational") || q.includes("process") || q.includes("efficiency")) {
    const ops = kpiKnowledgeBase.filter((k) => k.category === "Operational");
    return `**Operational KPIs — Current Situation:**\n\n${ops.map((k) => `**${k.name}:**\n${k.situation}`).join("\n\n")}`;
  }

  // Specific KPI matching — score each entry
  let bestMatch: KPIEntry | null = null;
  let bestScore = 0;

  for (const entry of kpiKnowledgeBase) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        score += kw.split(" ").length; // multi-word matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    return `**${bestMatch.name}** _(${bestMatch.category})_\n\n${bestMatch.situation}`;
  }

  // Fallback — try to find any word match
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  for (const entry of kpiKnowledgeBase) {
    for (const kw of entry.keywords) {
      for (const word of words) {
        if (kw.includes(word) || word.includes(kw)) {
          return `**${entry.name}** _(${entry.category})_\n\n${entry.situation}`;
        }
      }
    }
  }

  // Suggest available topics
  return `I can answer questions about any of these KPIs:\n\n**Executive:** DSO, Overdue Ratio, Revenue at Risk, Receivables Turnover, Net AR Movement\n**Collection Efficiency:** CEI, On-Time Payment Rate, Weekly Collection Effectiveness, Collection Period Effectiveness\n**Aging & Risk:** Aging Buckets, Overdue Invoice Density, Peak Overdue Exposure\n**Operational:** Invoice-to-Cash Cycle Time, Credit Period Utilization, Days to Clear Backlog\n\nTry asking: *"What's the current DSO situation?"* or *"Tell me about aging"* or *"Overall summary"*`;
}

// Suggested questions for quick access
export const suggestedQuestions = [
  "What's the overall situation?",
  "How is DSO trending?",
  "What's our revenue at risk?",
  "Tell me about aging buckets",
  "How is collection efficiency?",
  "What's the peak exposure?",
  "Invoice to cash cycle time?",
  "Days to clear backlog?",
];
