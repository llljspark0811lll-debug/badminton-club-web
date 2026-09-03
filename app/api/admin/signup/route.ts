import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrialEndDate } from "@/lib/subscription";
import { sendTelegramNewClubAlert } from "@/lib/telegram";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";

const ADMIN_USERNAME_REGEX = /^[a-z0-9]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clubName, username, email, password, confirmPassword } = body;
    const trimmedClubName = String(clubName ?? "").trim();
    const normalizedUsername = String(username ?? "").trim().toLowerCase();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    console.log("[signup] New club signup requested", {
      clubName: trimmedClubName,
      username: normalizedUsername,
      email: normalizedEmail,
    });

    if (
      !trimmedClubName ||
      !normalizedUsername ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "클럽/소모임 이름, 관리자 아이디, 관리자 이메일, 비밀번호, 비밀번호 확인을 입력해 주세요.",
        },
        { status: 400 }
      );
    }

    if (String(password) !== String(confirmPassword)) {
      return NextResponse.json(
        { error: "비밀번호 확인이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    if (!isValidPassword(String(password))) {
      return NextResponse.json(
        { error: PASSWORD_POLICY_MESSAGE },
        { status: 400 }
      );
    }

    if (!ADMIN_USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json(
        {
          error: "관리자 아이디는 영문 소문자와 숫자만 사용할 수 있습니다.",
        },
        { status: 400 }
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 아이디입니다." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.admin.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 이메일입니다." },
        { status: 400 }
      );
    }

    // 이메일 인증 완료 여부 확인
    const emailVerified = await prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
        verified: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!emailVerified) {
      return NextResponse.json(
        { error: "이메일 인증이 필요합니다. 인증 코드를 확인해 주세요." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const result = await prisma.$transaction(async (tx) => {
      const trialStart = new Date();
      const trialEnd = getTrialEndDate(trialStart);
      const club = await tx.club.create({
        data: {
          name: trimmedClubName,
          createdAt: trialStart,
          subscriptionEnd: trialEnd,
        },
      });

      const admin = await tx.admin.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          password: hashedPassword,
          clubId: club.id,
          role: "SUPER_ADMIN",
        },
      });

      return { club, admin };
    });

    console.log("[signup] Club created successfully", {
      clubId: result.club.id,
      clubName: result.club.name,
    });

    // 사용된 인증 레코드 정리
    await prisma.emailVerification.deleteMany({ where: { email: normalizedEmail } }).catch(() => undefined);

    try {
      await sendTelegramNewClubAlert({
        clubName: result.club.name,
      });
    } catch (telegramError) {
      console.error("Telegram new club alert failed", telegramError);
    }

    const token = await createToken({
      adminId: result.admin.id,
      clubId: result.admin.clubId,
      role: result.admin.role,
    });

    const response = NextResponse.json({
      message: "클럽/소모임이 생성되었습니다.",
      clubId: result.club.id,
    });

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("username")
    ) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 아이디입니다." },
        { status: 400 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
