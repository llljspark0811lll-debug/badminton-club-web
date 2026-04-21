import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureTutorialColumns } from "@/lib/tutorial-schema";
import { ensureSessionBracketTable } from "@/lib/session-bracket-schema";
import { generateSessionBracket } from "@/lib/session-bracket";
import { NextResponse } from "next/server";

const SAMPLE_MEMBERS = [
  { name: "김민재", gender: "남", level: "A" },
  { name: "이서연", gender: "여", level: "B" },
  { name: "박지훈", gender: "남", level: "B" },
  { name: "최수아", gender: "여", level: "C" },
  { name: "정현우", gender: "남", level: "A" },
  { name: "한지민", gender: "여", level: "B" },
  { name: "오성민", gender: "남", level: "C" },
  { name: "강나래", gender: "여", level: "A" },
  { name: "조태영", gender: "남", level: "B" },
  { name: "윤하린", gender: "여", level: "C" },
];

export async function POST() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    await ensureTutorialColumns();
    await ensureSessionBracketTable();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "SessionParticipant"
        WHERE "sessionId" IN (
          SELECT id FROM "ClubSession"
          WHERE "clubId" = ${admin.clubId} AND "isSample" = true
        )
      `;
      await tx.$executeRaw`
        DELETE FROM "ClubSession"
        WHERE "clubId" = ${admin.clubId} AND "isSample" = true
      `;
      await tx.$executeRaw`
        DELETE FROM "Member"
        WHERE "clubId" = ${admin.clubId} AND "isSample" = true
      `;
    });

    const result = await prisma.$transaction(async (tx) => {
      const memberRows: Array<{ id: number }> = [];

      for (const member of SAMPLE_MEMBERS) {
        const rows = await tx.$queryRaw<{ id: number }[]>`
          INSERT INTO "Member" (
            name, gender, level, phone, "clubId", status, "isSample",
            carnumber, note, deleted, "createdAt"
          )
          VALUES (
            ${member.name}, ${member.gender}, ${member.level}, '',
            ${admin.clubId}, 'approved', true, '', '', false, NOW()
          )
          RETURNING id
        `;

        memberRows.push(rows[0]);
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [sessionRow] = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO "ClubSession" (
          title, description, location, "publicToken", date, "startTime",
          "endTime", status, "clubId", "isSample", "createdAt"
        )
        VALUES (
          '[체험] 화요일 정기운동',
          '콕매니저 체험용 샘플 일정입니다.',
          '실내 배드민턴장',
          ${`sample-${admin.clubId}-${Date.now()}`},
          ${yesterday},
          '10:00',
          '13:00',
          'CLOSED',
          ${admin.clubId},
          true,
          NOW()
        )
        RETURNING id
      `;

      const participantRows: Array<{ id: number }> = [];

      for (const memberRow of memberRows) {
        const rows = await tx.$queryRaw<{ id: number }[]>`
          INSERT INTO "SessionParticipant" (
            "sessionId", "memberId", status, "attendanceStatus", "createdAt"
          )
          VALUES (${sessionRow.id}, ${memberRow.id}, 'REGISTERED', 'PENDING', NOW())
          RETURNING id
        `;

        participantRows.push(rows[0]);
      }

      const players = SAMPLE_MEMBERS.map((member, index) => ({
        playerId: `member-${memberRows[index].id}`,
        participantId: participantRows[index].id,
        name: member.name,
        gender: member.gender,
        level: member.level,
        isGuest: false,
        hostName: null,
      }));

      const bracket = generateSessionBracket({
        players,
        courtCount: 2,
        minGamesPerPlayer: 3,
        separateByGender: false,
        seed: 42,
      });

      await tx.$executeRaw`
        INSERT INTO "SessionBracket" (
          "sessionId", config, rounds, summary, "createdAt", "updatedAt"
        )
        VALUES (
          ${sessionRow.id},
          ${JSON.stringify(bracket.config)}::jsonb,
          ${JSON.stringify(bracket.rounds)}::jsonb,
          ${JSON.stringify(bracket.summary)}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT ("sessionId") DO UPDATE
        SET config = EXCLUDED.config,
            rounds = EXCLUDED.rounds,
            summary = EXCLUDED.summary,
            "updatedAt" = NOW()
      `;

      return { sessionId: sessionRow.id };
    });

    return NextResponse.json({ success: true, sessionId: result.sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[tutorial/seed]", message);
    return NextResponse.json(
      { error: "샘플 데이터 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
