-- Case-insensitive username uniqueness for login and registration.
-- Execute manually against easysplitbill. The app does not run migrations.
--
-- DBeaver:
--   1. Connect to database easysplitbill (not postgres).
--   2. Run STEP 1 first (Execute SQL Statement / Ctrl+Enter is fine for the SELECT).
--   3. If STEP 1 returns any rows, resolve those users before running STEP 2.
--      Do not delete, merge, or rename accounts automatically.
--   4. Then run STEP 2 with Execute SQL Script (Alt+X).
--
-- Stored username casing is kept for display (e.g. @Johan12).
-- Matching uses LOWER("username").

-- STEP 1: detect existing usernames that differ only by capitalization.
SELECT
  LOWER("username") AS normalized_username,
  COUNT(*) AS count,
  array_agg("username" ORDER BY "UserId") AS usernames,
  array_agg("UserId" ORDER BY "UserId") AS ids
FROM "Users"
GROUP BY LOWER("username")
HAVING COUNT(*) > 1;

-- STEP 2: enforce case-insensitive uniqueness and drop the old
-- case-sensitive unique constraint / extra lookup index.
-- Skip this step if STEP 1 returned any rows.

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_unique"
  ON "Users" (LOWER("username"));

ALTER TABLE "Users"
  DROP CONSTRAINT IF EXISTS "Users_username_key";

DROP INDEX IF EXISTS "idx_users_username";
