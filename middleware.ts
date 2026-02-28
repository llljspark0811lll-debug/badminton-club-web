// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. API 경로는 미들웨어에서 보호하지 않음 (각 route.ts 내부에서 처리)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 2. 인증 없이 접근 가능한 '화이트리스트' 경로 설정
  // 로그인(/admin/login)과 클럽생성(/admin/signup)은 토큰이 없어도 접근 가능해야 함
  if (pathname === "/admin/login" || pathname === "/admin/signup") {
    return NextResponse.next();
  }

  // 3. /admin으로 시작하는 나머지 모든 보호 경로 체크
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin_token")?.value;

    // 토큰이 없으면 로그인 페이지로 리다이렉트
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      // 토큰 유효성 검사
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      // 토큰이 변조되었거나 만료된 경우 로그인 페이지로 리다이렉트
      console.error("JWT 검증 실패:", error);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

// 매처 설정: /admin으로 시작하는 모든 경로에서 이 미들웨어를 실행함
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};