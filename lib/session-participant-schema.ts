import { prisma } from "@/lib/prisma";

let guestProfileColumnsPromise: Promise<boolean> | null = null;

export async function hasSessionParticipantGuestProfileColumns() {
  if (!guestProfileColumnsPromise) {
    guestProfileColumnsPromise = (async () => {
      const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('SessionParticipant', 'sessionparticipant')
            AND column_name IN ('guestAge', 'guestage')
        ) AS "exists"
      `;

      return rows[0]?.exists ?? false;
    })().catch((error) => {
      guestProfileColumnsPromise = null;
      throw error;
    });
  }

  return guestProfileColumnsPromise;
}
