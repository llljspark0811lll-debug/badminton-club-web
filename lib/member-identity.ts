import { normalizePhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

type DuplicateOptions = {
  clubId: number;
  excludeMemberId?: number;
  excludeRequestId?: number;
};

export async function findDuplicateActiveMember(
  name: string,
  phone: string,
  options: DuplicateOptions
) {
  const normalizedName = String(name ?? "").trim();
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedName || !normalizedPhone) {
    return null;
  }

  const candidates = await prisma.member.findMany({
    where: {
      clubId: options.clubId,
      name: normalizedName,
      deleted: false,
      ...(options.excludeMemberId
        ? {
            NOT: {
              id: options.excludeMemberId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      clubId: true,
      phone: true,
    },
  });

  return (
    candidates.find(
      (member) =>
        normalizePhoneNumber(member.phone) === normalizedPhone
    ) ?? null
  );
}

export async function findDuplicatePendingRequest(
  name: string,
  phone: string,
  options: DuplicateOptions
) {
  const normalizedName = String(name ?? "").trim();
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedName || !normalizedPhone) {
    return null;
  }

  const candidates = await prisma.memberRequest.findMany({
    where: {
      clubId: options.clubId,
      name: normalizedName,
      status: "PENDING",
      ...(options.excludeRequestId
        ? {
            NOT: {
              id: options.excludeRequestId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      clubId: true,
      phone: true,
      createdAt: true,
    },
  });

  return (
    candidates
      .filter(
        (request) =>
          normalizePhoneNumber(request.phone) === normalizedPhone
      )
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime()
      )[0] ?? null
  );
}
