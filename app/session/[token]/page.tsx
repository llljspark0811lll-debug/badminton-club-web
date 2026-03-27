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

type IdentifiedMember = {
  id: number;
  name: string;
  currentStatus: "REGISTERED" | "WAITLIST" | "CANCELED" | "NONE";
  rememberToken: string;
  guestNames: string[];
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR");
}

function getStatusLabel(status: IdentifiedMember["currentStatus"]) {
  if (status === "REGISTERED") return "현재 참석 신청 상태";
  if (status === "WAITLIST") return "현재 대기 신청 상태";
  if (status === "CANCELED") return "현재 참석 취소 상태";
  return "아직 참석 신청 전";
}

const PHONE_LAST4_PLACEHOLDER = "전화번호 뒤 4자리";
const MAX_GUEST_COUNT = 5;

export default function PublicSessionPage() {
  const params = useParams();
  const token =
    typeof params.token === "string"
      ? params.token
      : params.token?.[0];

  const [session, setSession] = useState<PublicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [identifiedMember, setIdentifiedMember] =
    useState<IdentifiedMember | null>(null);
  const [identityForm, setIdentityForm] = useState({
    name: "",
    phoneLast4: "",
  });
  const [guestNames, setGuestNames] = useState<string[]>([]);

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
      setError(
        data.error ?? "운동 일정 정보를 불러오지 못했습니다."
      );
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

  const rememberStorageKey = useMemo(() => {
    if (!session?.joinToken) {
      return null;
    }

    return `public-session-member:${session.joinToken}`;
  }, [session?.joinToken]);

  useEffect(() => {
    async function tryAutoIdentify() {
      if (!token || !rememberStorageKey) {
        return;
      }

      const rememberToken =
        window.localStorage.getItem(rememberStorageKey) ?? "";

      if (!rememberToken) {
        return;
      }

      setIdentityLoading(true);

      try {
        const response = await fetch(
          "/api/public/sessions/identify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
              rememberToken,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          window.localStorage.removeItem(rememberStorageKey);
          setIdentifiedMember(null);
          return;
        }

        setIdentifiedMember({
          ...data.member,
          rememberToken: data.rememberToken,
        });
        setGuestNames(data.member.guestNames ?? []);
        setMessage(
          `${data.member.name}님으로 자동 인식되었습니다.`
        );
      } catch {
        window.localStorage.removeItem(rememberStorageKey);
        setIdentifiedMember(null);
      } finally {
        setIdentityLoading(false);
      }
    }

    tryAutoIdentify().catch(() => {
      setIdentityLoading(false);
    });
  }, [rememberStorageKey, token]);

  async function handleIdentify() {
    if (!token) {
      return;
    }

    if (
      !identityForm.name.trim() ||
      identityForm.phoneLast4.replace(/\D/g, "").length !== 4
    ) {
      setError("이름과 전화번호 뒤 4자리를 입력해주세요.");
      return;
    }

    setIdentityLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/public/sessions/identify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            name: identityForm.name,
            phoneLast4: identityForm.phoneLast4,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ?? "회원 정보를 확인하지 못했습니다."
        );
        return;
      }

      if (rememberStorageKey) {
        window.localStorage.setItem(
          rememberStorageKey,
          data.rememberToken
        );
      }

      setIdentifiedMember({
        ...data.member,
        rememberToken: data.rememberToken,
      });
      setGuestNames(data.member.guestNames ?? []);
      setMessage(
        `${data.member.name}님 확인이 완료되었습니다. 다음부터는 이 기기에서 자동으로 인식됩니다.`
      );
    } catch {
      setError("회원 확인 처리 중 오류가 발생했습니다.");
    } finally {
      setIdentityLoading(false);
    }
  }

  function clearRememberedMember() {
    if (rememberStorageKey) {
      window.localStorage.removeItem(rememberStorageKey);
    }

    setIdentifiedMember(null);
    setGuestNames([]);
    setMessage("");
    setIdentityForm({
      name: "",
      phoneLast4: "",
    });
  }

  function updateGuestName(index: number, value: string) {
    setGuestNames((current) =>
      current.map((guestName, currentIndex) =>
        currentIndex === index ? value : guestName
      )
    );
  }

  function addGuestField() {
    setGuestNames((current) => {
      if (current.length >= MAX_GUEST_COUNT) {
        return current;
      }

      return [...current, ""];
    });
  }

  function removeGuestField(index: number) {
    setGuestNames((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function handleRespond(action: "REGISTER" | "CANCEL") {
    if (!token || !identifiedMember) {
      setError("먼저 회원 확인을 진행해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    const nextGuestNames = guestNames
      .map((guestName) => guestName.trim())
      .filter(Boolean)
      .slice(0, MAX_GUEST_COUNT);

    try {
      const response = await fetch("/api/public/sessions/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          action,
          rememberToken: identifiedMember.rememberToken,
          guestNames: nextGuestNames,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ?? "참석 응답을 처리하지 못했습니다."
        );

        if (response.status === 401) {
          clearRememberedMember();
        }
        return;
      }

      const nextStatus =
        data.status === "REGISTERED"
          ? "REGISTERED"
          : data.status === "WAITLIST"
            ? "WAITLIST"
            : "CANCELED";

      setIdentifiedMember((current) =>
        current
          ? {
              ...current,
              currentStatus: nextStatus,
              guestNames: nextGuestNames,
            }
          : current
      );
      setGuestNames(nextGuestNames);

      if (data.status === "WAITLIST") {
        setMessage(
          nextGuestNames.length > 0
            ? `대기 신청으로 등록되었습니다. 게스트 ${data.waitlistGuestCount ?? 0}명도 함께 처리되었어요.`
            : "정원이 가득 차서 대기 신청으로 등록되었습니다."
        );
      } else if (data.status === "REGISTERED") {
        setMessage(
          nextGuestNames.length > 0
            ? `참석 신청이 완료되었습니다. 게스트 ${nextGuestNames.length}명도 함께 저장되었어요.`
            : "참석 신청이 완료되었습니다."
        );
      } else {
        setMessage("참석 취소가 완료되었습니다.");
      }

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

              {!identifiedMember ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">
                    처음 한 번만 이름과 전화번호 뒤 4자리를 입력하면,
                    다음부터는 이 기기에서 자동으로 인식됩니다.
                  </p>

                  <div className="mt-4 space-y-3">
                    <input
                      value={identityForm.name}
                      onChange={(event) =>
                        setIdentityForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="이름"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    />
                    <input
                      value={identityForm.phoneLast4}
                      onChange={(event) =>
                        setIdentityForm((current) => ({
                          ...current,
                          phoneLast4: event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4),
                        }))
                      }
                      placeholder={PHONE_LAST4_PLACEHOLDER}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    />
                  </div>

                  <button
                    onClick={() => {
                      handleIdentify().catch(() => {
                        setError(
                          "회원 확인 처리 중 오류가 발생했습니다."
                        );
                      });
                    }}
                    disabled={identityLoading}
                    className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {identityLoading
                      ? "확인 중..."
                      : "회원 정보 확인하기"}
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-3 rounded-2xl bg-sky-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-sky-700">
                          {identifiedMember.name}님으로 자동 인식됨
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {getStatusLabel(
                            identifiedMember.currentStatus
                          )}
                        </p>
                      </div>
                      <button
                        onClick={clearRememberedMember}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        다른 회원으로 확인
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          함께 오는 게스트
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          게스트는 최대 5명까지 등록할 수 있어요.
                        </p>
                      </div>
                      <button
                        onClick={addGuestField}
                        disabled={guestNames.length >= MAX_GUEST_COUNT}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        게스트 추가
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {guestNames.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          등록된 게스트가 없습니다.
                        </p>
                      ) : null}

                      {guestNames.map((guestName, index) => (
                        <div
                          key={`guest-${index}`}
                          className="flex gap-2"
                        >
                          <input
                            value={guestName}
                            onChange={(event) =>
                              updateGuestName(
                                index,
                                event.target.value
                              )
                            }
                            placeholder={`게스트 ${index + 1} 이름`}
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                          />
                          <button
                            onClick={() => removeGuestField(index)}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => {
                        handleRespond("REGISTER").catch(() => {
                          setError(
                            "참석 응답을 처리하지 못했습니다."
                          );
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
                          setError(
                            "참석 응답을 처리하지 못했습니다."
                          );
                        });
                      }}
                      disabled={submitting}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      참석 취소
                    </button>
                  </div>
                </>
              )}

              {identityLoading && !identifiedMember ? (
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  회원 정보를 확인하는 중입니다.
                </p>
              ) : null}

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
                  아직 회원 확인이 안 되셨나요?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  먼저 가입 신청서를 작성하고 운영진에게 승인받아야
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
