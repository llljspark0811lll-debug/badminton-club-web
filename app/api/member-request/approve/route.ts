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

    const { id } = await req.json();
    const requestId = Number(id);

    const memberRequest = await prisma.memberRequest.findFirst({
      where: {
        id: requestId,
        clubId: admin.clubId,
      },
    });

    if (!memberRequest) {
      return notFoundResponse("가입 신청을 찾을 수 없습니다.");
    }

    if (memberRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "이미 처리된 가입 신청입니다." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const createdMember = await tx.member.create({
        data: {
          name: memberRequest.name,
          gender: memberRequest.gender,
          birth: memberRequest.birth,
          phone: memberRequest.phone,
          level: memberRequest.level,
          customFieldValue: memberRequest.customFieldValue,
          note: memberRequest.note,
          clubId: memberRequest.clubId,
          status: "approved",
        },
      });

      const specialFees = await tx.specialFee.findMany({
        where: { clubId: memberRequest.clubId },
        select: { id: true },
      });

      if (specialFees.length > 0) {
        await tx.specialFeePayment.createMany({
          data: specialFees.map((specialFee) => ({
            specialFeeId: specialFee.id,
            memberId: createdMember.id,
          })),
        });
      }

      await tx.memberRequest.update({
        where: { id: memberRequest.id },
        data: {
          status: "APPROVED",
          processedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 승인 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
