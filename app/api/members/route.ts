import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

async function getClubId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    return decoded.clubId;
  } catch {
    return null;
  }
}

// 1. 회원 목록 가져오기 (활동/탈퇴 회원 모두 포함하여 가져오되 프론트에서 필터링)
export async function GET() {
  try {
    const clubId = await getClubId();
    if (!clubId) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const members = await prisma.member.findMany({
      where: { clubId }, // deleted 필터링은 프론트엔드에서 처리 (상태 관리를 위해)
      include: { fees: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// 2. 회원 등록 (POST)
export async function POST(req: Request) {
  try {
    const clubId = await getClubId();
    if (!clubId) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const body = await req.json();
    const { name, gender, birth, phone, level, carnumber, note } = body;

    const newMember = await prisma.member.create({
      data: {
        name,
        gender,
        birth: birth ? new Date(birth) : null,
        phone,
        level,
        carnumber,
        note,
        clubId,
      },
    });

    return NextResponse.json(newMember);
  } catch (error) {
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }
}

// 3. 회원 정보 수정 (PUT)
export async function PUT(req: Request) {
  try {
    const clubId = await getClubId();
    if (!clubId) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const body = await req.json();
    const { id, name, gender, birth, phone, level, carnumber, note } = body;

    const updatedMember = await prisma.member.update({
      where: { id: Number(id) },
      data: {
        name,
        gender,
        birth: birth ? new Date(birth) : null,
        phone,
        level,
        carnumber,
        note,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

// 4. 회원 삭제 (소프트 삭제 - DELETE)
export async function DELETE(req: Request) {
  try {
    const clubId = await getClubId();
    if (!clubId) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const { id } = await req.json();

    await prisma.member.update({
      where: { id: Number(id) },
      data: { 
        deleted: true,
        deletedAt: new Date() // 👈 탈퇴 날짜 기록
      },
    });

    return NextResponse.json({ message: "삭제 성공" });
  } catch (error) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}

// 5. 회원 복구 (소프트 삭제 해제 - PATCH)
export async function PATCH(req: Request) {
  try {
    const clubId = await getClubId();
    if (!clubId) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const { id } = await req.json();

    await prisma.member.update({
      where: { id: Number(id) },
      data: { 
        deleted: false,
        deletedAt: null // 👈 복구 시 날짜 초기화
      },
    });

    return NextResponse.json({ message: "복구 성공" });
  } catch (error) {
    return NextResponse.json({ error: "복구 실패" }, { status: 500 });
  }
}