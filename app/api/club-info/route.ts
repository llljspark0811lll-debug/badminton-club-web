// app/api/club-info/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) return NextResponse.json({ name: "클럽(미인증)" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const clubId = decoded.clubId;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      // 💡 가입일과 현재 구독 상태를 가져와야 계산이 가능합니다.
      select: { 
        id: true, 
        name: true,
        createdAt: true,
        subscriptionStatus: true
      }
    });

    if (!club) return NextResponse.json({ name: "알 수 없는 클럽" }, { status: 404 });

    // 💡 만료 여부 계산 로직
    const now = new Date();
    const createdDate = new Date(club.createdAt);
    const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

    let calculatedStatus = "ACTIVE";
    // 상태가 TRIAL이고 24시간이 지났다면 EXPIRED로 판정
    if (club.subscriptionStatus === "TRIAL" && diffHours >= 24) {
      calculatedStatus = "EXPIRED";
    }

    return NextResponse.json({
      id: club.id,
      name: club.name,
      calculatedStatus: calculatedStatus // 💡 프론트엔드가 기다리는 값
    }); 
  } catch (error) {
    return NextResponse.json({ name: "에러 발생" }, { status: 500 });
  }
}