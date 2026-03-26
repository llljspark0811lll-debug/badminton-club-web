"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type PublicSession = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: "OPEN" | "CLOSED" | "CANCELED";
  clubName: string;
  joinToken: string;
  registeredCount: number;
  waitlistCount: number;
  participantNames: string[];
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR");
}

export default function PublicSessionPage() {
  const params = useParams();
  const token =
    typeof params.token === "string"
      ? params.token
      : params.token?.[0];

  const [session, setSession] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  async function loadSession() {
    if (!token) {
      setError("잘못된 일정 링크입니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch(`/api/public/sessions/${token}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "운동 일정 정보를 불러오지 못했습니다.");
      setSession(null);
      setLoading(false);
      return;
    }

    setSession(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSession().catch(() => {
      setError("운동 일정 정보를 불러오지 못했습니다.");
      setLoading(false);
    });
  }, [token]);

  const joinLink = useMemo(() => {
    if (!session?.joinToken) {
      return null;
    }

    return `/join/${session.joinToken}`;
  }, [session?.joinToken]);

  async function handleRespond(action: "REGISTER" | "CANCEL") {
    if (!token) {
      return;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      setError("이름과 전화번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/public/sessions/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          action,
          name: form.name,
          phone: form.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "참석 응답을 처리하지 못했습니다.");
        return;
      }

      setMessage(
        data.status === "WAITLIST"
          ? "정원이 차서 대기자로 등록되었습니다."
          : data.status === "REGISTERED"
            ? "참석 신청이 완료되었습니다."
            : "참석 취소가 완료되었습니다."
      );

      await loadSession();
    } catch {
      setError("참석 응답을 처리하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-6 shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-500">
            운동 일정 정보를 불러오는 중입니다...
          </div>
        ) : null}

        {!loading && session ? (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
                {session.clubName}
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">
                {session.title}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                {formatDate(session.date)} {session.startTime} -{" "}
                {session.endTime}
                {session.location ? ` | ${session.location}` : ""}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {session.description || "설명 없음"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  정원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {session.capacity ?? "제한 없음"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  참석 인원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {session.registeredCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  대기 인원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {session.waitlistCount}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 p-5">
              <h2 className="text-xl font-black text-slate-900">
                참석 응답
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                승인된 회원 이름과 전화번호를 입력하면 참석 신청 또는
                참석 취소를 할 수 있습니다.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="이름"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="전화번호"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    handleRespond("REGISTER").catch(() => {
                      setError("참석 응답을 처리하지 못했습니다.");
                    });
                  }}
                  disabled={submitting || session.status !== "OPEN"}
                  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? "처리 중..." : "참석 신청"}
                </button>
                <button
                  onClick={() => {
                    handleRespond("CANCEL").catch(() => {
                      setError("참석 응답을 처리하지 못했습니다.");
                    });
                  }}
                  disabled={submitting}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  참석 취소
                </button>
              </div>

              {session.status !== "OPEN" ? (
                <p className="mt-3 text-sm font-semibold text-amber-600">
                  현재 이 일정은 참석 신청을 받고 있지 않습니다.
                </p>
              ) : null}

              {message ? (
                <p className="mt-3 text-sm font-semibold text-emerald-600">
                  {message}
                </p>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm font-semibold text-rose-600">
                  {error}
                </p>
              ) : null}
            </div>

            {joinLink ? (
              <div className="rounded-[1.5rem] bg-sky-50 p-5">
                <p className="text-sm font-semibold text-sky-700">
                  아직 회원 승인이 안 되셨나요?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  먼저 가입 신청서를 작성한 뒤 운영진에게 승인받아야
                  참석 링크를 사용할 수 있습니다.
                </p>
                <Link
                  href={joinLink}
                  className="mt-3 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-bold text-sky-700 shadow-sm"
                >
                  가입 신청서 열기
                </Link>
              </div>
            ) : null}

            {session.participantNames.length > 0 ? (
              <div className="rounded-[1.5rem] border border-slate-200 p-5">
                <h2 className="text-lg font-black text-slate-900">
                  현재 참석자
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.participantNames.map((name, index) => (
                    <span
                      key={`${name}-${index}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !session && error ? (
          <div className="py-20 text-center text-sm font-semibold text-rose-600">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
