ALTER TABLE "Club"
ADD COLUMN IF NOT EXISTS "publicJoinToken" TEXT;

UPDATE "Club"
SET "publicJoinToken" = 'join_' || substring(md5(random()::text || clock_timestamp()::text || id::text) from 1 for 16)
WHERE "publicJoinToken" IS NULL;

ALTER TABLE "Club"
ALTER COLUMN "publicJoinToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Club_publicJoinToken_key"
ON "Club"("publicJoinToken");

ALTER TABLE "ClubSession"
ADD COLUMN IF NOT EXISTS "publicToken" TEXT;

UPDATE "ClubSession"
SET "publicToken" = 'session_' || substring(md5(random()::text || clock_timestamp()::text || id::text) from 1 for 16)
WHERE "publicToken" IS NULL;

ALTER TABLE "ClubSession"
ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ClubSession_publicToken_key"
ON "ClubSession"("publicToken");
