import { PrismaClient } from "@prisma/client";

// 전역 변수 타입 정의
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 명시적으로 PrismaClient 타입을 할당
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"], // 쿼리 로그를 켜서 연결 확인
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// export default도 추가 (혹시 모를 에러 방지)
export default prisma;