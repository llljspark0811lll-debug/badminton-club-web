import { PrismaClient } from "@prisma/client";
import { getTrialEndDate, TRIAL_DAYS } from "../lib/subscription";

const prisma = new PrismaClient();

async function main() {
  // ACTIVE/EXEMPT 클럽은 절대 체험 상태로 되돌리지 않는다.
  const trialClubs = await prisma.club.findMany({
    where: { subscriptionStatus: "TRIAL" },
    select: { id: true, name: true, createdAt: true },
  });

  for (const club of trialClubs) {
    await prisma.club.update({
      where: { id: club.id },
      data: {
        subscriptionEnd: getTrialEndDate(club.createdAt),
      },
    });
  }

  console.log(`✅ TRIAL ${trialClubs.length}개 클럽 → subscriptionEnd: 가입일 + ${TRIAL_DAYS}일`);

  const exemptClubs = await prisma.club.findMany({
    where: { subscriptionStatus: "EXEMPT" },
    select: { id: true, name: true },
  });
  if (exemptClubs.length > 0) {
    console.log(`ℹ️  EXEMPT 유지 클럽 (${exemptClubs.length}개): ${exemptClubs.map(c => `${c.name}(#${c.id})`).join(", ")}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
