// app/api/admin/signup/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

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

    // 🔹 클럽 코드 소문자 통일
    const normalizedCode = clubCode.toLowerCase();

    // 🔹 중복 클럽 코드 체크
    const existingClub = await prisma.club.findUnique({
      where: { code: normalizedCode },
    });

    if (existingClub) {
      return NextResponse.json(
        { error: "이미 존재하는 클럽 코드입니다." },
        { status: 400 }
      );
    }

    // 🔹 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 트랜잭션으로 클럽 + 관리자 생성
    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: clubName,
          code: normalizedCode,
        },
      });

      await tx.admin.create({
        data: {
          username,
          password: hashedPassword,
          clubId: club.id,
          role: "SUPER_ADMIN",
        },
      });

      return club;
    });

    return NextResponse.json({
      message: "클럽 생성 완료",
      clubId: result.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버 오류 발생" },
      { status: 500 }
    );
  }
}