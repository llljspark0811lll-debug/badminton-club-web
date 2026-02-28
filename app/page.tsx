"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-[420px] text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          🏸 전국 배드민턴 클럽 <br />
          운영 관리 시스템
        </h1>

        <p className="text-gray-600 mb-8">
          클럽 생성 후 관리자 로그인으로 운영을 시작하세요.
        </p>

        <button
          onClick={() => router.push("/admin/login")}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-3"
        >
          관리자 로그인
        </button>

        <button
          onClick={() => router.push("/admin/signup")}
          className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
        >
          클럽 생성하기
        </button>
      </div>
    </main>
  );
}