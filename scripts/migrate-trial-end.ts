/**
 * Legacy utility: 기존 TRIAL 클럽을 가입일 + 체험기간으로 재계산
 * ACTIVE/EXEMPT 상태 클럽은 건드리지 않음
 *
 * 실행: npx ts-node --skipProject scripts/migrate-trial-end.ts
 */
import { PrismaClient } from "@prisma/client";
import { getTrialEndDate, TRIAL_DAYS } from "../lib/subscription";

const prisma = new PrismaClient();

async function main() {
  const trialClubs = await prisma.club.findMany({
    where: { subscriptionStatus: "TRIAL" },
    select: { id: true, createdAt: true },
  });

  for (const club of trialClubs) {
    await prisma.club.update({
      where: { id: club.id },
      data: { subscriptionEnd: getTrialEndDate(club.createdAt) },
    });
  }

  console.log(`✅ ${trialClubs.length}개 TRIAL 클럽 → 가입일 + ${TRIAL_DAYS}일 적용 완료`);

  // 결과 확인
  const clubs = await prisma.club.findMany({
    select: { id: true, name: true, subscriptionStatus: true, subscriptionEnd: true },
    orderBy: { id: "asc" },
  });

  console.log("\n=== 전체 클럽 구독 현황 ===");
  for (const c of clubs) {
    const endStr = c.subscriptionEnd
      ? new Date(c.subscriptionEnd.getTime() + 9 * 60 * 60 * 1000)
          .toISOString().replace("T", " ").slice(0, 10) + " KST"
      : "없음";
    console.log(`  [${c.id}] ${c.name} | ${c.subscriptionStatus} | 만료: ${endStr}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
