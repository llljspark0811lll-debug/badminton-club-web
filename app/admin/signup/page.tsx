"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clubName: "",
    username: "",
    password: "",
  });

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const response = await fetch("/api/admin/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error ?? "클럽 생성에 실패했습니다.");
      return;
    }

    alert("클럽 생성이 완료되었습니다.");
    router.push("/admin/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
          새 클럽 만들기
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="클럽 이름"
            className="w-full rounded-lg border p-3"
            value={form.clubName}
            onChange={(event) =>
              setForm({
                ...form,
                clubName: event.target.value,
              })
            }
          />
          <input
            placeholder="관리자 아이디"
            className="w-full rounded-lg border p-3"
            value={form.username}
            onChange={(event) =>
              setForm({
                ...form,
                username: event.target.value,
              })
            }
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full rounded-lg border p-3"
            value={form.password}
            onChange={(event) =>
              setForm({
                ...form,
                password: event.target.value,
              })
            }
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            클럽 생성
          </button>
        </form>
      </div>
    </main>
  );
}
