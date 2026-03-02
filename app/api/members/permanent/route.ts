import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const { id } = await req.json();

    // 회비 정보가 있을 경우 Cascade 설정이 안되어 있다면 회비부터 삭제해야 할 수 있음
    await prisma.member.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "영구 삭제 성공" });
  } catch (error) {
    return NextResponse.json({ error: "영구 삭제 실패" }, { status: 500 });
  }
}