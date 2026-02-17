"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }

    setError("");
    alert("로그인 성공 (임시)");
    router.push("/main"); // 나중에 메인으로 이동
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-[400px] text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-600">
          🏸 전국 배드민턴 클럽 <br/>
          운영 관리 시스템
        </h1>

        <input
          type="email"
          placeholder="이메일"
          className="w-full border p-2 rounded mb-3 text-gray-900 placeholder:text-gray-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="비밀번호"
          className="w-full border p-2 rounded mb-3 text-gray-900 placeholder:text-gray-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          로그인
        </button>
      </div>
    </main>
  );
}