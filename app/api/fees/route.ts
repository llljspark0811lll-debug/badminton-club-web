import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { memberId, year, month, paid } = body;

    if (
      memberId === undefined ||
      year === undefined ||
      month === undefined
    ) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        id: Number(memberId),
        clubId: admin.clubId,
      },
    });

    if (!member) {
      return notFoundResponse("회비를 수정할 회원을 찾을 수 없습니다.");
    }

    const fee = await prisma.fee.upsert({
      where: {
        memberId_year_month: {
          memberId: member.id,
          year: Number(year),
          month: Number(month),
        },
      },
      update: { paid: Boolean(paid) },
      create: {
        memberId: member.id,
        year: Number(year),
        month: Number(month),
        paid: Boolean(paid),
      },
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
