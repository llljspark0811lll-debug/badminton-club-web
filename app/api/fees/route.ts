import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // 1. JSON 파싱 시도
        const body = await req.json();
        const { memberId, year, month, paid } = body;

        // 2. 필수 값 체크 (오타 수정됨)
        if (memberId === undefined || year === undefined || month === undefined) {
            return NextResponse.json({ error: "필수 데이터가 누락되었습니다." }, { status: 400 });
        }

        // 3. 데이터 업데이트
        const fee = await prisma.fee.upsert({
            where: {
                memberId_year_month: {
                    memberId: Number(memberId),
                    year: Number(year),
                    month: Number(month),
                },
            },
            update: { paid: Boolean(paid) },
            create: {
                memberId: Number(memberId),
                year: Number(year),
                month: Number(month),
                paid: Boolean(paid),
            },
        });

        return NextResponse.json(fee);
    } catch (error: any) {
        console.error("회비 업데이트 에러 상세:", error);
        // 에러 발생 시 HTML이 아닌 JSON으로 에러 응답
        return NextResponse.json({ error: error.message || "서버 오류 발생" }, { status: 500 });
    }
}