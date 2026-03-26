"use client";

import { useMemo, useState } from "react";
import type {
  ClubSession,
  Member,
} from "@/components/dashboard/types";
import {
  findParticipant,
  formatDate,
  getParticipantStatusLabel,
  getRegisteredParticipants,
  getSessionStatusLabel,
  getWaitlistedParticipants,
} from "@/components/dashboard/utils";

type SessionsPanelProps = {
  sessions: ClubSession[];
  members: Member[];
  selectedSessionId: number | null;
  publicSessionBaseUrl: string;
  onSelectSession: (id: number) => void;
  onCreateSession: (payload: {
    title: string;
    description: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
    capacity: string;
  }) => Promise<void>;
  onToggleRegistration: (
    sessionId: number,
    memberId: number
  ) => Promise<void>;
  onUpdateSessionStatus: (
    sessionId: number,
    status: ClubSession["status"]
  ) => Promise<void>;
};

const initialForm = {
  title: "",
  description: "",
  location: "",
  date: "",
  startTime: "19:00",
  endTime: "21:00",
  capacity: "",
};

export function SessionsPanel({
  sessions,
  members,
  selectedSessionId,
  publicSessionBaseUrl,
  onSelectSession,
  onCreateSession,
  onToggleRegistration,
  onUpdateSessionStatus,
}: SessionsPanelProps) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

  const publicSessionLink = useMemo(() => {
    if (!selectedSession) {
      return "";
    }

    return `${publicSessionBaseUrl}/${selectedSession.publicToken}`;
  }, [publicSessionBaseUrl, selectedSession]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onCreateSession(form);
      setForm(initialForm);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "운동 일정을 생성하지 못했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!publicSessionLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicSessionLink);
      alert("운동 일정 링크를 복사했습니다.");
    } catch {
      alert("운동 일정 링크 복사에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            운동 일정 만들기
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            날짜, 시간, 장소, 정원을 입력하면 카톡 공유용 참석 링크까지
            바로 만들 수 있습니다.
          </p>

          <div className="mt-5 space-y-3">
            <input
              value={form.title}
              onChange={(event) =>
                setForm({
                  ...form,
                  title: event.target.value,
                })
              }
              placeholder="예: 목요일 정기운동"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
            <input
              value={form.location}
              onChange={(event) =>
                setForm({
                  ...form,
                  location: event.target.value,
                })
              }
              placeholder="장소"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
              <input
                type="number"
                value={form.capacity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    capacity: event.target.value,
                  })
                }
                placeholder="정원"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm({
                    ...form,
                    startTime: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm({
                    ...form,
                    endTime: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              placeholder="운영 메모"
              className="h-24 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "생성 중..." : "운동 일정 생성"}
          </button>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            일정 목록
          </h3>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => {
              const isSelected =
                selectedSession?.id === session.id;

              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-bold">
                      {session.title}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getSessionStatusLabel(session.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm opacity-80">
                    {formatDate(session.date)} {session.startTime} -{" "}
                    {session.endTime}
                  </div>
                  <div className="mt-2 text-sm opacity-80">
                    참석 {getRegisteredParticipants(session).length}명 / 대기{" "}
                    {getWaitlistedParticipants(session).length}명
                  </div>
                </button>
              );
            })}

            {sessions.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                아직 등록된 운동 일정이 없습니다.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        {selectedSession ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900">
                      {selectedSession.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {getSessionStatusLabel(selectedSession.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatDate(selectedSession.date)}{" "}
                    {selectedSession.startTime} - {selectedSession.endTime}
                    {selectedSession.location
                      ? ` | ${selectedSession.location}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedSession.description || "설명 없음"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onUpdateSessionStatus(
                        selectedSession.id,
                        "OPEN"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    모집 중
                  </button>
                  <button
                    onClick={() =>
                      onUpdateSessionStatus(
                        selectedSession.id,
                        "CLOSED"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                  >
                    마감
                  </button>
                  <button
                    onClick={() =>
                      onUpdateSessionStatus(
                        selectedSession.id,
                        "CANCELED"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    취소
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-sky-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-sky-700">
                      카카오톡 공유 링크
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      단톡방에 이 링크를 올리면 회원이 직접 참석 신청이나
                      참석 취소를 할 수 있습니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleCopyLink().catch(() => {
                        alert("운동 일정 링크 복사에 실패했습니다.");
                      });
                    }}
                    className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
                  >
                    링크 복사
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  {publicSessionLink}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  정원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {selectedSession.capacity ?? "제한 없음"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  참석 인원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {getRegisteredParticipants(selectedSession).length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  대기 인원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {getWaitlistedParticipants(selectedSession).length}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-[840px] w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4 font-semibold">회원</th>
                      <th className="px-4 py-4 font-semibold">급수</th>
                      <th className="px-4 py-4 font-semibold">연락처</th>
                      <th className="px-4 py-4 font-semibold">상태</th>
                      <th className="px-4 py-4 font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((member) => {
                      const participant = findParticipant(
                        selectedSession,
                        member.id
                      );
                      const activeStatus =
                        participant?.status &&
                        participant.status !== "CANCELED"
                          ? getParticipantStatusLabel(
                              participant.status
                            )
                          : "미등록";

                      return (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {member.name}
                          </td>
                          <td className="px-4 py-4 font-bold text-sky-600">
                            {member.level}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {member.phone || "-"}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {activeStatus}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() =>
                                onToggleRegistration(
                                  selectedSession.id,
                                  member.id
                                ).catch((error: Error) => {
                                  alert(error.message);
                                })
                              }
                              disabled={
                                selectedSession.status !== "OPEN"
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              {participant &&
                              participant.status !== "CANCELED"
                                ? "참석 취소"
                                : "참석 등록"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-[1.5rem] bg-slate-50 text-sm font-medium text-slate-400">
            먼저 운동 일정을 하나 선택해주세요.
          </div>
        )}
      </section>
    </div>
  );
}
