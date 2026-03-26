import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const joinToken = String(
      body.joinToken ?? body.clubcode ?? ""
    ).trim();

    if (!joinToken) {
      return NextResponse.json(
        { error: "?대읇 ?묐겕媛 ?놁뒿?덈떎." },
        { status: 400 }
      );
    }

    const club = await prisma.club.findFirst({
      where: {
        OR: [
          { publicJoinToken: joinToken },
          { code: joinToken.toLowerCase() },
        ],
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "議댁옱?섏? ?딅뒗 ?대읇?낅땲??" },
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
      { error: "?쒕쾭 ?ㅻ쪟" },
      { status: 500 }
    );
  }
}
