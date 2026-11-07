ALTER TABLE "quotes" ALTER COLUMN "unit_price_cents" SET DATA TYPE bigint USING "unit_price_cents"::bigint;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "total_price_cents" SET DATA TYPE bigint USING "total_price_cents"::bigint;--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "budget_cents" SET DATA TYPE bigint USING "budget_cents"::bigint;