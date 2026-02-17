import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // localStorage에서 adminId 가져오기 (클라이언트에서 헤더로 보내야 함)
    // 임시: 요청에서 username 파싱 (나중에 개선)
    const adminIdStr = req.headers.get("x-admin-id");
    const adminId = adminIdStr ? Number(adminIdStr) : 1; // 기본값 test01

    const members = await prisma.member.findMany({
      where: { 
        adminId: adminId // 로그인한 관리자의 회원만
      },
      include: {
        fees: true,
      },
      orderBy: { id: "desc" },
    });
    
    return NextResponse.json(members);
  } catch (error) {
    console.error("데이터 불러오기 에러:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminIdStr = req.headers.get("x-admin-id");
    const adminId = adminIdStr ? Number(adminIdStr) : 1;

    const newMember = await prisma.member.create({
      data: {
        ...body,
        adminId,
      },
      include: { fees: true }
    });
    return NextResponse.json(newMember);
  } catch (error) {
    console.error("등록 에러:", error);
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();

  const updated = await prisma.member.update({
    where: { id: body.id },
    data: body,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.member.update({
    where: { id: body.id },
    data: { deleted: true },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    await prisma.member.update({
      where: { id: Number(id) },
      data: { deleted: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "복구 실패" }, { status: 500 });
  }
}
