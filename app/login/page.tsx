"use client";

import { useState, useEffect } from "react";  // ← useEffect 추가
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");  // email → username 변경
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // ✅ 첫 접속시 이전 아이디 자동 입력 (아이디 잊어버림 방지)
  useEffect(() => {
    const savedUsername = localStorage.getItem("lastLoginUsername");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("아이디와 비밀번호를 입력하세요.");
      return;
    }

    try {
      setError("");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "로그인에 실패했습니다.");
        return;
      }

      const data = await res.json();

      // 테스트용: 브라우저에 관리자 정보 저장
      localStorage.setItem("adminUsername", data.username);
      localStorage.setItem("adminId", String(data.id));
      localStorage.setItem("lastLoginUsername", data.username);

      router.push("/main");
    } catch (e) {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-[400px] text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-600">
          🏸 전국 배드민턴 클럽 <br/>
          운영 관리 시스템
        </h1>

        <input
          type="text"  // email → text 변경 (test01 형식)
          placeholder="아이디 (예: test01)"
          className="w-full border p-2 rounded mb-3 text-gray-900 placeholder:text-gray-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
