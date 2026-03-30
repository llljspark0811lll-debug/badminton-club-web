import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function findClubMember(
  memberId: number,
  clubId: number
) {
  return await prisma.member.findFirst({
    where: {
      id: memberId,
      clubId,
    },
  });
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    if (scope === "fees") {
      const feeMembers = await prisma.member.findMany({
        where: {
          clubId: admin.clubId,
          deleted: false,
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(feeMembers);
    }

    const members = await prisma.member.findMany({
      where: { clubId: admin.clubId },
      select: {
        id: true,
        name: true,
        gender: true,
        birth: true,
        phone: true,
        level: true,
        customFieldValue: true,
        note: true,
        status: true,
        createdAt: true,
        deleted: true,
        deletedAt: true,
        withdrawnAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      name,
      gender,
      birth,
      phone,
      level,
      customFieldValue,
      note,
    } =
      body;

    if (!name || !gender || !level) {
      return NextResponse.json(
        { error: "이름, 성별, 급수는 필수입니다." },
        { status: 400 }
      );
    }

    const newMember = await prisma.$transaction(async (tx) => {
      const createdMember = await tx.member.create({
        data: {
          name: String(name).trim(),
          gender,
          birth: birth ? new Date(birth) : null,
          phone: phone ? String(phone).trim() : "",
          level,
          customFieldValue: customFieldValue
            ? String(customFieldValue).trim()
            : "",
          note: note ? String(note).trim() : "",
          clubId: admin.clubId,
          status: "approved",
        },
      });

      const specialFees = await tx.specialFee.findMany({
        where: { clubId: admin.clubId },
        select: { id: true },
      });

      if (specialFees.length > 0) {
        await tx.specialFeePayment.createMany({
          data: specialFees.map((specialFee) => ({
            specialFeeId: specialFee.id,
            memberId: createdMember.id,
          })),
        });
      }

      return createdMember;
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      id,
      name,
      gender,
      birth,
      phone,
      level,
      customFieldValue,
      note,
    } =
      body;
    const memberId = Number(id);

    if (!Number.isFinite(memberId)) {
      return NextResponse.json(
        { error: "잘못된 회원 ID입니다." },
        { status: 400 }
      );
    }

    const existingMember = await findClubMember(
      memberId,
      admin.clubId
    );

    if (!existingMember) {
      return notFoundResponse("수정할 회원을 찾을 수 없습니다.");
    }

    const updatedMember = await prisma.member.update({
      where: { id: existingMember.id },
      data: {
        name: String(name).trim(),
        gender,
        birth: birth ? new Date(birth) : null,
        phone: phone ? String(phone).trim() : "",
        level,
        customFieldValue: customFieldValue
          ? String(customFieldValue).trim()
          : "",
        note: note ? String(note).trim() : "",
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const memberId = Number(id);
    const existingMember = await findClubMember(
      memberId,
      admin.clubId
    );

    if (!existingMember) {
      return notFoundResponse("삭제할 회원을 찾을 수 없습니다.");
    }

    await prisma.member.update({
      where: { id: existingMember.id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        withdrawnAt: new Date(),
      },
    });

    return NextResponse.json({ message: "삭제 성공" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const memberId = Number(id);
    const existingMember = await findClubMember(
      memberId,
      admin.clubId
    );

    if (!existingMember) {
      return notFoundResponse("복구할 회원을 찾을 수 없습니다.");
    }

    await prisma.member.update({
      where: { id: existingMember.id },
      data: {
        deleted: false,
        deletedAt: null,
        withdrawnAt: null,
      },
    });

    return NextResponse.json({ message: "복구 성공" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 복구에 실패했습니다." },
      { status: 500 }
    );
  }
}
