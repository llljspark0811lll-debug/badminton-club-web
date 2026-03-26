import { prisma } from "@/lib/prisma";
import {
  getNextRegistrationStatus,
  normalizePhoneNumber,
  promoteWaitlistIfPossible,
} from "@/lib/session-registration";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const name = String(body.name ?? "").trim();
    const phone = normalizePhoneNumber(String(body.phone ?? ""));
    const action =
      body.action === "CANCEL" ? "CANCEL" : "REGISTER";

    if (!token || !name || !phone) {
      return NextResponse.json(
        { error: "이름과 전화번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const session = await prisma.clubSession.findUnique({
      where: { publicToken: token },
      include: {
        participants: true,
        club: {
          select: {
            id: true,
            publicJoinToken: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        clubId: session.club.id,
        deleted: false,
        name,
      },
    });

    if (!member || normalizePhoneNumber(member.phone) !== phone) {
      return NextResponse.json(
        {
          error:
            "회원 정보를 찾을 수 없습니다. 먼저 가입 신청 후 운영진 승인을 받아주세요.",
          joinToken: session.club.publicJoinToken,
        },
        { status: 404 }
      );
    }

    if (action === "CANCEL") {
      const participant = session.participants.find(
        (item) =>
          item.memberId === member.id &&
          item.status !== "CANCELED"
      );

      if (participant) {
        await prisma.sessionParticipant.update({
          where: { id: participant.id },
          data: {
            status: "CANCELED",
            attendanceStatus: "PENDING",
            checkedInAt: null,
          },
        });

        await promoteWaitlistIfPossible(prisma, session.id);
      }

      return NextResponse.json({
        success: true,
        status: "CANCELED",
      });
    }

    if (session.status !== "OPEN") {
      return NextResponse.json(
        { error: "현재 이 일정은 참석 신청을 받고 있지 않습니다." },
        { status: 400 }
      );
    }

    const existingParticipant = session.participants.find(
      (item) => item.memberId === member.id
    );
    const registeredCount = session.participants.filter(
      (item) => item.status === "REGISTERED"
    ).length;
    const nextStatus = getNextRegistrationStatus(
      session.capacity,
      registeredCount
    );

    if (existingParticipant) {
      await prisma.sessionParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          status: nextStatus,
          attendanceStatus: "PENDING",
          checkedInAt: null,
        },
      });
    } else {
      await prisma.sessionParticipant.create({
        data: {
          sessionId: session.id,
          memberId: member.id,
          status: nextStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "참석 응답을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
