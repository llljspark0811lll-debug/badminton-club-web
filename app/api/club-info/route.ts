import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCalculatedSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const [club, currentAdmin, pendingRequestCount] =
      await Promise.all([
        prisma.club.findUnique({
          where: { id: admin.clubId },
          select: {
            id: true,
            name: true,
            publicJoinToken: true,
            createdAt: true,
            subscriptionStatus: true,
            subscriptionEnd: true,
          },
        }),
        prisma.admin.findUnique({
          where: { id: admin.adminId },
          select: {
            customFieldLabel: true,
            email: true,
          },
        }),
        prisma.memberRequest.count({
          where: {
            clubId: admin.clubId,
            status: "PENDING",
          },
        }),
      ]);

    if (!club) {
      return NextResponse.json(
        { error: "클럽 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const calculatedStatus = getCalculatedSubscriptionStatus({
      subscriptionStatus: club.subscriptionStatus,
      createdAt: club.createdAt,
      subscriptionEnd: club.subscriptionEnd,
    });

    return NextResponse.json({
      id: club.id,
      name: club.name,
      publicJoinToken: club.publicJoinToken,
      calculatedStatus,
      subscriptionEnd: club.subscriptionEnd,
      customFieldLabel:
        currentAdmin?.customFieldLabel ?? "소속클럽",
      adminEmail: currentAdmin?.email ?? "",
      pendingRequestCount,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "클럽 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
