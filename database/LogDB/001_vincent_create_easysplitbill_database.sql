-- EasySplitBill — initial PostgreSQL schema
--
-- This file must be executed MANUALLY. The application does not create or
-- migrate the database on startup.
--
-- Create the database first (connected to the 'postgres' maintenance DB):
--      CREATE DATABASE easysplitbill;
--
-- Then connect to easysplitbill and run this file.
--
-- DBeaver:
--   1. Connect to database easysplitbill (not postgres).
--   2. Open this file.
--   3. Use Execute SQL Script (Alt+X), NOT Execute SQL Statement (Ctrl+Enter).
--
-- Money is stored as BIGINT minor units (IDR rupiah, USD cents).
-- Percentage discounts are stored as integer basis points (10% = 1000).

CREATE TABLE "Users" (
  "UserId" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL,
  "userPassword" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Users_username_key" UNIQUE ("username"),
  CONSTRAINT "Users_username_not_blank" CHECK (LENGTH(TRIM("username")) > 0),
  CONSTRAINT "Users_password_not_blank" CHECK (LENGTH("userPassword") > 0)
);

CREATE INDEX "idx_users_username" ON "Users" ("username");

-- ---------------------------------------------------------------------------
-- Currencies
-- ---------------------------------------------------------------------------
CREATE TABLE "Currencies" (
  "CurrencyId" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "currencyCode" VARCHAR(8) NOT NULL,
  "currencyName" VARCHAR(64) NOT NULL,
  "currencySymbol" VARCHAR(8) NOT NULL,
  "decimalPlaces" INTEGER NOT NULL,
  CONSTRAINT "Currencies_code_key" UNIQUE ("currencyCode"),
  CONSTRAINT "Currencies_decimal_places_check" CHECK ("decimalPlaces" >= 0 AND "decimalPlaces" <= 4)
);

INSERT INTO "Currencies" ("currencyCode", "currencyName", "currencySymbol", "decimalPlaces")
VALUES
  ('IDR', 'Indonesian Rupiah', 'Rp', 0),
  ('USD', 'US Dollar', '$', 2);

-- ---------------------------------------------------------------------------
-- Bills
-- ---------------------------------------------------------------------------
CREATE TABLE "Bills" (
  "BillId" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "BillUserId" INTEGER NOT NULL,
  "billTitle" VARCHAR(200) NOT NULL,
  "billTax" BIGINT NOT NULL DEFAULT 0,
  "billService" BIGINT NOT NULL DEFAULT 0,
  "billDiscount" BIGINT NOT NULL DEFAULT 0,
  "billDiscountType" VARCHAR(16) NOT NULL DEFAULT 'PERCENTAGE',
  "billDiscountTiming" VARCHAR(16) NOT NULL DEFAULT 'BEFORE_CHARGES',
  "billShareToken" VARCHAR(64),
  "BillCurrencyFKId" INTEGER NOT NULL,
  "BillCreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "BillUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bills_title_not_blank" CHECK (LENGTH(TRIM("billTitle")) > 0),
  CONSTRAINT "Bills_tax_non_negative" CHECK ("billTax" >= 0),
  CONSTRAINT "Bills_service_non_negative" CHECK ("billService" >= 0),
  CONSTRAINT "Bills_discount_non_negative" CHECK ("billDiscount" >= 0),
  CONSTRAINT "Bills_discount_type_check" CHECK ("billDiscountType" IN ('PERCENTAGE', 'FIXED')),
  CONSTRAINT "Bills_discount_timing_check" CHECK ("billDiscountTiming" IN ('BEFORE_CHARGES', 'AFTER_CHARGES')),
  CONSTRAINT "Bills_percentage_discount_check" CHECK (
    ("billDiscountType" = 'FIXED')
    OR ("billDiscountType" = 'PERCENTAGE' AND "billDiscount" <= 10000)
  ),
  CONSTRAINT "Bills_share_token_key" UNIQUE ("billShareToken"),
  CONSTRAINT "Bills_user_fk"
    FOREIGN KEY ("BillUserId") REFERENCES "Users" ("UserId") ON DELETE CASCADE,
  CONSTRAINT "Bills_currency_fk"
    FOREIGN KEY ("BillCurrencyFKId") REFERENCES "Currencies" ("CurrencyId") ON DELETE RESTRICT
);

CREATE INDEX "idx_bills_userid" ON "Bills" ("BillUserId");
CREATE INDEX "idx_bills_createdat" ON "Bills" ("BillCreatedAt" DESC);
CREATE INDEX "idx_bills_sharetoken" ON "Bills" ("billShareToken");

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------
CREATE TABLE "Items" (
  "ItemId" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "itemName" VARCHAR(200) NOT NULL,
  "itemQuantity" INTEGER NOT NULL,
  "itemPrice" BIGINT NOT NULL,
  "itemNotes" VARCHAR(500),
  "ItemBillId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Items_name_not_blank" CHECK (LENGTH(TRIM("itemName")) > 0),
  CONSTRAINT "Items_quantity_min" CHECK ("itemQuantity" >= 1),
  CONSTRAINT "Items_price_positive" CHECK ("itemPrice" > 0),
  CONSTRAINT "Items_bill_fk"
    FOREIGN KEY ("ItemBillId") REFERENCES "Bills" ("BillId") ON DELETE CASCADE
);

CREATE INDEX "idx_items_billid" ON "Items" ("ItemBillId");

-- ---------------------------------------------------------------------------
-- BillAccess
-- ---------------------------------------------------------------------------
CREATE TABLE "BillAccess" (
  "BillAccessId" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "BillAccessBillId" INTEGER NOT NULL,
  "BillAccessUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillAccess_bill_user_key" UNIQUE ("BillAccessBillId", "BillAccessUserId"),
  CONSTRAINT "BillAccess_bill_fk"
    FOREIGN KEY ("BillAccessBillId") REFERENCES "Bills" ("BillId") ON DELETE CASCADE,
  CONSTRAINT "BillAccess_user_fk"
    FOREIGN KEY ("BillAccessUserId") REFERENCES "Users" ("UserId") ON DELETE CASCADE
);

CREATE INDEX "idx_billaccess_billid" ON "BillAccess" ("BillAccessBillId");
CREATE INDEX "idx_billaccess_userid" ON "BillAccess" ("BillAccessUserId");
