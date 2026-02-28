import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    await prisma.memberRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "거절 처리 실패" }, { status: 500 });
  }
}