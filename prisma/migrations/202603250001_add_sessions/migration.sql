CREATE TABLE IF NOT EXISTS "ClubSession" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clubId" INTEGER NOT NULL,

    CONSTRAINT "ClubSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SessionParticipant" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "attendanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionParticipant_sessionId_memberId_key"
ON "SessionParticipant"("sessionId", "memberId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ClubSession_clubId_fkey'
    ) THEN
        ALTER TABLE "ClubSession"
        ADD CONSTRAINT "ClubSession_clubId_fkey"
        FOREIGN KEY ("clubId") REFERENCES "Club"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SessionParticipant_sessionId_fkey'
    ) THEN
        ALTER TABLE "SessionParticipant"
        ADD CONSTRAINT "SessionParticipant_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "ClubSession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SessionParticipant_memberId_fkey'
    ) THEN
        ALTER TABLE "SessionParticipant"
        ADD CONSTRAINT "SessionParticipant_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
