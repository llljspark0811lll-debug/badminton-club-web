"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clubName: "",
    clubCode: "",
    username: "",
    password: "",
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/admin/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("클럽 생성 완료!");
    router.push("/admin/login");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-[420px]">
        <h1 className="text-2xl font-bold text-center mb-6">
          🏗 클럽 생성
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="클럽 이름"
            className="w-full border p-2 rounded-lg"
            onChange={(e) =>
              setForm({ ...form, clubName: e.target.value })
            }
          />
          <input
            placeholder="클럽 코드"
            className="w-full border p-2 rounded-lg"
            onChange={(e) =>
              setForm({ ...form, clubCode: e.target.value })
            }
          />
          <input
            placeholder="관리자 아이디"
            className="w-full border p-2 rounded-lg"
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full border p-2 rounded-lg"
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            클럽 생성
          </button>
        </form>
      </div>
    </main>
  );
}