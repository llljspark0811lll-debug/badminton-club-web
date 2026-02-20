import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * ✅ 회원 목록 조회
 */
export async function GET(req: Request) {
  try {
    const adminIdStr = req.headers.get("x-admin-id");
    const adminId = adminIdStr ? Number(adminIdStr) : 1;

    const members = await prisma.member.findMany({
      where: { 
        adminId,
      },
      include: { fees: true },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("데이터 불러오기 에러:", error);
    return NextResponse.json([], { status: 500 });
  }
}

/**
 * ✅ 회원 등록
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminIdStr = req.headers.get("x-admin-id");
    const adminId = adminIdStr ? Number(adminIdStr) : 1;

    const newMember = await prisma.member.create({
      data: {
        name: body.name,
        gender: body.gender,
        birth: body.birth,
        phone: body.phone,
        level: body.level,
        carnumber: body.carnumber,
        note: body.note,
        adminId,
      },
      include: { fees: true },
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error("등록 에러:", error);
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }
}

/**
 * ✅ 회원 수정
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("서버가 받은 데이터:", body); // 👈 터미널에서 데이터가 실제로 들어오는지 확인용

    const { id, name, gender, birth, phone, level, carnumber, note } = body;

    const updated = await prisma.member.update({
      where: { id: Number(id) },
      data: {
        name: String(name || ""),
        gender: String(gender || ""),
        birth: String(birth || ""),
        phone: String(phone || ""),
        level: String(level || ""),
        carnumber: String(carnumber || ""), // 👈 강제로 String으로 형변환해서 명시
        note: String(note || ""),
      },
      include: { fees: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("🔥 수정 에러 상세:", error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

/**
 * ✅ 회원 삭제 (소프트 삭제)
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    await prisma.member.update({
      where: { id: Number(body.id) },
      data: { deleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("삭제 에러:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}

/**
 * ✅ 회원 복구
 */
export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    await prisma.member.update({
      where: { id: Number(id) },
      data: { deleted: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("복구 에러:", error);
    return NextResponse.json({ error: "복구 실패" }, { status: 500 });
  }
}
