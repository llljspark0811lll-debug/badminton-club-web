CREATE TABLE IF NOT EXISTS "SessionBracket" (
    "id" SERIAL NOT NULL,
    "config" JSONB NOT NULL,
    "rounds" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" INTEGER NOT NULL,
    CONSTRAINT "SessionBracket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionBracket_sessionId_key"
ON "SessionBracket"("sessionId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'SessionBracket_sessionId_fkey'
    ) THEN
        ALTER TABLE "SessionBracket"
        ADD CONSTRAINT "SessionBracket_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "ClubSession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
