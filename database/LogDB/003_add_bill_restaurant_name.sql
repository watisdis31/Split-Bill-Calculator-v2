-- Optional restaurant/place name on bills.
-- Execute manually against easysplitbill. The app does not run migrations.

ALTER TABLE "Bills"
ADD COLUMN "billRestaurantName" VARCHAR(255);
