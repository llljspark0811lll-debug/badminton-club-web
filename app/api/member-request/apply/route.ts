import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const joinToken = String(body.joinToken ?? "").trim();

    if (!joinToken) {
      return NextResponse.json(
        { error: "가입 링크 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const club = await prisma.club.findUnique({
      where: {
        publicJoinToken: joinToken,
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "가입할 클럽을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.memberRequest.create({
      data: {
        name: body.name,
        gender: body.gender,
        birth: body.birth ? new Date(body.birth) : null,
        phone: body.phone,
        level: body.level,
        customFieldValue: body.customFieldValue || "",
        note: body.note || "",
        clubId: club.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 신청 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
