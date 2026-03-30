import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const feeSelect = {
  id: true,
  memberId: true,
  year: true,
  month: true,
  paid: true,
} as const;

type FeeRow = {
  id: number;
  memberId: number;
  year: number;
  month: number;
  paid: boolean;
};

type MemberRow = {
  id: number;
};

async function getValidMember(
  memberId: number,
  clubId: number
) {
  const rows = await prisma.$queryRaw<MemberRow[]>`
    SELECT "id"
    FROM "Member"
    WHERE "id" = ${memberId}
      AND "clubId" = ${clubId}
      AND "deleted" = false
  `;

  return rows[0] ?? null;
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));

    if (!Number.isFinite(year)) {
      return NextResponse.json(
        { error: "연도를 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    const fees = await prisma.fee.findMany({
      where: {
        year,
        paid: true,
        member: {
          clubId: admin.clubId,
          deleted: false,
        },
      },
      select: feeSelect,
    });

    return NextResponse.json(fees);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회비 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const memberId = Number(body.memberId);
    const year = Number(body.year);
    const month = Number(body.month);
    const paid = Boolean(body.paid);

    if (
      !Number.isFinite(memberId) ||
      !Number.isFinite(year) ||
      !Number.isFinite(month)
    ) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!paid) {
      const member = await getValidMember(memberId, admin.clubId);

      if (!member) {
        return notFoundResponse(
          "회비를 수정할 회원을 찾을 수 없습니다."
        );
      }

      await prisma.$executeRaw`
        DELETE FROM "Fee"
        WHERE "memberId" = ${member.id}
          AND "year" = ${year}
          AND "month" = ${month}
      `;

      return NextResponse.json({
        id: 0,
        memberId: member.id,
        year,
        month,
        paid: false,
      });
    }

    const fees = await prisma.$queryRaw<FeeRow[]>`
      WITH valid_member AS (
        SELECT "id"
        FROM "Member"
        WHERE "id" = ${memberId}
          AND "clubId" = ${admin.clubId}
          AND "deleted" = false
      ),
      upserted AS (
        INSERT INTO "Fee" ("memberId", "year", "month", "paid")
        SELECT "id", ${year}, ${month}, true
        FROM valid_member
        ON CONFLICT ("memberId", "year", "month")
        DO UPDATE SET "paid" = EXCLUDED."paid"
        RETURNING "id", "memberId", "year", "month", "paid"
      )
      SELECT "id", "memberId", "year", "month", "paid"
      FROM upserted
    `;

    const fee = fees[0];

    if (!fee) {
      return notFoundResponse(
        "회비를 수정할 회원을 찾을 수 없습니다."
      );
    }

    return NextResponse.json(fee);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회비 상태를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const memberId = Number(body.memberId);
    const year = Number(body.year);
    const paid = Boolean(body.paid);

    if (!Number.isFinite(memberId) || !Number.isFinite(year)) {
      return NextResponse.json(
        { error: "회원과 연도 정보가 필요합니다." },
        { status: 400 }
      );
    }

    if (!paid) {
      const member = await getValidMember(memberId, admin.clubId);

      if (!member) {
        return notFoundResponse(
          "회비를 수정할 회원을 찾을 수 없습니다."
        );
      }

      await prisma.$executeRaw`
        DELETE FROM "Fee"
        WHERE "memberId" = ${member.id}
          AND "year" = ${year}
      `;

      return NextResponse.json([]);
    }

    const fees = await prisma.$queryRaw<FeeRow[]>`
      WITH valid_member AS (
        SELECT "id"
        FROM "Member"
        WHERE "id" = ${memberId}
          AND "clubId" = ${admin.clubId}
          AND "deleted" = false
      ),
      upserted AS (
        INSERT INTO "Fee" ("memberId", "year", "month", "paid")
        SELECT vm."id", ${year}, gs.month, true
        FROM valid_member vm
        CROSS JOIN generate_series(1, 12) AS gs(month)
        ON CONFLICT ("memberId", "year", "month")
        DO UPDATE SET "paid" = EXCLUDED."paid"
        RETURNING "id", "memberId", "year", "month", "paid"
      )
      SELECT "id", "memberId", "year", "month", "paid"
      FROM upserted
      ORDER BY "month" ASC
    `;

    if (fees.length === 0) {
      return notFoundResponse(
        "회비를 수정할 회원을 찾을 수 없습니다."
      );
    }

    return NextResponse.json(fees);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회비 일괄 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
