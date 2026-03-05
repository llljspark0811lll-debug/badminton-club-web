// app/api/payments/confirm/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentKey, orderId, amount, clubId } = await req.json();

    const secretKey = process.env.TOSS_SECRET_KEY;
    const basicToken = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        paymentKey, 
        orderId, 
        amount: Number(amount) 
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.message }, { status: response.status });
    }

    // 💡 날짜 계산 로직 개선: 기존 만료일이 미래라면 거기서 30일 추가, 지났다면 오늘부터 30일 추가
    const currentClub = await prisma.club.findUnique({ where: { id: Number(clubId) } });
    const now = new Date();
    const baseDate = (currentClub?.subscriptionEnd && currentClub.subscriptionEnd > now) 
      ? new Date(currentClub.subscriptionEnd) 
      : now;
    
    const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId,
          paymentKey,
          amount: Number(amount),
          status: "DONE",
          method: result.method || "CARD",
          orderName: result.orderName || "정기 이용권",
          clubId: Number(clubId),
        },
      }),
      prisma.club.update({
        where: { id: Number(clubId) },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionEnd: newEndDate,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}