import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    const request = await prisma.memberRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "신청 없음" }, { status: 404 });

    // 트랜잭션으로 안전하게 처리
    await prisma.$transaction([
      prisma.member.create({
        data: {
          name: request.name,
          gender: request.gender,
          birth: request.birth,
          phone: request.phone,
          level: request.level,
          carnumber: request.carnumber,
          note: request.note,
          clubId: request.clubId,
          status: "approved",
        },
      }),
      prisma.memberRequest.update({
        where: { id },
        data: { status: "APPROVED", processedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "승인 처리 실패" }, { status: 500 });
  }
}