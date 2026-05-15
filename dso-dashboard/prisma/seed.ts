// ============================================================
// SEED SCRIPT — Generates ~66K realistic invoice line items
// across 3 fiscal years (FY2024, FY2025, FY2026).
// Deterministic (seeded PRNG per FY), SAP-aligned, KPI-realistic.
// Run: npx tsx prisma/seed.ts
// ============================================================

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "fs";
import { join, resolve } from "path";

const regionsData = JSON.parse(readFileSync(join(__dirname, "seed-data/regions.json"), "utf-8"));
const paymentTermsData = JSON.parse(readFileSync(join(__dirname, "seed-data/payment-terms.json"), "utf-8"));
const companyCodesData = JSON.parse(readFileSync(join(__dirname, "seed-data/company-codes.json"), "utf-8"));

const dbPath = resolve(__dirname, "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// ---- Seeded PRNG (Park-Miller). Can be re-seeded between phases. ----
let seed = 42;
function setSeed(s: number) { seed = s; }
function rand(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---- Multi-FY configuration ----
type FYConfig = {
  year: 2024 | 2025 | 2026;
  start: Date;
  end: Date;
  invoiceCount: number;
  seed: number;
  // Adjusts per-segment on-time probability — older FYs paid more reliably.
  onTimeMultiplier: number;
};

const FY_CONFIGS: FYConfig[] = [
  { year: 2024, start: new Date("2023-04-01"), end: new Date("2024-03-31"), invoiceCount: 22000, seed: 71,  onTimeMultiplier: 1.10 },
  { year: 2025, start: new Date("2024-04-01"), end: new Date("2025-03-31"), invoiceCount: 22000, seed: 131, onTimeMultiplier: 0.95 },
  { year: 2026, start: new Date("2025-04-01"), end: new Date("2026-03-31"), invoiceCount: 22000, seed: 251, onTimeMultiplier: 0.85 },
];

const SNAPSHOT_DATE = new Date("2026-03-31");

const SEGMENTS = ["STRATEGIC", "KEY", "STANDARD", "SMB"] as const;
const SEGMENT_WEIGHTS = [5, 15, 50, 30];
const CREDIT_RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "HIGH_RISK"] as const;
const CREDIT_RATING_WEIGHTS = [3, 8, 15, 30, 25, 12, 7];
const CUSTOMER_GROUPS = ["DOMESTIC", "DOMESTIC", "DOMESTIC", "EXPORT", "INTERCO"] as const;
const INDUSTRIES = ["MANU", "TECH", "PHRM", "AUTO", "FMCG", "CHEM", "ENER", "INFR", "RETL", "AGRI"];

// On-time probability by segment (base; multiplied per-FY)
const ON_TIME_PROB: Record<string, number> = { STRATEGIC: 0.80, KEY: 0.65, STANDARD: 0.45, SMB: 0.35 };

const REGION_WEIGHTS = [18, 14, 12, 10, 8, 8, 4, 5, 6, 4, 3, 2, 2, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function riskFromRating(rating: string): string {
  if (rating === "AAA" || rating === "AA") return "LOW";
  if (rating === "A" || rating === "BBB") return "MEDIUM";
  if (rating === "BB" || rating === "B") return "HIGH";
  return "CRITICAL";
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function fiscalPeriodFromDate(d: Date): { year: number; period: number } {
  const month = d.getMonth(); // 0-indexed
  if (month >= 3) return { year: d.getFullYear() + 1, period: month - 2 }; // Apr=1
  return { year: d.getFullYear(), period: month + 10 }; // Jan=10, Feb=11, Mar=12
}

// ---- Main seed function ----
async function main() {
  console.log("🌱 Seeding DSO database (3 FYs)...\n");

  // Clean existing data
  await prisma.dunningHistory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.weeklyCashflow.deleteMany();
  await prisma.monthlySnapshot.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.paymentTerms.deleteMany();
  await prisma.fiscalPeriod.deleteMany();
  await prisma.region.deleteMany();
  await prisma.companyCode.deleteMany();

  // Use a stable seed for shared dimensions.
  setSeed(42);

  // ---- 1. Regions ----
  console.log("  Creating regions...");
  const regions = await Promise.all(
    regionsData.map((r: typeof regionsData[number]) => prisma.region.create({ data: r }))
  );
  console.log(`  ✓ ${regions.length} regions`);

  // ---- 2. Payment Terms ----
  console.log("  Creating payment terms...");
  const terms = await Promise.all(
    paymentTermsData.map((t: typeof paymentTermsData[number]) => prisma.paymentTerms.create({ data: t }))
  );
  console.log(`  ✓ ${terms.length} payment terms`);

  // ---- 3. Company Codes ----
  console.log("  Creating company codes...");
  const companies = await Promise.all(
    companyCodesData.map((c: typeof companyCodesData[number]) => prisma.companyCode.create({ data: c }))
  );
  console.log(`  ✓ ${companies.length} company codes`);

  // ---- 4. Fiscal Periods (3 FYs × 12 periods = 36) ----
  console.log("  Creating fiscal periods (3 FYs)...");
  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const periodsByFY: Map<number, Awaited<ReturnType<typeof prisma.fiscalPeriod.create>>[]> = new Map();
  for (const fyCfg of FY_CONFIGS) {
    const fy = fyCfg.year;
    const fyPeriods: Awaited<ReturnType<typeof prisma.fiscalPeriod.create>>[] = [];
    for (let p = 1; p <= 12; p++) {
      const calendarYear = p <= 9 ? fy - 1 : fy;
      const month = (p + 2) % 12; // Apr=3, May=4, ... Mar=2 (0-indexed)
      const startDate = new Date(calendarYear, month, 1);
      const endDate = new Date(calendarYear, month + 1, 0);
      const yearSuffix = calendarYear.toString().slice(2);
      const quarter = p <= 3 ? "Q1" : p <= 6 ? "Q2" : p <= 9 ? "Q3" : "Q4";
      const fp = await prisma.fiscalPeriod.create({
        data: {
          fiscalYear: fy,
          fiscalPeriod: p,
          periodLabel: `${monthNames[p - 1]}'${yearSuffix}`,
          startDate,
          endDate,
          quarter,
          // Closed if the entire period is before the snapshot.
          isClosed: endDate < SNAPSHOT_DATE,
        },
      });
      fyPeriods.push(fp);
    }
    periodsByFY.set(fy, fyPeriods);
  }
  const totalPeriods = [...periodsByFY.values()].reduce((s, arr) => s + arr.length, 0);
  console.log(`  ✓ ${totalPeriods} fiscal periods`);

  // ---- 5. Customers (shared across FYs) ----
  console.log("  Creating customers...");
  setSeed(42); // make customer generation order-independent of FY loops
  const CUSTOMER_COUNT = 350;
  const customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const segment = weightedPick([...SEGMENTS], SEGMENT_WEIGHTS);
    const rating = weightedPick([...CREDIT_RATINGS], CREDIT_RATING_WEIGHTS);
    const region = weightedPick(regions, REGION_WEIGHTS.slice(0, regions.length));
    const termIdx =
      segment === "STRATEGIC" ? randInt(3, 4) :
      segment === "KEY" ? randInt(2, 4) :
      segment === "STANDARD" ? randInt(1, 3) :
      randInt(0, 2);
    const creditLimit =
      segment === "STRATEGIC" ? randInt(50, 200) * 1_000_000 :
      segment === "KEY" ? randInt(10, 50) * 1_000_000 :
      segment === "STANDARD" ? randInt(2, 15) * 1_000_000 :
      randInt(1, 5) * 1_000_000;

    const cust = await prisma.customer.create({
      data: {
        customerNumber: `C${String(100000 + i).padStart(6, "0")}`,
        name: `${pick(["Tata", "Reliance", "Infosys", "Wipro", "HCL", "Mahindra", "Bajaj", "Adani", "Godrej", "Larsen", "Bharti", "ICICI", "HDFC", "Sun", "Cipla", "Dr Reddy", "Asian", "Hero", "Maruti", "Ultratech", "Grasim", "ACC", "Ambuja", "Jindal", "JSW", "Hindalco", "Vedanta", "NTPC", "ONGC", "BHEL"])} ${pick(["Industries", "Corp", "Ltd", "Pvt Ltd", "Solutions", "Enterprises", "Group", "Tech", "Systems", "Engineering", "Infra", "Chemicals", "Pharma"])}`,
        customerGroup: pick([...CUSTOMER_GROUPS]),
        industryCode: pick(INDUSTRIES),
        segment,
        creditRating: rating,
        creditLimit,
        riskCategory: riskFromRating(rating),
        isBlocked: rating === "HIGH_RISK" && rand() < 0.3,
        regionId: region.id,
        paymentTermsId: terms[termIdx].id,
      },
    });
    customers.push(cust);
  }
  console.log(`  ✓ ${customers.length} customers`);

  // ---- 6. Invoices per FY ----
  const BATCH_SIZE = 500;
  let invoiceCount = 0;

  for (const fyCfg of FY_CONFIGS) {
    const fy = fyCfg.year;
    const fyPeriods = periodsByFY.get(fy)!;
    setSeed(fyCfg.seed);
    console.log(`  Creating ${fyCfg.invoiceCount} invoices for FY${fy}...`);

    for (let batch = 0; batch < Math.ceil(fyCfg.invoiceCount / BATCH_SIZE); batch++) {
      const batchData: Parameters<typeof prisma.invoice.createMany>[0]["data"] = [];
      const batchSize = Math.min(BATCH_SIZE, fyCfg.invoiceCount - batch * BATCH_SIZE);

      for (let i = 0; i < batchSize; i++) {
        const globalIdx = batch * BATCH_SIZE + i;
        const customer = pick(customers);
        const company = pick(companies);

        // Random period within FY (slight Q4 spike).
        const periodIdx = weightedPick(
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          [7, 7, 7, 8, 8, 8, 8, 8, 9, 10, 10, 10]
        );
        const period = fyPeriods[periodIdx];
        const dayInMonth = randInt(1, 28);
        const docYear = periodIdx <= 8 ? fy - 1 : fy;
        const docMonth = (periodIdx + 3) % 12;
        const documentDate = new Date(docYear, docMonth, dayInMonth);

        // Posting lag (0–7 days, weighted toward 0–2) — feeds the Posting Lag KPI.
        const postingLagDays = weightedPick([0, 1, 2, 3, 4, 5, 6, 7], [25, 20, 15, 10, 8, 7, 8, 7]);
        const postingDate = addDays(documentDate, postingLagDays);

        // Payment terms for this invoice (15% deviate from customer default).
        const custTerms = terms.find((t: typeof terms[number]) => t.id === customer.paymentTermsId)!;
        const invoiceTerms = rand() < 0.85 ? custTerms : pick(terms);
        const creditPeriodDays = invoiceTerms.creditPeriodDays;
        const baselineDate = documentDate;
        const dueDate = addDays(baselineDate, creditPeriodDays);

        // Amount: log-normal distribution (many small, few large).
        const logAmount = 11 + rand() * 5 + (customer.segment === "STRATEGIC" ? 3 : customer.segment === "KEY" ? 2 : 0);
        const amount = Math.round(Math.exp(logAmount) * 100) / 100;
        const taxAmount = Math.round(amount * 0.18 * 100) / 100;

        // Payment behavior — per-FY multiplier diverges values year over year.
        const baseProb = ON_TIME_PROB[customer.segment] || 0.4;
        const onTimeProb = Math.min(0.97, baseProb * fyCfg.onTimeMultiplier);
        const paysOnTime = rand() < onTimeProb;

        let status: string;
        let clearingDate: Date | null = null;
        let daysForPayment: number | null = null;

        const daysSinceIssue = diffDays(documentDate, SNAPSHOT_DATE);

        if (daysSinceIssue < creditPeriodDays * 0.5) {
          status = rand() < 0.15 ? "CLEARED" : "OPEN";
          if (status === "CLEARED") {
            const payDays = randInt(1, Math.max(1, Math.floor(creditPeriodDays * 0.5)));
            clearingDate = addDays(documentDate, payDays);
            if (clearingDate > SNAPSHOT_DATE) {
              status = "OPEN";
              clearingDate = null;
            }
          }
        } else if (paysOnTime) {
          status = "CLEARED";
          const payDays = randInt(Math.max(1, creditPeriodDays - 10), creditPeriodDays);
          clearingDate = addDays(documentDate, payDays);
          if (clearingDate > SNAPSHOT_DATE) {
            status = "OPEN";
            clearingDate = null;
          }
        } else {
          if (rand() < 0.55 && daysSinceIssue > creditPeriodDays + 10) {
            status = "CLEARED";
            const lateDays = randInt(creditPeriodDays + 5, Math.min(creditPeriodDays + 40, daysSinceIssue));
            clearingDate = addDays(documentDate, lateDays);
            if (clearingDate > SNAPSHOT_DATE) {
              status = "OPEN";
              clearingDate = null;
            }
          } else if (rand() < 0.05) {
            status = "PARTIAL";
          } else {
            status = "OPEN";
          }
        }

        if (status === "CLEARED" && clearingDate) {
          daysForPayment = diffDays(documentDate, clearingDate);
        }

        const daysOutstanding = diffDays(documentDate, SNAPSHOT_DATE);
        const isOverdue = status !== "CLEARED" && SNAPSHOT_DATE > dueDate;
        const elapsedDays = isOverdue ? diffDays(dueDate, SNAPSHOT_DATE) : 0;

        let overdueCategory: string;
        if (!isOverdue || status === "CLEARED") {
          overdueCategory = "NOT_DUE";
        } else if (elapsedDays <= 7) overdueCategory = "1_7";
        else if (elapsedDays <= 15) overdueCategory = "8_15";
        else if (elapsedDays <= 30) overdueCategory = "16_30";
        else if (elapsedDays <= 45) overdueCategory = "31_45";
        else if (elapsedDays <= 60) overdueCategory = "46_60";
        else overdueCategory = "60_PLUS";

        const classification = status === "CLEARED"
          ? "CLEARED_ITEM"
          : isOverdue
            ? "OVERDUE_RECEIVABLE"
            : "CURRENT_RECEIVABLE";

        const weightedOverdue = isOverdue ? amount * elapsedDays : 0;

        // Globally-unique week number across FYs: encode FY into upper digits.
        // Per-FY week index: 1..52, days since FY start divided by 7.
        const fyWeekIdx = Math.min(52, Math.floor(diffDays(fyCfg.start, documentDate) / 7) + 1);
        const weekNumber = fy * 1000 + fyWeekIdx;

        const fp = fiscalPeriodFromDate(documentDate);
        const matchedPeriod = fyPeriods.find(pp => pp.fiscalYear === fp.year && pp.fiscalPeriod === fp.period) || period;

        batchData.push({
          documentNumber: `${fy}${String(globalIdx + 1).padStart(7, "0")}`,
          companyCodeId: company.id,
          customerId: customer.id,
          fiscalPeriodId: matchedPeriod.id,
          paymentTermsId: invoiceTerms.id,
          documentDate,
          postingDate,
          baselineDate,
          dueDate,
          amount,
          taxAmount,
          documentType: "RV",
          referenceNumber: rand() < 0.7 ? `PO-${randInt(100000, 999999)}` : null,
          status,
          clearingDate,
          clearingDocument: clearingDate ? `${fy}${String(randInt(100000, 999999))}` : null,
          creditPeriodDays,
          daysForPayment,
          daysOutstanding,
          elapsedDays,
          isOverdue,
          overdueCategory,
          weightedOverdue,
          classification,
          weekNumber,
          snapshotDate: SNAPSHOT_DATE,
        });
      }

      await prisma.invoice.createMany({ data: batchData });
      invoiceCount += batchData.length;
    }
    console.log(`    ✓ FY${fy} done (${invoiceCount} cumulative)`);
  }
  console.log(`  ✓ ${invoiceCount} invoices across 3 FYs`);

  // ---- 7. Dunning History (overdue invoices, up to 6000 total) ----
  console.log("  Creating dunning history...");
  const overdueInvoices = await prisma.invoice.findMany({
    where: { isOverdue: true },
    select: { id: true, elapsedDays: true, documentDate: true, dueDate: true },
    take: 6000,
  });

  setSeed(909);
  let dunningCount = 0;
  const dunningBatch: Parameters<typeof prisma.dunningHistory.createMany>[0]["data"] = [];
  for (const inv of overdueInvoices) {
    const levels = inv.elapsedDays > 45 ? 3 : inv.elapsedDays > 30 ? 2 : 1;
    for (let l = 1; l <= levels; l++) {
      dunningBatch.push({
        invoiceId: inv.id,
        dunningLevel: l,
        dunningDate: addDays(inv.dueDate, l * 10 + randInt(0, 5)),
        dunningBlock: l >= 3 && rand() < 0.2 ? "R" : null,
        notes:
          l === 1 ? "Auto-reminder sent" :
          l === 2 ? "Formal notice — no response to L1" :
          l === 3 ? "Final warning — escalated to manager" :
          "Legal proceedings initiated",
      });
      dunningCount++;
    }
  }
  for (let i = 0; i < dunningBatch.length; i += 1000) {
    await prisma.dunningHistory.createMany({ data: dunningBatch.slice(i, i + 1000) });
  }
  console.log(`  ✓ ${dunningCount} dunning records`);

  // ---- 8. Monthly Snapshots — per FY × company × period ----
  console.log("  Computing monthly snapshots...");
  let snapshotCount = 0;
  for (const fyCfg of FY_CONFIGS) {
    const fyPeriods = periodsByFY.get(fyCfg.year)!;
    for (const company of companies) {
      let prevAR = 0;
      for (const period of fyPeriods) {
        const invoices = await prisma.invoice.findMany({
          where: { companyCodeId: company.id, fiscalPeriodId: period.id },
        });

        const totalSales = invoices.reduce((s, i) => s + i.amount, 0);
        const cleared = invoices.filter(i => i.status === "CLEARED");
        const collections = cleared.reduce((s, i) => s + i.amount, 0);
        const openInvs = invoices.filter(i => i.status !== "CLEARED");
        const totalAR = openInvs.reduce((s, i) => s + i.amount, 0);
        const overdueInvs = openInvs.filter(i => i.isOverdue);
        const overdueAR = overdueInvs.reduce((s, i) => s + i.amount, 0);
        const currentAR = totalAR - overdueAR;
        const beginningAR = prevAR;

        const dso = totalSales > 0 ? (totalAR / totalSales) * 30 : null;
        const overdueRatio = totalAR > 0 ? (overdueAR / totalAR) * 100 : null;
        const turnover = totalAR > 0 ? totalSales / ((beginningAR + totalAR) / 2 || 1) : null;
        const ceiDenom = beginningAR + totalSales - currentAR;
        const cei = ceiDenom > 0 ? ((beginningAR + totalSales - totalAR) / ceiDenom) * 100 : null;
        const cpu = cleared.length > 0
          ? cleared.filter(i => i.daysForPayment != null && i.creditPeriodDays > 0)
              .reduce((s, i) => s + (i.daysForPayment! / i.creditPeriodDays) * 100, 0) /
            Math.max(1, cleared.filter(i => i.daysForPayment != null).length)
          : null;

        await prisma.monthlySnapshot.create({
          data: {
            fiscalPeriodId: period.id,
            companyCodeId: company.id,
            totalAR, currentAR, overdueAR, beginningAR,
            totalCreditSales: totalSales,
            totalCollections: collections,
            dso, overdueRatio, cei,
            receivablesTurnover: turnover,
            creditPeriodUtil: cpu,
            invoiceCountTotal: invoices.length,
            invoiceCountOverdue: overdueInvs.length,
            invoiceCountCleared: cleared.length,
          },
        });
        snapshotCount++;
        prevAR = totalAR;
      }
    }
  }
  console.log(`  ✓ ${snapshotCount} monthly snapshots`);

  // ---- 9. Weekly Cashflows — per FY × company × ISO-week-of-FY ----
  console.log("  Computing weekly cashflows...");
  let wcfCount = 0;
  for (const fyCfg of FY_CONFIGS) {
    const fyPeriods = periodsByFY.get(fyCfg.year)!;
    for (const company of companies) {
      for (let w = 1; w <= 52; w++) {
        const weekStart = addDays(fyCfg.start, (w - 1) * 7);
        if (weekStart > fyCfg.end) break;
        const weekEnd = addDays(weekStart, 6);
        const fp = fiscalPeriodFromDate(weekStart);
        const matchedPeriod =
          fyPeriods.find(p => p.fiscalYear === fp.year && p.fiscalPeriod === fp.period) || fyPeriods[0];

        const encodedWeek = fyCfg.year * 1000 + w;
        const weekInvs = await prisma.invoice.findMany({
          where: { companyCodeId: company.id, weekNumber: encodedWeek },
        });

        const due = weekInvs.filter(i => i.dueDate >= weekStart && i.dueDate <= weekEnd);
        const collected = weekInvs.filter(
          i => i.status === "CLEARED" && i.clearingDate && i.clearingDate >= weekStart && i.clearingDate <= weekEnd,
        );
        const salesAmt = weekInvs.reduce((s, i) => s + i.amount, 0);
        const dueAmt = due.reduce((s, i) => s + i.amount, 0);
        const collectedAmt = collected.reduce((s, i) => s + i.amount, 0);
        const overdueBalance = weekInvs.filter(i => i.isOverdue).reduce((s, i) => s + i.amount, 0);
        const onTimeRate = due.length > 0 ? (collected.length / due.length) * 100 : null;
        const effectiveness = dueAmt > 0 ? (collectedAmt / dueAmt) * 100 : null;

        await prisma.weeklyCashflow.create({
          data: {
            fiscalPeriodId: matchedPeriod.id,
            companyCodeId: company.id,
            weekNumber: encodedWeek,
            weekLabel: `W${w}`,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            salesAmount: salesAmt,
            expectedCashInflow: dueAmt,
            actualCashInflow: collectedAmt,
            invoicesDueCount: due.length,
            invoicesDueAmount: dueAmt,
            invoicesCollectedCount: collected.length,
            invoicesCollectedAmount: collectedAmt,
            overdueBalance,
            collectionRate: collectedAmt / 7,
            onTimePaymentRate: onTimeRate,
            collectionEffectiveness: effectiveness,
          },
        });
        wcfCount++;
      }
    }
  }
  console.log(`  ✓ ${wcfCount} weekly cashflows`);

  // ---- Summary ----
  const totalInvoices = await prisma.invoice.count();
  const totalOverdue = await prisma.invoice.count({ where: { isOverdue: true } });
  const totalCleared = await prisma.invoice.count({ where: { status: "CLEARED" } });
  const totalDunning = await prisma.dunningHistory.count();

  console.log(`\n✅ Seed complete!`);
  console.log(`   FYs: ${FY_CONFIGS.map(c => c.year).join(", ")}`);
  console.log(`   Invoices: ${totalInvoices} (${totalCleared} cleared, ${totalOverdue} overdue)`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Dunning records: ${totalDunning}`);
  console.log(`   Monthly snapshots: ${snapshotCount}`);
  console.log(`   Weekly cashflows: ${wcfCount}`);
  console.log(`   DB file: prisma/dev.db`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
