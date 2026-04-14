CREATE TABLE IF NOT EXISTS "SessionComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,

    CONSTRAINT "SessionComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionComment_sessionId_createdAt_idx"
ON "SessionComment"("sessionId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SessionComment_sessionId_fkey'
    ) THEN
        ALTER TABLE "SessionComment"
        ADD CONSTRAINT "SessionComment_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "ClubSession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SessionComment_memberId_fkey'
    ) THEN
        ALTER TABLE "SessionComment"
        ADD CONSTRAINT "SessionComment_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
