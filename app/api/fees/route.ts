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

async function findClubMember(memberId: number, clubId: number) {
  return prisma.member.findFirst({
    where: {
      id: memberId,
      clubId,
      deleted: false,
    },
    select: {
      id: true,
    },
  });
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

    const member = await findClubMember(memberId, admin.clubId);

    if (!member) {
      return notFoundResponse(
        "회비를 수정할 회원을 찾을 수 없습니다."
      );
    }

    if (!paid) {
      await prisma.fee.deleteMany({
        where: {
          memberId: member.id,
          year,
          month,
        },
      });

      return NextResponse.json({
        id: 0,
        memberId: member.id,
        year,
        month,
        paid: false,
      });
    }

    const fee = await prisma.fee.upsert({
      where: {
        memberId_year_month: {
          memberId: member.id,
          year,
          month,
        },
      },
      update: { paid: true },
      create: {
        memberId: member.id,
        year,
        month,
        paid: true,
      },
      select: feeSelect,
    });

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

    const member = await findClubMember(memberId, admin.clubId);

    if (!member) {
      return notFoundResponse(
        "회비를 수정할 회원을 찾을 수 없습니다."
      );
    }

    if (!paid) {
      await prisma.fee.deleteMany({
        where: {
          memberId: member.id,
          year,
        },
      });

      return NextResponse.json([]);
    }

    const fees = await prisma.$transaction(async (tx) => {
      await tx.fee.updateMany({
        where: {
          memberId: member.id,
          year,
          paid: false,
        },
        data: {
          paid: true,
        },
      });

      await tx.fee.createMany({
        data: Array.from({ length: 12 }, (_, index) => ({
          memberId: member.id,
          year,
          month: index + 1,
          paid: true,
        })),
        skipDuplicates: true,
      });

      return tx.fee.findMany({
        where: {
          memberId: member.id,
          year,
          paid: true,
        },
        select: feeSelect,
      });
    });

    return NextResponse.json(fees);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회비 일괄 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
