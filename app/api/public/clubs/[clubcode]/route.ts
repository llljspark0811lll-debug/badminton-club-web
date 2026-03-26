import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ clubcode: string }> }
) {
  try {
    const { clubcode } = await context.params;
    const accessKey = String(clubcode).trim();

    const club = await prisma.club.findFirst({
      where: {
        OR: [
          { publicJoinToken: accessKey },
          { code: accessKey.toLowerCase() },
        ],
      },
      include: {
        admins: {
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
          select: {
            customFieldLabel: true,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "?대읇??李얠쓣 ???놁뒿?덈떎." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: club.name,
      publicJoinToken: club.publicJoinToken,
      customFieldLabel:
        club.admins[0]?.customFieldLabel ?? "李⑤웾踰덊샇",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "?대읇 ?ㅼ젙??遺덈윭?ㅼ? 紐삵뻽?듬땲??" },
      { status: 500 }
    );
  }
}
