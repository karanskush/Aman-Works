// ============================================================
// SEED SCRIPT — Generates 25,000 realistic invoice line items
// Deterministic (seeded PRNG), SAP-aligned, KPI-realistic
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

// ---- Seeded PRNG for reproducibility ----
let seed = 42;
function rand(): number {
  seed = (seed * 16807 + 0) % 2147483647;
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

// ---- Constants ----
const INVOICE_COUNT = 25000;
const FY_START = new Date("2025-04-01");
const FY_END = new Date("2026-03-31");
const SNAPSHOT_DATE = new Date("2026-03-31");

const SEGMENTS = ["STRATEGIC", "KEY", "STANDARD", "SMB"] as const;
const SEGMENT_WEIGHTS = [5, 15, 50, 30];
const CREDIT_RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "HIGH_RISK"] as const;
const CREDIT_RATING_WEIGHTS = [3, 8, 15, 30, 25, 12, 7];
const RISK_CATEGORIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const CUSTOMER_GROUPS = ["DOMESTIC", "DOMESTIC", "DOMESTIC", "EXPORT", "INTERCO"] as const;
const INDUSTRIES = ["MANU", "TECH", "PHRM", "AUTO", "FMCG", "CHEM", "ENER", "INFR", "RETL", "AGRI"];

// On-time probability by segment
const ON_TIME_PROB: Record<string, number> = { STRATEGIC: 0.80, KEY: 0.65, STANDARD: 0.45, SMB: 0.35 };

// Region weights (heavier in major business states)
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

function isoWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function fiscalPeriodFromDate(d: Date): { year: number; period: number } {
  const month = d.getMonth(); // 0-indexed
  if (month >= 3) return { year: d.getFullYear() + 1, period: month - 2 }; // Apr=1
  return { year: d.getFullYear(), period: month + 10 }; // Jan=10, Feb=11, Mar=12
}

