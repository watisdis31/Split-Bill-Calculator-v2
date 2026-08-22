-- Improve dashboard listing: owner + created-at filter/sort/pagination.
-- Execute manually against easysplitbill. The app does not run migrations.

CREATE INDEX IF NOT EXISTS "idx_bills_userid_createdat"
  ON "Bills" ("BillUserId", "BillCreatedAt" DESC);
