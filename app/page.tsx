"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-[400px] text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          🏸 전국 배드민턴 클럽 <br/>
           운영 관리 시스템
        </h1>

        <p className="text-gray-600 mb-6">
          고생하는 우리 클럽 총무님을 위한 <br/>
          회비 관리 · 재정 · 출석 관리 시스템
        </p>

        <button
          onClick={() => router.push("/login")}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          START
        </button>
      </div>
    </main>
  );
}