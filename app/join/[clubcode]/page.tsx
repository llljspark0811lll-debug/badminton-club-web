"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LEVELS, GENDERS } from "@/lib/dashboard-constants";

type JoinConfig = {
  name: string;
  customFieldLabel: string;
  publicJoinToken: string;
};

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();

  const accessKey =
    typeof params.clubcode === "string"
      ? params.clubcode
      : params.clubcode?.[0];

  const [clubConfig, setClubConfig] = useState<JoinConfig>({
    name: "클럽",
    customFieldLabel: "차량번호",
    publicJoinToken: "",
  });
  const [form, setForm] = useState({
    name: "",
    gender: "",
    birth: "",
    phone: "",
    level: "",
    customFieldValue: "",
    note: "",
  });

  useEffect(() => {
    if (!accessKey) return;

    fetch(`/api/public/clubs/${accessKey}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.name) {
          setClubConfig({
            name: data.name,
            customFieldLabel: data.customFieldLabel ?? "차량번호",
            publicJoinToken: data.publicJoinToken ?? accessKey,
          });
        }
      })
      .catch(() => {
        setClubConfig({
          name: "클럽",
          customFieldLabel: "차량번호",
          publicJoinToken: accessKey ?? "",
        });
      });
  }, [accessKey]);

  const handleSubmit = async () => {
    if (!clubConfig.publicJoinToken) {
      alert("클럽 링크 정보가 올바르지 않습니다.");
      return;
    }

    if (!form.name.trim()) return alert("이름을 입력해주세요.");
    if (!form.gender) return alert("성별을 선택해주세요.");
    if (!form.birth) return alert("생년월일을 입력해주세요.");
    if (!form.phone.trim()) return alert("전화번호를 입력해주세요.");
    if (!form.level) return alert("급수를 선택해주세요.");

    const res = await fetch("/api/member-request/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        joinToken: clubConfig.publicJoinToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "가입 신청에 실패했습니다.");
      return;
    }

    alert("가입 신청이 완료되었습니다.");
    router.push("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-6 sm:p-6">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <h2 className="mb-2 text-center text-2xl font-bold">
          {clubConfig.name} 가입 신청
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          회원 정보를 입력하면 운영진이 확인 후 승인합니다.
        </p>

        <div className="space-y-4">
          <input
            placeholder="이름"
            className="w-full rounded-lg border p-3"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            {GENDERS.map((gender) => (
              <button
                key={gender}
                type="button"
                className={`rounded-lg border py-3 text-sm font-semibold ${
                  form.gender === gender
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600"
                }`}
                onClick={() => setForm({ ...form, gender })}
              >
                {gender}
              </button>
            ))}
          </div>

          <input
            type="date"
            className="w-full rounded-lg border p-3"
            value={form.birth}
            onChange={(event) =>
              setForm({ ...form, birth: event.target.value })
            }
          />

          <input
            placeholder="전화번호"
            className="w-full rounded-lg border p-3"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />

          <select
            className="w-full rounded-lg border p-3"
            value={form.level}
            onChange={(event) =>
              setForm({ ...form, level: event.target.value })
            }
          >
            <option value="">급수 선택</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <input
            placeholder={clubConfig.customFieldLabel}
            className="w-full rounded-lg border p-3"
            value={form.customFieldValue}
            onChange={(event) =>
              setForm({
                ...form,
                customFieldValue: event.target.value,
              })
            }
          />

          <input
            placeholder="비고"
            className="w-full rounded-lg border p-3"
            value={form.note}
            onChange={(event) =>
              setForm({ ...form, note: event.target.value })
            }
          />
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
        >
          가입 신청하기
        </button>
      </div>
    </main>
  );
}
