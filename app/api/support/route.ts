import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

const CATEGORIES = ["사용방법 문의", "기능 추가 요구", "버그 제보", "기타"] as const;

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const category = String(body.category ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "문의 유형을 선택해주세요." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "문의 내용을 입력해주세요." }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "문의 내용은 2000자 이하로 입력해주세요." }, { status: 400 });
    }

    const [club, adminRecord] = await Promise.all([
      prisma.club.findUnique({ where: { id: admin.clubId }, select: { name: true } }),
      prisma.admin.findUnique({ where: { id: admin.adminId }, select: { email: true } }),
    ]);

    const clubName = club?.name ?? String(admin.clubId);
    const adminEmail = adminRecord?.email ?? "";

    await sendTelegramAlert({
      event: "SUPPORT_INQUIRY",
      clubName,
      adminEmail,
      category,
      message,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[support]", msg);
    return NextResponse.json({ error: "문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
