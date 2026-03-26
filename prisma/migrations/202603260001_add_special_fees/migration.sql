CREATE TABLE IF NOT EXISTS "SpecialFee" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clubId" INTEGER NOT NULL,

    CONSTRAINT "SpecialFee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpecialFeePayment" (
    "id" SERIAL NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "specialFeeId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,

    CONSTRAINT "SpecialFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SpecialFeePayment_specialFeeId_memberId_key"
ON "SpecialFeePayment"("specialFeeId", "memberId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SpecialFee_clubId_fkey'
    ) THEN
        ALTER TABLE "SpecialFee"
        ADD CONSTRAINT "SpecialFee_clubId_fkey"
        FOREIGN KEY ("clubId") REFERENCES "Club"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SpecialFeePayment_specialFeeId_fkey'
    ) THEN
        ALTER TABLE "SpecialFeePayment"
        ADD CONSTRAINT "SpecialFeePayment_specialFeeId_fkey"
        FOREIGN KEY ("specialFeeId") REFERENCES "SpecialFee"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SpecialFeePayment_memberId_fkey'
    ) THEN
        ALTER TABLE "SpecialFeePayment"
        ADD CONSTRAINT "SpecialFeePayment_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
