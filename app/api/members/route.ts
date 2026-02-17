import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ✅ GET: 회원 목록과 회비 정보를 함께 가져오기
export async function GET() {
  try {
    const members = await prisma.member.findMany({
      include: {
        fees: true, // 회비 정보 포함
      },
      orderBy: { id: "desc" },
    });
    
    // 데이터가 잘 찾아졌다면 응답 보냄
    return NextResponse.json(members);
  } catch (error) {
    console.error("데이터 불러오기 에러:", error);
    // 에러가 발생하면 빈 배열이라도 보내서 클라이언트가 멈추지 않게 함
    return NextResponse.json([], { status: 500 });
  }
}

// ✅ POST: 회원 등록
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newMember = await prisma.member.create({
      data: body,
      include: { fees: true } // 등록 후 즉시 정보를 넘겨줄 때도 형식을 맞춤
    });
    return NextResponse.json(newMember);
  } catch (error) {
    console.error("등록 에러:", error);
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }
}

// PUT
export async function PUT(req: Request) {
  const body = await req.json();

  const updated = await prisma.member.update({
    where: { id: body.id },
    data: body,
  });

  return NextResponse.json(updated);
}

// DELETE
export async function DELETE(req: Request) {
  const body = await req.json();

  await prisma.member.update({
    where: { id: body.id },
    data: { deleted: true },
  });

  return NextResponse.json({ success: true });
}

// PATCH
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