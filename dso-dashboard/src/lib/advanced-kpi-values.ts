// ============================================================
// Maps the static KPI_REGISTRY entries to dynamic per-slice
// display values. The Advanced dashboard's visualizations expect
// details in a specific string/object shape — this module produces
// that shape from the live data slice so tiles refresh on filter change.
// ============================================================

import type { QuarterData } from "./computed-kpis";
import type { TrendDirection } from "./kpi-registry";

export type DetailValue = string | number | Record<string, string | number>;

export interface DynamicKPIValues {
  primaryValue: string;
  primaryUnit: string;
  insight: string;
  trend: TrendDirection;
  details: Record<string, DetailValue>;
}

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits);
}

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `₹${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function gradeOf(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function severityTrend(good: boolean): TrendDirection {
  return good ? "stable" : "warning";
}

export function getAdvancedKPIValues(kpiId: string, slice: QuarterData): DynamicKPIValues | null {
  const adv = slice.advanced;
  switch (kpiId) {
    case "dso-bridge": {
      const segments = adv.dsoBridge.segments;
      const details: Record<string, DetailValue> = {
        blendedDSO: fmt(adv.dsoBridge.blendedDSO),
      };
      for (const s of segments) {
        const sign = s.contribution >= 0 ? "+" : "";
        details[s.segment] = `${fmt(s.dso)}d | ${fmt(s.weight)}% weight | ${sign}${fmt(s.contribution)}d`;
      }
      const worst = [...segments].sort((a, b) => b.contribution - a.contribution)[0];
      return {
        primaryValue: fmt(adv.dsoBridge.blendedDSO),
        primaryUnit: "days blended",
        insight: worst
          ? `${worst.segment} segment contributes ${worst.contribution >= 0 ? "+" : ""}${fmt(worst.contribution)} days to blended DSO with ${fmt(worst.weight)}% sales weight. Targeting this segment yields the largest DSO impact.`
          : `Blended DSO decomposed across customer segments.`,
        trend: adv.dsoBridge.blendedDSO > 75 ? "warning" : "stable",
        details,
      };
    }

    case "dso-velocity": {
      const vel = adv.dsoVelocity;
      const details: Record<string, DetailValue> = { avgChange: `${vel.avgChange >= 0 ? "+" : ""}${fmt(vel.avgChange)}%` };
      vel.monthly.forEach((m) => {
        details[m.month] = `${m.change >= 0 ? "+" : ""}${fmt(m.change)}%`;
      });
      return {
        primaryValue: `${vel.avgChange >= 0 ? "+" : ""}${fmt(vel.avgChange)}`,
        primaryUnit: "% avg monthly change",
        insight: vel.avgChange > 5 ? "DSO is accelerating month-on-month — collections team losing ground." : vel.avgChange < -5 ? "DSO is improving — collections gaining ground." : "DSO velocity is stable.",
        trend: Math.abs(vel.avgChange) > 5 ? "warning" : "stable",
        details,
      };
    }

    case "terms-mix-drag": {
      const t = adv.termsMixDrag;
      return {
        primaryValue: `${t.drag >= 0 ? "+" : ""}${fmt(t.drag)}`,
        primaryUnit: "days drag",
        insight: t.drag > 5
          ? `Customers exceed credit terms by ${fmt(t.drag)} days on average — behavioural drag is the dominant DSO driver.`
          : t.drag < -2
          ? `Customers pay ahead of terms — terms could be lengthened for negotiating leverage.`
          : `Customers are paying close to terms — no significant drag.`,
        trend: t.drag > 5 ? "warning" : "stable",
        details: {
          weightedAvgTerms: `${fmt(t.weightedAvgTerms)} days`,
          avgActualPayDays: `${fmt(t.avgActualPayDays)} days`,
          drag: `${t.drag >= 0 ? "+" : ""}${fmt(t.drag)} days`,
        },
      };
    }

    case "ar-health-score": {
      const h = adv.arHealthScore;
      return {
        primaryValue: String(h.score),
        primaryUnit: `/ 100 (Grade ${h.grade})`,
        insight: h.grade === "A" || h.grade === "B"
          ? `Portfolio in healthy band (Grade ${h.grade}). Strongest dim: ${strongestDim(h.components as unknown as Record<string, number>)}.`
          : `Portfolio shows structural stress (Grade ${h.grade}). Weakest dim: ${weakestDim(h.components as unknown as Record<string, number>)}.`,
        trend: h.score >= 65 ? "stable" : "warning",
        details: {
          DSO: h.components.DSO,
          CEI: h.components.CEI,
          Overdue: h.components.Overdue,
          Aging: h.components.Aging,
          Concentration: h.components.Concentration,
          Trend: h.components.Trend,
        },
      };
    }

    case "pbdi": {
      const p = adv.pbdi;
      const details: Record<string, DetailValue> = { count: p.alertCount };
      p.topDeteriorating.slice(0, 5).forEach((c, i) => {
        details[`top${i + 1}`] = `${c.name}: ${c.pctChange >= 0 ? "+" : ""}${fmt(c.pctChange)}% (${fmt(c.firstHalfAvg)}d → ${fmt(c.secondHalfAvg)}d)`;
      });
      return {
        primaryValue: String(p.alertCount),
        primaryUnit: "customers deteriorating",
        insight: p.alertCount > 0
          ? `${p.alertCount} customers show >25% deterioration in payment behaviour. Worst: ${p.topDeteriorating[0]?.name ?? "—"}.`
          : "No material payment-behaviour deterioration detected.",
        trend: p.alertCount > 10 ? "warning" : "stable",
        details,
      };
    }

    case "credit-limit-util": {
      const u = adv.creditLimitUtil;
      const details: Record<string, DetailValue> = {
        avgUtilPct: `${fmt(u.avgUtilPct)}%`,
        breachCount: u.breachCount,
      };
      u.topUtilized.slice(0, 5).forEach((c, i) => {
        details[`top${i + 1}`] = `${c.name}: ${fmt(c.utilPct)}%`;
      });
      return {
        primaryValue: String(u.breachCount),
        primaryUnit: "above credit limit",
        insight: u.breachCount > 0
          ? `${u.breachCount} customers exceed credit limit. Average utilization across sample: ${fmt(u.avgUtilPct)}%. Order-block policy should be reviewed.`
          : "All customers operating within credit limits.",
        trend: u.breachCount > 25 ? "warning" : "stable",
        details,
      };
    }

    case "touches-per-dollar": {
      const t = adv.touchesPerCrore;
      return {
        primaryValue: fmt(t.rate, 2),
        primaryUnit: "touches / ₹Cr",
        insight: t.rate < 2 ? "Highly efficient collection effort." : t.rate < 4 ? "Moderate efficiency — automating L1 reminders could improve." : "Effort-heavy collection cycle — high touch volume per crore.",
        trend: t.rate > 4 ? "warning" : "stable",
        details: {
          totalTouches: t.touches,
          openARInCrores: t.crores,
          touchesPerCrore: fmt(t.rate, 2),
        },
      };
    }

    case "escalation-velocity": {
      const e = adv.escalationVelocity;
      return {
        primaryValue: fmt(e.avgDaysBetweenLevels),
        primaryUnit: "days between levels",
        insight: e.avgDaysBetweenLevels > 15
          ? "Escalation is too slow — disputes age before reaching authority."
          : e.avgDaysBetweenLevels < 5
          ? "Escalation is aggressive — risks customer relationship."
          : `Cadence near the ${e.targetDays}-day target.`,
        trend: e.avgDaysBetweenLevels > 15 || e.avgDaysBetweenLevels < 3 ? "warning" : "stable",
        details: {
          avgDays: fmt(e.avgDaysBetweenLevels),
          target: `${e.targetDays} days`,
          sampleSize: e.sampleSize,
        },
      };
    }

    case "payment-consistency": {
      const p = adv.paymentConsistency;
      return {
        primaryValue: String(p.score),
        primaryUnit: "/ 100 consistency",
        insight: p.score >= 70
          ? "Customers pay with high consistency — strong predictability for cash forecasting."
          : p.score >= 50
          ? "Moderately predictable portfolio — some random elements."
          : "Low consistency — payment timing varies widely. Forecasting is unreliable.",
        trend: p.score < 50 ? "warning" : "stable",
        details: {
          portfolioAvg: p.score,
          avgCV: `${fmt(p.avgCV)}%`,
          sampleSize: p.sampleSize,
        },
      };
    }

    case "discount-capture": {
      const d = adv.discountCapture;
      return {
        primaryValue: `${fmt(d.captureRate)}%`,
        primaryUnit: "capture rate",
        insight: d.captureRate < 20
          ? `Only ${fmt(d.captureRate)}% of discount-eligible invoices captured. ${fmtINR(d.leftOnTable)} of savings left on the table.`
          : d.captureRate < 50
          ? `Capture rate at ${fmt(d.captureRate)}% leaves meaningful savings unrealized.`
          : `Strong discount capture at ${fmt(d.captureRate)}%.`,
        trend: d.captureRate < 30 ? "warning" : "stable",
        details: {
          eligible: fmtINR(d.eligibleAmount),
          captured: fmtINR(d.capturedAmount),
          captureRate: `${fmt(d.captureRate)}%`,
          missedValue: fmtINR(d.leftOnTable),
        },
      };
    }

    case "posting-lag": {
      const p = adv.postingLag;
      return {
        primaryValue: fmt(p.avgDays),
        primaryUnit: "days avg lag",
        insight: p.avgDays > 3
          ? `${fmt(p.avgDays)}-day posting lag delays DSO clock start. Compressing to same-day improves DSO visibility by ${Math.round(p.avgDays)} days.`
          : `Posting lag is tight — minimal DSO-clock distortion.`,
        trend: p.avgDays > 3 ? "warning" : "stable",
        details: {
          avgDays: fmt(p.avgDays),
          p90Days: p.p90,
          buckets: p.buckets.map(b => `${b.days}d:${b.count}`).join(" · "),
        },
      };
    }

    case "dunning-gap": {
      const g = adv.dunningGap;
      return {
        primaryValue: fmt(g.avgGapDays),
        primaryUnit: "days avg gap",
        insight: g.drift > 5
          ? `First dunning lands ${fmt(g.avgGapDays)} days after due — ${fmt(g.drift)}-day drift above ${g.targetGapDays}d target is the #1 controllable DSO lever.`
          : `Dunning gap is near target.`,
        trend: g.drift > 5 ? "warning" : "stable",
        details: {
          avgDaysAfterDue: fmt(g.avgGapDays),
          target: `${g.targetGapDays} days`,
          drift: `${fmt(g.drift)} days`,
        },
      };
    }

    case "dispute-adjusted-dso": {
      const d = adv.disputeAdjusted;
      return {
        primaryValue: fmt(d.cleanDSO),
        primaryUnit: "days clean DSO",
        insight: d.disputeImpactDays > 5
          ? `${fmt(d.disputeImpactDays)} days of DSO come from disputed AR (${fmtINR(d.disputedAR)}). Collections should be measured on clean DSO, not blended.`
          : `Dispute impact on DSO is minimal.`,
        trend: d.disputeImpactDays > 8 ? "warning" : "stable",
        details: {
          totalDSO: `${fmt(d.actualDSO)} days`,
          cleanDSO: fmt(d.cleanDSO),
          disputeDSO: fmt(d.disputeImpactDays),
          disputedAR: fmtINR(d.disputedAR),
        },
      };
    }

    case "dunning-block-rate": {
      const b = adv.dunningBlockRate;
      return {
        primaryValue: `${fmt(b.rate)}%`,
        primaryUnit: "block rate",
        insight: b.rate > b.benchmarkHigh
          ? `${fmt(b.rate)}% blocked exceeds the ${b.benchmarkLow}–${b.benchmarkHigh}% normal band — review block-reason codes.`
          : b.rate < b.benchmarkLow
          ? `Block rate below the normal band — disputes may be under-recorded.`
          : `Block rate within the normal ${b.benchmarkLow}–${b.benchmarkHigh}% band.`,
        trend: b.rate > b.benchmarkHigh ? "warning" : "stable",
        details: {
          rate: `${fmt(b.rate)}%`,
          blockedCount: b.blockedCount,
          totalDunned: b.totalDunning,
        },
      };
    }

    case "carrying-cost": {
      const c = adv.carryingCost;
      return {
        primaryValue: fmtINR(c.dailyCost),
        primaryUnit: "per day",
        insight: `Each DSO day costs ${fmtINR(c.dailyCost)} at 10% cost of capital. Reducing DSO by 10 days saves ${fmtINR(c.dailyCost * 10)} annually. Total carrying cost: ${fmtINR(c.annualCost)} / year.`,
        trend: "warning",
        details: {
          dailyCost: fmtINR(c.dailyCost),
          monthlyCost: fmtINR(c.monthlyCost),
          annualCost: fmtINR(c.annualCost),
          avgDaysOutstanding: `${c.avgDaysOutstanding} days`,
        },
      };
    }

    case "cash-flow-leakage": {
      const l = adv.cashFlowLeakage;
      return {
        primaryValue: fmtINR(l.leakageINR),
        primaryUnit: "trapped cash",
        insight: `${fmtINR(l.leakageINR)} trapped beyond credit terms. The ${fmt(l.leakageDays)}-day gap between best-possible (${fmt(l.bestPossibleDSO)}d) and actual DSO (${fmt(l.actualDSO)}d) is the collection-failure window.`,
        trend: l.leakageDays > 20 ? "warning" : "stable",
        details: {
          bestPossibleDSO: `${fmt(l.bestPossibleDSO)} days`,
          actualDSO: `${fmt(l.actualDSO)} days`,
          leakageDays: `${fmt(l.leakageDays)} days`,
          leakageINR: fmtINR(l.leakageINR),
          STRATEGIC: `${fmt(adv.dsoBridge.segments[0]?.dso ?? 0)}d | ${fmt(adv.dsoBridge.segments[0]?.weight ?? 0)}% weight | ${adv.dsoBridge.segments[0]?.contribution >= 0 ? "+" : ""}${fmt(adv.dsoBridge.segments[0]?.contribution ?? 0)}d`,
          KEY: `${fmt(adv.dsoBridge.segments[1]?.dso ?? 0)}d | ${fmt(adv.dsoBridge.segments[1]?.weight ?? 0)}% weight | ${adv.dsoBridge.segments[1]?.contribution >= 0 ? "+" : ""}${fmt(adv.dsoBridge.segments[1]?.contribution ?? 0)}d`,
          STANDARD: `${fmt(adv.dsoBridge.segments[2]?.dso ?? 0)}d | ${fmt(adv.dsoBridge.segments[2]?.weight ?? 0)}% weight | ${adv.dsoBridge.segments[2]?.contribution >= 0 ? "+" : ""}${fmt(adv.dsoBridge.segments[2]?.contribution ?? 0)}d`,
          SMB: `${fmt(adv.dsoBridge.segments[3]?.dso ?? 0)}d | ${fmt(adv.dsoBridge.segments[3]?.weight ?? 0)}% weight | ${adv.dsoBridge.segments[3]?.contribution >= 0 ? "+" : ""}${fmt(adv.dsoBridge.segments[3]?.contribution ?? 0)}d`,
        },
      };
    }

    case "forecast-mape": {
      const f = adv.forecastMape;
      return {
        primaryValue: `${fmt(f.mape)}%`,
        primaryUnit: "MAPE",
        insight: f.mape > 30
          ? `${fmt(f.mape)}% MAPE is high — treasury cannot rely on these projections.`
          : f.mape > 15
          ? `${fmt(f.mape)}% MAPE is acceptable but tightenable.`
          : `${fmt(f.mape)}% MAPE — forecast is reliable for treasury planning.`,
        trend: f.mape > 25 ? "warning" : "stable",
        details: {
          mape: `${fmt(f.mape)}%`,
          confidence: `${f.confidence}%`,
          expectedInflow: fmtINR(f.expectedInflow),
          actualInflow: fmtINR(f.actualInflow),
        },
      };
    }

    case "cash-conversion-efficiency": {
      const c = adv.cashConversion;
      return {
        primaryValue: `${fmt(c.ratio)}%`,
        primaryUnit: "avg CCE",
        insight: c.ratio < 70
          ? `${fmt(c.ratio)}% means only ₹${fmt(c.ratio / 100, 2)} collected per ₹1 billed. AR is building — collections lag sales.`
          : `${fmt(c.ratio)}% cash conversion is healthy.`,
        trend: c.ratio < 70 ? "warning" : "stable",
        details: {
          avgCCE: `${fmt(c.ratio)}%`,
          sales: fmtINR(c.sales),
          collected: fmtINR(c.collected),
        },
      };
    }

    case "company-code-index": {
      const details: Record<string, DetailValue> = {};
      adv.companyCodePerformance.forEach(cc => {
        details[`${cc.code} ${cc.name}`] = {
          dso: `${fmt(cc.dso)}d`,
          overdueRatio: `${fmt(cc.overdueRatio)}%`,
          openAR: fmtINR(cc.openAR),
          invoices: cc.invoiceCount,
        };
      });
      const sorted = [...adv.companyCodePerformance].sort((a, b) => a.dso - b.dso);
      return {
        primaryValue: String(adv.companyCodePerformance.length),
        primaryUnit: "company codes",
        insight: sorted.length >= 2
          ? `${sorted[0].name} leads with ${fmt(sorted[0].dso)}d DSO. ${sorted[sorted.length - 1].name} lags at ${fmt(sorted[sorted.length - 1].dso)}d with ${fmt(sorted[sorted.length - 1].overdueRatio)}% overdue.`
          : `Single company code in this slice.`,
        trend: "stable",
        details,
      };
    }

    case "segment-efficiency": {
      const details: Record<string, DetailValue> = {};
      adv.segmentEfficiency.forEach(s => {
        details[s.segment] = {
          dso: `${fmt(s.dso)}d`,
          collectionRate: `${fmt(s.collectionRate)}%`,
          overdueRatio: `${fmt(s.overdueRatio)}%`,
          score: s.efficiencyScore,
        };
      });
      const sorted = [...adv.segmentEfficiency].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
      const ratio = sorted.length >= 2 && sorted[sorted.length - 1].efficiencyScore > 0
        ? sorted[0].efficiencyScore / sorted[sorted.length - 1].efficiencyScore
        : 0;
      return {
        primaryValue: `${fmt(ratio)}x`,
        primaryUnit: `${sorted[0]?.segment ?? ""} vs ${sorted[sorted.length - 1]?.segment ?? ""} gap`,
        insight: sorted.length >= 2
          ? `${sorted[0].segment} is ${fmt(ratio)}× more efficient than ${sorted[sorted.length - 1].segment} (${sorted[0].efficiencyScore} vs ${sorted[sorted.length - 1].efficiencyScore}).`
          : `Single segment in this slice.`,
        trend: severityTrend(ratio < 10),
        details,
      };
    }

    // ---- AI Insights tiles (also appear in the AI Insights dashboard) ----
    case "executive-summary": {
      const h = adv.arHealthScore;
      return {
        primaryValue: h.grade,
        primaryUnit: "overall grade",
        insight: `AR portfolio health Grade ${h.grade} (${h.score}/100). DSO ${fmt(slice.executive.dso.overall)}d · CEI ${fmt(slice.collection.cei.overall)}% · ${fmt(slice.executive.overdueRatio.overall)}% overdue · ${fmtINR(slice.summary.totalOpenAR)} cash trapped.`,
        trend: h.score >= 65 ? "stable" : "warning",
        details: {
          healthGrade: h.grade,
          healthScore: h.score,
          dso: `${fmt(slice.executive.dso.overall)} days`,
          overdueRatio: `${fmt(slice.executive.overdueRatio.overall)}%`,
          cei: `${fmt(slice.collection.cei.overall)}%`,
          cashTrapped: fmtINR(slice.summary.totalOpenAR),
        },
      };
    }

    case "risk-heatmap": {
      return {
        primaryValue: String(adv.pbdi.alertCount + adv.creditLimitUtil.breachCount),
        primaryUnit: "active risk signals",
        insight: `${adv.pbdi.alertCount} PBDI alerts + ${adv.creditLimitUtil.breachCount} credit-limit breaches + ${fmt(adv.dunningBlockRate.rate)}% block rate combine into the current risk surface.`,
        trend: "warning",
        details: {
          pbdiAlerts: adv.pbdi.alertCount,
          creditBreaches: adv.creditLimitUtil.breachCount,
          dunningBlockRate: `${fmt(adv.dunningBlockRate.rate)}%`,
        },
      };
    }

    case "cash-forecast": {
      return {
        primaryValue: `${adv.forecastMape.confidence}%`,
        primaryUnit: "confidence",
        insight: `Expected inflow ${fmtINR(adv.forecastMape.expectedInflow)} vs actual ${fmtINR(adv.forecastMape.actualInflow)}. MAPE ${fmt(adv.forecastMape.mape)}%, cash conversion ${fmt(adv.cashConversion.ratio)}%.`,
        trend: adv.forecastMape.mape > 25 ? "warning" : "stable",
        details: {
          expected: fmtINR(adv.forecastMape.expectedInflow),
          actual: fmtINR(adv.forecastMape.actualInflow),
          mape: `${fmt(adv.forecastMape.mape)}%`,
          cashConversion: `${fmt(adv.cashConversion.ratio)}%`,
        },
      };
    }

    case "working-capital-opportunity": {
      const annual = adv.carryingCost.annualCost;
      const leak = adv.cashFlowLeakage.leakageINR;
      return {
        primaryValue: fmtINR(leak),
        primaryUnit: "releasable",
        insight: `${fmtINR(leak)} of working capital recoverable by closing the ${fmt(adv.cashFlowLeakage.leakageDays)}-day leakage. Carrying cost saving at 10% CoC: ${fmtINR(annual)} annual.`,
        trend: "warning",
        details: {
          leakage: fmtINR(leak),
          carryingCost: fmtINR(annual),
          dunningGapDays: `${fmt(adv.dunningGap.avgGapDays)} days`,
          disputedAR: fmtINR(adv.disputeAdjusted.disputedAR),
        },
      };
    }

    case "collections-efficiency-trend": {
      const weekly = slice.collection.collectionEffectiveness.weekly;
      const above = weekly.filter(w => w.value >= 70).length;
      const avg = weekly.length > 0 ? weekly.reduce((s, w) => s + w.value, 0) / weekly.length : 0;
      return {
        primaryValue: `${fmt(avg)}%`,
        primaryUnit: "avg effectiveness",
        insight: `Average weekly collection effectiveness ${fmt(avg)}%, with ${above}/${weekly.length} weeks hitting the 70% target.`,
        trend: avg < 70 ? "warning" : "stable",
        details: {
          avgEffectiveness: `${fmt(avg)}%`,
          target: "70%",
          weeksAboveTarget: `${above} of ${weekly.length}`,
        },
      };
    }

    default:
      return null;
  }
}

function strongestDim(c: Record<string, number>): string {
  const entries = Object.entries(c).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "DSO";
}
function weakestDim(c: Record<string, number>): string {
  const entries = Object.entries(c).sort((a, b) => a[1] - b[1]);
  return entries[0]?.[0] ?? "DSO";
}
