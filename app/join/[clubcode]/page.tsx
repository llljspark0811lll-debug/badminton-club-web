"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

const LEVELS = ["S", "A", "B", "C", "D", "E", "초심"];

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();

  // 🔥 clubcode 안전 추출
  const clubcode =
    typeof params.clubcode === "string"
      ? params.clubcode
      : params.clubcode?.[0];

  const [form, setForm] = useState({
    name: "",
    gender: "",
    birth: "",
    phone: "",
    level: "",
    carnumber: "",
    note: "",
  });

  const handleSubmit = async () => {
    if (!clubcode) {
      alert("클럽 코드 오류");
      return;
    }

    if (!form.name.trim()) return alert("이름을 입력하세요.");
    if (!form.gender) return alert("성별을 선택하세요.");
    if (!form.birth) return alert("생년월일을 입력하세요.");
    if (!form.phone) return alert("전화번호를 입력하세요.");
    if (!form.level) return alert("급수를 선택하세요.");

    const res = await fetch("/api/member-request/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        clubcode,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "신청 실패");
      return;
    }

    alert("신청이 완료되었습니다 🎉");
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-[95%] max-w-[420px]">
        <h2 className="text-2xl font-bold mb-6 text-center">
          🏸 회원 가입 신청서
        </h2>

        <div className="space-y-4">
          <input
            placeholder="이름"
            className="w-full border p-3 rounded-lg"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <div className="flex gap-4">
            {["남", "여"].map((g) => (
              <button
                key={g}
                type="button"
                className={`flex-1 py-2 rounded-lg border ${
                  form.gender === g
                    ? "bg-blue-600 text-white"
                    : ""
                }`}
                onClick={() =>
                  setForm({ ...form, gender: g })
                }
              >
                {g}
              </button>
            ))}
          </div>

          <input
            type="date"
            className="w-full border p-3 rounded-lg"
            value={form.birth}
            onChange={(e) =>
              setForm({ ...form, birth: e.target.value })
            }
          />

          <input
            placeholder="전화번호"
            className="w-full border p-3 rounded-lg"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <select
            className="w-full border p-3 rounded-lg"
            value={form.level}
            onChange={(e) =>
              setForm({ ...form, level: e.target.value })
            }
          >
            <option value="">급수 선택</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>

          <input
            placeholder="차량번호"
            className="w-full border p-3 rounded-lg"
            value={form.carnumber}
            onChange={(e) =>
              setForm({ ...form, carnumber: e.target.value })
            }
          />

          <input
            placeholder="비고"
            className="w-full border p-3 rounded-lg"
            value={form.note}
            onChange={(e) =>
              setForm({ ...form, note: e.target.value })
            }
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl"
        >
          신청하기
        </button>
      </div>
    </main>
  );
}