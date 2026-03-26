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

    const { specialFeeId, memberId, paid } = await req.json();

    const [specialFee, member] = await Promise.all([
      prisma.specialFee.findFirst({
        where: {
          id: Number(specialFeeId),
          clubId: admin.clubId,
        },
      }),
      prisma.member.findFirst({
        where: {
          id: Number(memberId),
          clubId: admin.clubId,
        },
      }),
    ]);

    if (!specialFee) {
      return notFoundResponse("수시회비 항목을 찾을 수 없습니다.");
    }

    if (!member) {
      return notFoundResponse("회원을 찾을 수 없습니다.");
    }

    const payment = await prisma.specialFeePayment.upsert({
      where: {
        specialFeeId_memberId: {
          specialFeeId: specialFee.id,
          memberId: member.id,
        },
      },
      update: {
        paid: Boolean(paid),
        paidAt: paid ? new Date() : null,
      },
      create: {
        specialFeeId: specialFee.id,
        memberId: member.id,
        paid: Boolean(paid),
        paidAt: paid ? new Date() : null,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "수시회비 납부 상태를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
