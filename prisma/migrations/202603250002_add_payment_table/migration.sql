CREATE TABLE IF NOT EXISTS "Payment" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentKey" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "orderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clubId" INTEGER NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key"
ON "Payment"("orderId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Payment_clubId_fkey'
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT "Payment_clubId_fkey"
        FOREIGN KEY ("clubId") REFERENCES "Club"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
