import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { memberId, year, month, paid } = await req.json();

        // upsert는 '있으면 수정(update), 없으면 생성(create)'하는 아주 유용한 기능입니다.
        const fee = await prisma.fee.upsert({
            where: {
                // schema.prisma에서 설정한 @@unique([memberId, year, month]) 덕분에 가능합니다.
                memberId_year_month: {
                    memberId: Number(memberId),
                    year: Number(year),
                    month: Number(month),
                },
            },
            update: {
                paid: paid,
            },
            create: {
                memberId: Number(memberId),
                year: Number(year),
                month: Number(month),
                paid: paid,
            },
        });

        return NextResponse.json(fee);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "회비 상태 변경 실패" }, { status: 500 });
    }
}