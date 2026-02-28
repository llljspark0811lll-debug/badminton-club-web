// app/api/club-info/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      console.error("토큰이 없습니다.");
      return NextResponse.json({ name: "클럽(미인증)" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const clubId = decoded.clubId;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true }
    });

    if (!club) {
      return NextResponse.json({ name: "알 수 없는 클럽" }, { status: 404 });
    }

    return NextResponse.json(club); // { name: "OOO 클럽" } 반환
  } catch (error) {
    console.error("클럽정보 API 에러:", error);
    return NextResponse.json({ name: "에러 발생 클럽" }, { status: 500 });
  }
}