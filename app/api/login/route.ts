import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return NextResponse.json(
        { message: "아이디가 존재하지 않습니다." },
        { status: 401 }
      );
    }

    if (admin.password !== password) {
      return NextResponse.json(
        { message: "비밀번호가 틀렸습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: admin.id,
      username: admin.username,
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    return NextResponse.json(
      { message: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
