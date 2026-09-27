-- Flag for receipts whose item prices already include tax.
-- Execute manually against easysplitbill. The app does not run migrations.

ALTER TABLE "Bills"
ADD COLUMN "billTaxIncluded" BOOLEAN NOT NULL DEFAULT false;
