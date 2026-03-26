import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaLikeClient = Prisma.TransactionClient | typeof prisma;

export function getNextRegistrationStatus(
  capacity: number | null,
  registeredCount: number
) {
  if (capacity !== null && registeredCount >= capacity) {
    return "WAITLIST" as const;
  }

  return "REGISTERED" as const;
}

export async function promoteWaitlistIfPossible(
  db: PrismaLikeClient,
  sessionId: number
) {
  const session = await db.clubSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!session || session.capacity === null) {
    return;
  }

  const registeredCount = session.participants.filter(
    (participant) => participant.status === "REGISTERED"
  ).length;

  if (registeredCount >= session.capacity) {
    return;
  }

  const waitlisted = session.participants.find(
    (participant) => participant.status === "WAITLIST"
  );

  if (!waitlisted) {
    return;
  }

  await db.sessionParticipant.update({
    where: { id: waitlisted.id },
    data: { status: "REGISTERED" },
  });
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}
