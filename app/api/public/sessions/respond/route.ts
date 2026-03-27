import { prisma } from "@/lib/prisma";
import { verifyPublicMemberToken } from "@/lib/public-member-auth";
import {
  getNextRegistrationStatus,
  promoteWaitlistIfPossible,
} from "@/lib/session-registration";
import { NextResponse } from "next/server";

function sanitizeGuestNames(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const rememberToken = String(body.rememberToken ?? "").trim();
    const action =
      body.action === "CANCEL" ? "CANCEL" : "REGISTER";
    const guestNames = sanitizeGuestNames(body.guestNames);

    if (!token || !rememberToken) {
      return NextResponse.json(
        { error: "회원 확인 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const session = await prisma.clubSession.findUnique({
      where: { publicToken: token },
      include: {
        participants: {
          orderBy: {
            createdAt: "asc",
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

    const payload = await verifyPublicMemberToken(rememberToken);

    if (!payload || payload.clubId !== session.clubId) {
      return NextResponse.json(
        {
          error:
            "자동 인식 정보가 만료되었습니다. 다시 이름과 전화번호 뒤 4자리를 입력해주세요.",
        },
        { status: 401 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        id: payload.memberId,
        clubId: session.clubId,
        deleted: false,
      },
    });

    if (!member) {
      return NextResponse.json(
        {
          error:
            "회원 정보를 찾을 수 없습니다. 다시 본인 확인을 진행해주세요.",
        },
        { status: 404 }
      );
    }

    if (action === "CANCEL") {
      const activeOwnedParticipants = session.participants.filter(
        (item) =>
          item.status !== "CANCELED" &&
          (item.memberId === member.id ||
            item.hostMemberId === member.id)
      );

      const freedRegisteredCount = activeOwnedParticipants.filter(
        (item) => item.status === "REGISTERED"
      ).length;

      if (activeOwnedParticipants.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.sessionParticipant.updateMany({
            where: {
              id: {
                in: activeOwnedParticipants.map((item) => item.id),
              },
            },
            data: {
              status: "CANCELED",
              attendanceStatus: "PENDING",
              checkedInAt: null,
            },
          });

          for (
            let index = 0;
            index < freedRegisteredCount;
            index += 1
          ) {
            await promoteWaitlistIfPossible(tx, session.id);
          }
        });
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

    const existingMemberParticipant = session.participants.find(
      (item) => item.memberId === member.id
    );
    const existingGuestParticipants = session.participants.filter(
      (item) => item.hostMemberId === member.id
    );

    const previousRegisteredCount = [
      existingMemberParticipant,
      ...existingGuestParticipants,
    ].filter(
      (item) => item && item.status === "REGISTERED"
    ).length;

    const excludedIds = [
      existingMemberParticipant?.id,
      ...existingGuestParticipants.map((item) => item.id),
    ].filter((value): value is number => Boolean(value));

    const otherParticipants = session.participants.filter(
      (item) =>
        item.status !== "CANCELED" &&
        !excludedIds.includes(item.id)
    );

    let registeredCount = otherParticipants.filter(
      (item) => item.status === "REGISTERED"
    ).length;

    const createdAt = new Date();
    const memberStatus = getNextRegistrationStatus(
      session.capacity,
      registeredCount
    );

    if (memberStatus === "REGISTERED") {
      registeredCount += 1;
    }

    const guestStatuses = guestNames.map(() => {
      const status = getNextRegistrationStatus(
        session.capacity,
        registeredCount
      );

      if (status === "REGISTERED") {
        registeredCount += 1;
      }

      return status;
    });

    const nextRegisteredCount =
      (memberStatus === "REGISTERED" ? 1 : 0) +
      guestStatuses.filter((status) => status === "REGISTERED")
        .length;

    const freedRegisteredCount = Math.max(
      0,
      previousRegisteredCount - nextRegisteredCount
    );

    await prisma.$transaction(async (tx) => {
      if (existingMemberParticipant) {
        await tx.sessionParticipant.update({
          where: { id: existingMemberParticipant.id },
          data: {
            memberId: member.id,
            guestName: null,
            hostMemberId: null,
            status: memberStatus,
            attendanceStatus: "PENDING",
            checkedInAt: null,
            createdAt,
          },
        });
      } else {
        await tx.sessionParticipant.create({
          data: {
            sessionId: session.id,
            memberId: member.id,
            status: memberStatus,
            attendanceStatus: "PENDING",
            checkedInAt: null,
            createdAt,
          },
        });
      }

      for (let index = 0; index < guestNames.length; index += 1) {
        const existingGuest = existingGuestParticipants[index];

        if (existingGuest) {
          await tx.sessionParticipant.update({
            where: { id: existingGuest.id },
            data: {
              memberId: null,
              guestName: guestNames[index],
              hostMemberId: member.id,
              status: guestStatuses[index],
              attendanceStatus: "PENDING",
              checkedInAt: null,
              createdAt,
            },
          });
        } else {
          await tx.sessionParticipant.create({
            data: {
              sessionId: session.id,
              guestName: guestNames[index],
              hostMemberId: member.id,
              status: guestStatuses[index],
              attendanceStatus: "PENDING",
              checkedInAt: null,
              createdAt,
            },
          });
        }
      }

      const extraGuests = existingGuestParticipants.slice(
        guestNames.length
      );

      if (extraGuests.length > 0) {
        await tx.sessionParticipant.updateMany({
          where: {
            id: {
              in: extraGuests.map((item) => item.id),
            },
          },
          data: {
            status: "CANCELED",
            attendanceStatus: "PENDING",
            checkedInAt: null,
          },
        });
      }

      for (
        let index = 0;
        index < freedRegisteredCount;
        index += 1
      ) {
        await promoteWaitlistIfPossible(tx, session.id);
      }
    });

    return NextResponse.json({
      success: true,
      status: memberStatus,
      guestCount: guestNames.length,
      waitlistGuestCount: guestStatuses.filter(
        (status) => status === "WAITLIST"
      ).length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "참석 응답을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
