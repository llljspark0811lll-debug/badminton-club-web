import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("BODY:", body);
    
    if (!body.clubcode) {
      return NextResponse.json(
        { error: "클럽 코드가 없습니다." },
        { status: 400 }
      );
    }

    const club = await prisma.club.findUnique({
      where: { code: body.clubcode.toLowerCase() },
    });

    if (!club) {
      return NextResponse.json(
        { error: "존재하지 않는 클럽입니다." },
        { status: 404 }
      );
    }

    await prisma.memberRequest.create({
      data: {
        name: body.name,
        gender: body.gender,
        birth: body.birth,
        phone: body.phone,
        level: body.level,
        carnumber: body.carnumber || "",
        note: body.note || "",
        clubId: club.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}