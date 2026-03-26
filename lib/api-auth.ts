import { getAuthAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAuthAdmin() {
  return await getAuthAdmin();
}

export function unauthorizedResponse(
  message: string = "인증이 필요합니다."
) {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

export function forbiddenResponse(
  message: string = "권한이 없습니다."
) {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

export function notFoundResponse(
  message: string = "대상을 찾을 수 없습니다."
) {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}
