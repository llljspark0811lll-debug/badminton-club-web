import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const specialFees = await prisma.specialFee.findMany({
      where: { clubId: admin.clubId },
      include: {
        payments: {
          include: {
            member: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(specialFees);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "수시회비 목록을 불러오지 못했습니다." },
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

    const { title, amount, dueDate, description } = await req.json();

    if (!title || !amount) {
      return NextResponse.json(
        { error: "항목 이름과 금액은 필수입니다." },
        { status: 400 }
      );
    }

    const activeMembers = await prisma.member.findMany({
      where: {
        clubId: admin.clubId,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    const created = await prisma.$transaction(async (tx) => {
      const specialFee = await tx.specialFee.create({
        data: {
          title: String(title).trim(),
          amount: Number(amount),
          description: description ? String(description).trim() : "",
          dueDate: dueDate ? new Date(dueDate) : null,
          clubId: admin.clubId,
        },
      });

      if (activeMembers.length > 0) {
        await tx.specialFeePayment.createMany({
          data: activeMembers.map((member) => ({
            specialFeeId: specialFee.id,
            memberId: member.id,
          })),
        });
      }

      return await tx.specialFee.findUniqueOrThrow({
        where: { id: specialFee.id },
        include: {
          payments: {
            include: {
              member: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "수시회비 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
