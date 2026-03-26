import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clubName, clubCode, username, password } = body;

    if (!clubName || !clubCode || !username || !password) {
      return NextResponse.json(
        { error: "모든 값을 입력해주세요." },
        { status: 400 }
      );
    }

    const normalizedCode = String(clubCode).trim().toLowerCase();

    const [existingClub, existingAdmin] = await Promise.all([
      prisma.club.findUnique({
        where: { code: normalizedCode },
      }),
      prisma.admin.findUnique({
        where: { username: String(username).trim() },
      }),
    ]);

    if (existingClub) {
      return NextResponse.json(
        { error: "이미 존재하는 클럽 코드입니다." },
        { status: 400 }
      );
    }

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
          code: normalizedCode,
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
