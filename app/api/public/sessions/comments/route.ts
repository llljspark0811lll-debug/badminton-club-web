import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPublicMemberToken } from "@/lib/public-member-auth";
import { ensureSessionCommentTable } from "@/lib/session-comment-schema";

const PAGE_SIZE = 5;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function findSessionByToken(token: string) {
  return prisma.clubSession.findUnique({
    where: {
      publicToken: token,
    },
    select: {
      id: true,
      clubId: true,
    },
  });
}

async function findVerifiedMember(clubId: number, rememberToken: string) {
  const payload = await verifyPublicMemberToken(rememberToken);

  if (!payload || payload.clubId !== clubId) {
    return null;
  }

  return prisma.member.findFirst({
    where: {
      id: payload.memberId,
      clubId,
      deleted: false,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get("token") ?? "").trim();
    const page = parsePositiveInt(searchParams.get("page"), 1);

    if (!token) {
      return NextResponse.json(
        { error: "운동 일정 링크 정보가 없습니다." },
        { status: 400 }
      );
    }

    const session = await findSessionByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await ensureSessionCommentTable();

    const totalCountRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "SessionComment"
      WHERE "sessionId" = ${session.id}
    `;

    const totalCount = Number(totalCountRows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const commentRows = await prisma.$queryRaw<
      Array<{
        id: number;
        content: string;
        createdAt: Date;
        memberId: number;
        memberName: string;
      }>
    >`
      SELECT
        sc."id",
        sc."content",
        sc."createdAt",
        m."id" AS "memberId",
        m."name" AS "memberName"
      FROM "SessionComment" sc
      INNER JOIN "Member" m
        ON m."id" = sc."memberId"
      WHERE sc."sessionId" = ${session.id}
      ORDER BY sc."createdAt" DESC, sc."id" DESC
      OFFSET ${(safePage - 1) * PAGE_SIZE}
      LIMIT ${PAGE_SIZE}
    `;

    return NextResponse.json({
      comments: commentRows.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        member: {
          id: comment.memberId,
          name: comment.memberName,
        },
      })),
      page: safePage,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "댓글을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const rememberToken = String(body.rememberToken ?? "").trim();
    const content = String(body.content ?? "").trim();

    if (!token || !rememberToken) {
      return NextResponse.json(
        { error: "회원 확인 정보가 필요합니다." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "댓글 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    if (content.length > 300) {
      return NextResponse.json(
        { error: "댓글은 300자 이내로 입력해주세요." },
        { status: 400 }
      );
    }

    const session = await findSessionByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await ensureSessionCommentTable();

    const member = await findVerifiedMember(session.clubId, rememberToken);

    if (!member) {
      return NextResponse.json(
        {
          error:
            "회원 자동 인식 정보가 만료되었습니다. 다시 본인 확인을 진행해주세요.",
        },
        { status: 401 }
      );
    }

    const createdRows = await prisma.$queryRaw<
      Array<{
        id: number;
        content: string;
        createdAt: Date;
      }>
    >`
      INSERT INTO "SessionComment" ("content", "createdAt", "sessionId", "memberId")
      VALUES (${content}, CURRENT_TIMESTAMP, ${session.id}, ${member.id})
      RETURNING "id", "content", "createdAt"
    `;

    const createdComment = createdRows[0];

    return NextResponse.json({
      success: true,
      comment: {
        id: createdComment.id,
        content: createdComment.content,
        createdAt: createdComment.createdAt,
        member: {
          id: member.id,
          name: member.name,
        },
      },
      authorName: member.name,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "댓글을 등록하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const rememberToken = String(body.rememberToken ?? "").trim();
    const commentId = Number(body.commentId);

    if (!token || !rememberToken || !Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json(
        { error: "댓글 삭제에 필요한 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const session = await findSessionByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await ensureSessionCommentTable();

    const member = await findVerifiedMember(session.clubId, rememberToken);

    if (!member) {
      return NextResponse.json(
        {
          error:
            "회원 자동 인식 정보가 만료되었습니다. 다시 본인 확인을 진행해주세요.",
        },
        { status: 401 }
      );
    }

    const deletedRows = await prisma.$queryRaw<Array<{ id: number }>>`
      DELETE FROM "SessionComment"
      WHERE "id" = ${commentId}
        AND "sessionId" = ${session.id}
        AND "memberId" = ${member.id}
      RETURNING "id"
    `;

    if (deletedRows.length === 0) {
      return NextResponse.json(
        { error: "본인이 작성한 댓글만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCommentId: commentId,
      authorName: member.name,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "댓글을 삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
