import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clubName, username, password } = body;

    if (!clubName || !username || !password) {
      return NextResponse.json(
        { error: "클럽 이름, 아이디, 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: String(username).trim() },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 아이디입니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: String(clubName).trim(),
        },
      });

      await tx.admin.create({
        data: {
          username: String(username).trim(),
          password: hashedPassword,
          clubId: club.id,
          role: "SUPER_ADMIN",
        },
      });

      return club;
    });

    return NextResponse.json({
      message: "클럽이 생성되었습니다.",
      clubId: result.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
