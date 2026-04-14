import { prisma } from "@/lib/prisma";

let hasCheckedSessionCommentTable = false;
let hasSessionCommentTableCache = false;

async function detectSessionCommentTable() {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('SessionComment', 'sessioncomment')
    ) AS "exists"
  `;

  return Boolean(rows[0]?.exists);
}

export async function ensureSessionCommentTable() {
  if (hasCheckedSessionCommentTable && hasSessionCommentTableCache) {
    return true;
  }

  const exists = await detectSessionCommentTable();

  if (exists) {
    hasCheckedSessionCommentTable = true;
    hasSessionCommentTableCache = true;
    return true;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SessionComment" (
      "id" SERIAL NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "sessionId" INTEGER NOT NULL,
      "memberId" INTEGER NOT NULL,
      CONSTRAINT "SessionComment_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SessionComment_sessionId_createdAt_idx"
    ON "SessionComment"("sessionId", "createdAt")
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  hasCheckedSessionCommentTable = true;
  hasSessionCommentTableCache = true;
  return true;
}
