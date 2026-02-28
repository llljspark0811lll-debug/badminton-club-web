"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    router.push("/admin/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-[420px]">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          🔐 관리자 로그인
        </h1>

        <p className="text-center text-gray-500 mb-6 text-sm">
          클럽 관리자 전용 로그인 페이지입니다.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="아이디"
            className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="비밀번호"
            className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p
          className="text-sm text-center mt-6 text-gray-500 cursor-pointer hover:underline"
          onClick={() => router.push("/admin/signup")}
        >
          클럽이 없나요? 생성하기
        </p>
      </div>
    </main>
  );
}