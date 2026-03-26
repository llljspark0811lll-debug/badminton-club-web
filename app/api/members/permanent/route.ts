import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const memberId = Number(id);

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        clubId: admin.clubId,
      },
    });

    if (!member) {
      return notFoundResponse("영구 삭제할 회원을 찾을 수 없습니다.");
    }

    await prisma.member.delete({
      where: { id: member.id },
    });

    return NextResponse.json({
      message: "영구 삭제 성공",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "영구 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
