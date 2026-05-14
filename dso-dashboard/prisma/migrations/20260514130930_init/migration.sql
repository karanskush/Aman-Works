-- CreateTable
CREATE TABLE "company_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fiscalYearVariant" TEXT NOT NULL DEFAULT 'V3',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "countryCode" TEXT NOT NULL DEFAULT 'IN',
    "zone" TEXT
);

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "termsCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "creditPeriodDays" INTEGER NOT NULL,
    "discountDays1" INTEGER,
    "discountPercent1" REAL,
    "discountDays2" INTEGER,
    "discountPercent2" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalPeriod" INTEGER NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "quarter" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name2" TEXT,
    "customerGroup" TEXT NOT NULL,
    "industryCode" TEXT,
    "segment" TEXT NOT NULL,
    "creditRating" TEXT NOT NULL,
    "creditLimit" REAL,
    "riskCategory" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "regionId" TEXT NOT NULL,
    "paymentTermsId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "customers_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customers_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "payment_terms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentNumber" TEXT NOT NULL,
    "companyCodeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fiscalPeriodId" TEXT NOT NULL,
    "paymentTermsId" TEXT NOT NULL,
    "documentDate" DATETIME NOT NULL,
    "postingDate" DATETIME NOT NULL,
    "baselineDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "documentType" TEXT NOT NULL DEFAULT 'RV',
    "referenceNumber" TEXT,
    "status" TEXT NOT NULL,
    "clearingDate" DATETIME,
    "clearingDocument" TEXT,
    "creditPeriodDays" INTEGER NOT NULL,
    "daysForPayment" INTEGER,
    "daysOutstanding" INTEGER NOT NULL,
    "elapsedDays" INTEGER NOT NULL,
    "isOverdue" BOOLEAN NOT NULL,
    "overdueCategory" TEXT,
    "weightedOverdue" REAL NOT NULL DEFAULT 0,
    "classification" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "snapshotDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invoices_companyCodeId_fkey" FOREIGN KEY ("companyCodeId") REFERENCES "company_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "payment_terms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weekly_cashflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fiscalPeriodId" TEXT NOT NULL,
    "companyCodeId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "salesAmount" REAL NOT NULL DEFAULT 0,
    "expectedCashInflow" REAL NOT NULL DEFAULT 0,
    "actualCashInflow" REAL NOT NULL DEFAULT 0,
    "invoicesDueCount" INTEGER NOT NULL DEFAULT 0,
    "invoicesDueAmount" REAL NOT NULL DEFAULT 0,
    "invoicesCollectedCount" INTEGER NOT NULL DEFAULT 0,
    "invoicesCollectedAmount" REAL NOT NULL DEFAULT 0,
    "overdueBalance" REAL NOT NULL DEFAULT 0,
    "collectionRate" REAL,
    "onTimePaymentRate" REAL,
    "collectionEffectiveness" REAL,
    CONSTRAINT "weekly_cashflows_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "weekly_cashflows_companyCodeId_fkey" FOREIGN KEY ("companyCodeId") REFERENCES "company_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monthly_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fiscalPeriodId" TEXT NOT NULL,
    "companyCodeId" TEXT NOT NULL,
    "totalAR" REAL NOT NULL,
    "currentAR" REAL NOT NULL,
    "overdueAR" REAL NOT NULL,
    "beginningAR" REAL NOT NULL,
    "totalCreditSales" REAL NOT NULL,
    "totalCollections" REAL NOT NULL,
    "dso" REAL,
    "overdueRatio" REAL,
    "cei" REAL,
    "receivablesTurnover" REAL,
    "creditPeriodUtil" REAL,
    "invoiceCountTotal" INTEGER NOT NULL,
    "invoiceCountOverdue" INTEGER NOT NULL,
    "invoiceCountCleared" INTEGER NOT NULL,
    CONSTRAINT "monthly_snapshots_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "monthly_snapshots_companyCodeId_fkey" FOREIGN KEY ("companyCodeId") REFERENCES "company_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dunning_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "dunningLevel" INTEGER NOT NULL,
    "dunningDate" DATETIME NOT NULL,
    "dunningBlock" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dunning_history_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "company_codes_code_key" ON "company_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regions_stateCode_countryCode_key" ON "regions"("stateCode", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_termsCode_key" ON "payment_terms"("termsCode");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_fiscalYear_fiscalPeriod_key" ON "fiscal_periods"("fiscalYear", "fiscalPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerNumber_key" ON "customers"("customerNumber");

-- CreateIndex
CREATE INDEX "customers_segment_idx" ON "customers"("segment");

-- CreateIndex
CREATE INDEX "customers_riskCategory_idx" ON "customers"("riskCategory");

-- CreateIndex
CREATE INDEX "customers_regionId_idx" ON "customers"("regionId");

-- CreateIndex
CREATE INDEX "customers_creditRating_idx" ON "customers"("creditRating");

-- CreateIndex
CREATE INDEX "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate");

-- CreateIndex
CREATE INDEX "invoices_customerId_status_idx" ON "invoices"("customerId", "status");

-- CreateIndex
CREATE INDEX "invoices_companyCodeId_fiscalPeriodId_idx" ON "invoices"("companyCodeId", "fiscalPeriodId");

-- CreateIndex
CREATE INDEX "invoices_overdueCategory_status_idx" ON "invoices"("overdueCategory", "status");

-- CreateIndex
CREATE INDEX "invoices_clearingDate_idx" ON "invoices"("clearingDate");

-- CreateIndex
CREATE INDEX "invoices_documentDate_idx" ON "invoices"("documentDate");

-- CreateIndex
CREATE INDEX "invoices_classification_idx" ON "invoices"("classification");

-- CreateIndex
CREATE INDEX "invoices_isOverdue_weightedOverdue_idx" ON "invoices"("isOverdue", "weightedOverdue");

-- CreateIndex
CREATE INDEX "invoices_weekNumber_status_idx" ON "invoices"("weekNumber", "status");

-- CreateIndex
CREATE INDEX "invoices_creditPeriodDays_isOverdue_idx" ON "invoices"("creditPeriodDays", "isOverdue");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_documentNumber_companyCodeId_key" ON "invoices"("documentNumber", "companyCodeId");

-- CreateIndex
CREATE INDEX "weekly_cashflows_weekNumber_companyCodeId_idx" ON "weekly_cashflows"("weekNumber", "companyCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_cashflows_companyCodeId_weekNumber_fiscalPeriodId_key" ON "weekly_cashflows"("companyCodeId", "weekNumber", "fiscalPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_snapshots_companyCodeId_fiscalPeriodId_key" ON "monthly_snapshots"("companyCodeId", "fiscalPeriodId");

-- CreateIndex
CREATE INDEX "dunning_history_invoiceId_idx" ON "dunning_history"("invoiceId");

-- CreateIndex
CREATE INDEX "dunning_history_dunningDate_idx" ON "dunning_history"("dunningDate");
