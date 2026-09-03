import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";

export async function PATCH(request: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "모든 비밀번호 항목을 입력해 주세요." }, { status: 400 });
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "새 비밀번호 확인이 일치하지 않습니다." }, { status: 400 });
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { id: admin.adminId },
      select: { password: true },
    });
    if (!currentAdmin) return unauthorizedResponse();
    if (!(await bcrypt.compare(currentPassword, currentAdmin.password))) {
      return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
    if (await bcrypt.compare(newPassword, currentAdmin.password)) {
      return NextResponse.json({ error: "새 비밀번호는 현재 비밀번호와 다르게 설정해 주세요." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.admin.update({
        where: { id: admin.adminId },
        data: { password: hashedPassword, mustChangePassword: false },
      }),
      prisma.passwordResetToken.updateMany({
        where: { adminId: admin.adminId, used: false },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "비밀번호를 변경하지 못했습니다." }, { status: 500 });
  }
}