// ---- Main seed function ----
async function main() {
  console.log("🌱 Seeding DSO database...\n");

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

  // ---- 1. Regions ----
  console.log("  Creating regions...");
  const regions = await Promise.all(
    regionsData.map((r) =>
      prisma.region.create({ data: r })
    )
  );
  console.log(`  ✓ ${regions.length} regions`);

  // ---- 2. Payment Terms ----
  console.log("  Creating payment terms...");
  const terms = await Promise.all(
    paymentTermsData.map((t) =>
      prisma.paymentTerms.create({ data: t })
    )
  );
  console.log(`  ✓ ${terms.length} payment terms`);

  // ---- 3. Company Codes ----
  console.log("  Creating company codes...");
  const companies = await Promise.all(
    companyCodesData.map((c) =>
      prisma.companyCode.create({ data: c })
    )
  );
  console.log(`  ✓ ${companies.length} company codes`);

  // ---- 4. Fiscal Periods ----
  console.log("  Creating fiscal periods...");
  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const periods: Awaited<ReturnType<typeof prisma.fiscalPeriod.create>>[] = [];
  for (let p = 1; p <= 12; p++) {
    const year = p <= 9 ? 2025 : 2026;
    const month = ((p + 2) % 12); // Apr=3, May=4, ... Mar=2 (0-indexed)
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const yearSuffix = year.toString().slice(2);
    const quarter = p <= 3 ? "Q1" : p <= 6 ? "Q2" : p <= 9 ? "Q3" : "Q4";
    const fp = await prisma.fiscalPeriod.create({
      data: {
        fiscalYear: 2026,
        fiscalPeriod: p,
        periodLabel: `${monthNames[p - 1]}'${yearSuffix}`,
        startDate,
        endDate,
        quarter,
        isClosed: p <= 9,
      },
    });
    periods.push(fp);
  }
  console.log(`  ✓ ${periods.length} fiscal periods`);

  // ---- 5. Customers ----
  console.log("  Creating customers...");
  const CUSTOMER_COUNT = 350;
  const customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const segment = weightedPick([...SEGMENTS], SEGMENT_WEIGHTS);
    const rating = weightedPick([...CREDIT_RATINGS], CREDIT_RATING_WEIGHTS);
    const region = weightedPick(regions, REGION_WEIGHTS.slice(0, regions.length));
    const termIdx = segment === "STRATEGIC" ? randInt(3, 4) : segment === "KEY" ? randInt(2, 4) : segment === "STANDARD" ? randInt(1, 3) : randInt(0, 2);
    const creditLimit = segment === "STRATEGIC" ? randInt(50, 200) * 1000000 : segment === "KEY" ? randInt(10, 50) * 1000000 : segment === "STANDARD" ? randInt(2, 15) * 1000000 : randInt(1, 5) * 1000000;

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

  // ---- 6. Invoices ----
  console.log(`  Creating ${INVOICE_COUNT} invoices...`);

  // Batch insert for performance
  const BATCH_SIZE = 500;
  let invoiceCount = 0;

  for (let batch = 0; batch < Math.ceil(INVOICE_COUNT / BATCH_SIZE); batch++) {
    const batchData = [];
    const batchSize = Math.min(BATCH_SIZE, INVOICE_COUNT - batch * BATCH_SIZE);

    for (let i = 0; i < batchSize; i++) {
      const globalIdx = batch * BATCH_SIZE + i;
      const customer = pick(customers);
      const company = pick(companies);

      // Random date within FY (slight Q4 spike)
      const periodIdx = weightedPick(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        [7, 7, 7, 8, 8, 8, 8, 8, 9, 10, 10, 10]
      );
      const period = periods[periodIdx];
      const dayInMonth = randInt(1, 28);
      const docYear = periodIdx <= 8 ? 2025 : 2026;
      const docMonth = (periodIdx + 3) % 12;
      const documentDate = new Date(docYear, docMonth, dayInMonth);

      // Payment terms for this invoice
      const custTerms = terms.find(t => t.id === customer.paymentTermsId)!;
      const invoiceTerms = rand() < 0.85 ? custTerms : pick(terms); // 15% get different terms
      const creditPeriodDays = invoiceTerms.creditPeriodDays;
      const baselineDate = documentDate;
      const dueDate = addDays(baselineDate, creditPeriodDays);

      // Amount: log-normal distribution (many small, few large)
      const logAmount = 11 + rand() * 5 + (customer.segment === "STRATEGIC" ? 3 : customer.segment === "KEY" ? 2 : 0);
      const amount = Math.round(Math.exp(logAmount) * 100) / 100;
      const taxAmount = Math.round(amount * 0.18 * 100) / 100; // 18% GST

      // Payment behavior
      const onTimeProb = ON_TIME_PROB[customer.segment] || 0.4;
      const paysOnTime = rand() < onTimeProb;

      let status: string;
      let clearingDate: Date | null = null;
      let daysForPayment: number | null = null;

      // Determine if invoice is old enough to be cleared
      const daysSinceIssue = diffDays(documentDate, SNAPSHOT_DATE);

      if (daysSinceIssue < creditPeriodDays * 0.5) {
        // Very recent: mostly open
        status = rand() < 0.15 ? "CLEARED" : "OPEN";
      } else if (paysOnTime) {
        // Pays within terms
        status = "CLEARED";
        const payDays = randInt(Math.max(1, creditPeriodDays - 10), creditPeriodDays);
        clearingDate = addDays(documentDate, payDays);
        if (clearingDate > SNAPSHOT_DATE) {
          status = "OPEN";
          clearingDate = null;
        }
      } else {
        // Late payer
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
      } else if (elapsedDays <= 7) {
        overdueCategory = "1_7";
      } else if (elapsedDays <= 15) {
        overdueCategory = "8_15";
      } else if (elapsedDays <= 30) {
        overdueCategory = "16_30";
      } else if (elapsedDays <= 45) {
        overdueCategory = "31_45";
      } else if (elapsedDays <= 60) {
        overdueCategory = "46_60";
      } else {
        overdueCategory = "60_PLUS";
      }

      const classification = status === "CLEARED"
        ? "CLEARED_ITEM"
        : isOverdue
          ? "OVERDUE_RECEIVABLE"
          : "CURRENT_RECEIVABLE";

      const weightedOverdue = isOverdue ? amount * elapsedDays : 0;
      const weekNumber = isoWeek(documentDate);

      const fp = fiscalPeriodFromDate(documentDate);
      const matchedPeriod = periods.find(p => p.fiscalYear === fp.year && p.fiscalPeriod === fp.period) || period;

      batchData.push({
        documentNumber: `${docYear}${String(globalIdx + 1).padStart(6, "0")}`,
        companyCodeId: company.id,
        customerId: customer.id,
        fiscalPeriodId: matchedPeriod.id,
        paymentTermsId: invoiceTerms.id,
        documentDate,
        postingDate: documentDate,
        baselineDate,
        dueDate,
        amount,
        taxAmount,
        documentType: "RV",
        referenceNumber: rand() < 0.7 ? `PO-${randInt(100000, 999999)}` : null,
        status,
        clearingDate,
        clearingDocument: clearingDate ? `${docYear}${String(randInt(100000, 999999))}` : null,
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
    if ((batch + 1) % 10 === 0) {
      console.log(`    ... ${invoiceCount} invoices created`);
    }
  }
  console.log(`  ✓ ${invoiceCount} invoices`);

  // ---- 7. Dunning History (for overdue invoices) ----
  console.log("  Creating dunning history...");
  const overdueInvoices = await prisma.invoice.findMany({
    where: { isOverdue: true },
    select: { id: true, elapsedDays: true, documentDate: true, dueDate: true },
    take: 5000,
  });

  let dunningCount = 0;
  const dunningBatch = [];
  for (const inv of overdueInvoices) {
    const levels = inv.elapsedDays > 45 ? 3 : inv.elapsedDays > 30 ? 2 : 1;
    for (let l = 1; l <= levels; l++) {
      dunningBatch.push({
        invoiceId: inv.id,
        dunningLevel: l,
        dunningDate: addDays(inv.dueDate, l * 10 + randInt(0, 5)),
        dunningBlock: l >= 3 && rand() < 0.2 ? "R" : null,
        notes: l === 1 ? "Auto-reminder sent" : l === 2 ? "Formal notice — no response to L1" : l === 3 ? "Final warning — escalated to manager" : "Legal proceedings initiated",
      });
      dunningCount++;
    }
  }

  // Batch insert dunning
  for (let i = 0; i < dunningBatch.length; i += 1000) {
    await prisma.dunningHistory.createMany({ data: dunningBatch.slice(i, i + 1000) });
  }
  console.log(`  ✓ ${dunningCount} dunning records`);

  // ---- 8. Monthly Snapshots ----
  console.log("  Computing monthly snapshots...");
  for (const company of companies) {
    let prevAR = 0;
    for (const period of periods) {
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

      await prisma.monthlySnapshot.create({
        data: {
          fiscalPeriodId: period.id,
          companyCodeId: company.id,
          totalAR,
          currentAR,
          overdueAR,
          beginningAR,
          totalCreditSales: totalSales,
          totalCollections: collections,
          dso,
          overdueRatio,
          cei,
          receivablesTurnover: turnover,
          invoiceCountTotal: invoices.length,
          invoiceCountOverdue: overdueInvs.length,
          invoiceCountCleared: cleared.length,
        },
      });
      prevAR = totalAR;
    }
  }
  console.log(`  ✓ ${companies.length * periods.length} monthly snapshots`);

  // ---- 9. Weekly Cashflows ----
  console.log("  Computing weekly cashflows...");
  let wcfCount = 0;
  for (const company of companies) {
    for (let w = 1; w <= 52; w++) {
      // Find the fiscal period for this week
      const weekStart = new Date(2025, 3, 1 + (w - 1) * 7); // Approx
      if (weekStart > FY_END) break;
      const weekEnd = addDays(weekStart, 6);
      const fp = fiscalPeriodFromDate(weekStart);
      const matchedPeriod = periods.find(p => p.fiscalYear === fp.year && p.fiscalPeriod === fp.period) || periods[0];

      const weekInvs = await prisma.invoice.findMany({
        where: {
          companyCodeId: company.id,
          weekNumber: w,
        },
      });

      const due = weekInvs.filter(i => i.dueDate >= weekStart && i.dueDate <= weekEnd);
      const collected = weekInvs.filter(i => i.status === "CLEARED" && i.clearingDate && i.clearingDate >= weekStart && i.clearingDate <= weekEnd);
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
          weekNumber: w,
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
  console.log(`  ✓ ${wcfCount} weekly cashflows`);

  // ---- Summary ----
  const totalInvoices = await prisma.invoice.count();
  const totalOverdue = await prisma.invoice.count({ where: { isOverdue: true } });
  const totalCleared = await prisma.invoice.count({ where: { status: "CLEARED" } });
  const totalDunning = await prisma.dunningHistory.count();

  console.log(`\n✅ Seed complete!`);
  console.log(`   Invoices: ${totalInvoices} (${totalCleared} cleared, ${totalOverdue} overdue)`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Dunning records: ${totalDunning}`);
  console.log(`   Monthly snapshots: ${companies.length * periods.length}`);
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
