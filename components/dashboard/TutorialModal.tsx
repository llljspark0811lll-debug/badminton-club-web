"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardTab } from "@/components/dashboard/types";

export type TutorialStep =
  | "welcome"
  | "seeding"
  | "members"
  | "sessions"
  | "bracket"
  | "cleaning"
  | "done";

type TutorialModalProps = {
  open: boolean;
  onClose: () => void;
  onSwitchTab: (tab: DashboardTab) => void;
  onSelectSession: (sessionId: number) => void;
};

type StepMeta = {
  title: string;
  description: string;
  targetId?: string;
};

function useSpotlight(open: boolean, targetId?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !targetId) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let retries = 0;

    const update = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tutorial-id="${targetId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setRect(el.getBoundingClientRect());
        return;
      }
      setRect(null);
      if (retries < 15) {
        retries++;
        retryRef.current = window.setTimeout(update, 150);
      }
    };

    window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelled = true;
      if (retryRef.current) window.clearTimeout(retryRef.current);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, targetId]);

  return rect;
}

export function TutorialModal({ open, onClose, onSwitchTab, onSelectSession }: TutorialModalProps) {
  const [step, setStep] = useState<TutorialStep>("welcome");
  const [sampleSessionId, setSampleSessionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const stepMeta = useMemo<StepMeta>(() => {
    switch (step) {
      case "welcome":
        return {
          title: "콕매니저 체험 모드",
          description: "샘플 데이터로 콕매니저의 전체 흐름을 직접 체험해볼 수 있어요.\n회원 10명 + 운동 일정 + 자동 대진표까지 바로 만들어드립니다.\n\n언제든 건너뛰면 샘플 데이터는 자동으로 삭제됩니다.",
        };
      case "seeding":
        return {
          title: "샘플 데이터 생성 중...",
          description: "회원 10명과 운동 일정, 자동 대진표를 만들고 있어요.\n잠깐만 기다려주세요!",
        };
      case "members":
        return {
          title: "① 회원 관리",
          description: "샘플 회원 10명이 등록됐어요.\n이름·성별·급수가 자동으로 정리된 걸 확인해보세요.\n\n실제 운영 시에는 가입 링크를 공유하면 회원이 직접 등록합니다.",
          targetId: "tab-members",
        };
      case "sessions":
        return {
          title: "② 운동 일정 & 참석",
          description: "샘플 운동 일정이 생성됐어요.\n참석 회원 10명이 자동 등록된 마감 일정입니다.\n\n일정 카드를 클릭하면 참석자 명단과 대진표를 볼 수 있어요.",
          targetId: "tab-sessions",
        };
      case "bracket":
        return {
          title: "③ 자동 대진표",
          description: "급수·성별 균형을 맞춰 대진표가 이미 생성되어 있어요!\n\n아래 일정 카드를 클릭하고 대진표 탭에서 확인해보세요.\n이미지로 저장해서 단톡방에 바로 공유할 수 있습니다.",
          targetId: "sample-session-card",
        };
      case "cleaning":
        return {
          title: "샘플 데이터 삭제 중...",
          description: "체험에 사용된 샘플 데이터를 정리하고 있어요.",
        };
      case "done":
        return {
          title: "체험 완료!",
          description: "이제 실제 클럽 운영을 시작해보세요.\n\n가입 링크를 공유해서 회원을 모으거나\n직접 회원을 등록하고 운동 일정을 만들어보세요 🏸\n\n언제든 사용자 가이드 버튼으로 다시 체험할 수 있어요.",
        };
    }
  }, [step]);

  const targetRect = useSpotlight(
    open && !["welcome", "seeding", "cleaning", "done"].includes(step),
    stepMeta.targetId
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // 탭 자동 전환
  useEffect(() => {
    if (!open) return;
    if (step === "members") onSwitchTab("members");
    if (step === "sessions" || step === "bracket") onSwitchTab("sessions");
  }, [open, step, onSwitchTab]);

  async function handleStart() {
    setStep("seeding");
    setErrorMsg("");
    try {
      const res = await fetch("/api/tutorial/seed", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "샘플 생성 실패");
      setSampleSessionId(data.sessionId);
      setStep("members");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setStep("welcome");
    }
  }

  async function handleCleanup() {
    setStep("cleaning");
    try {
      await fetch("/api/tutorial/cleanup", { method: "POST", credentials: "include" });
    } catch {
      // 실패해도 계속 진행
    }
    setStep("done");
  }

  async function handleSkip() {
    await handleCleanup();
  }

  function handleClose() {
    setStep("welcome");
    setSampleSessionId(null);
    setErrorMsg("");
    onClose();
  }

  function handleSessionClick() {
    if (sampleSessionId) onSelectSession(sampleSessionId);
  }

  if (!open) return null;

  const isLoading = step === "seeding" || step === "cleaning";
  const isDone = step === "done";
  const isWelcome = step === "welcome";

  const spotlightPad = 10;
  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - spotlightPad,
        left: targetRect.left - spotlightPad,
        width: targetRect.width + spotlightPad * 2,
        height: targetRect.height + spotlightPad * 2,
      }
    : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {/* 딤 */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/60" />

      {/* 스포트라이트 */}
      {spotlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-sky-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.6)]"
          style={spotlightStyle}
        />
      ) : null}

      {/* 카드 */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[91] w-[min(92vw,26rem)] -translate-x-1/2 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:bottom-auto sm:left-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0">

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            {!isDone && !isWelcome && !isLoading && (
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600">
                사용자 가이드
              </p>
            )}
            <h2 className="mt-1 text-xl font-black text-slate-900">
              {stepMeta.title}
            </h2>
          </div>
          {!isLoading && !isDone && (
            <button
              onClick={handleSkip}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              건너뛰기
            </button>
          )}
        </div>

        {/* 설명 */}
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
          {stepMeta.description}
        </p>

        {/* 로딩 스피너 */}
        {isLoading && (
          <div className="mt-4 flex justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          </div>
        )}

        {/* 에러 */}
        {errorMsg && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {errorMsg}
          </p>
        )}

        {/* 액션 버튼 */}
        {!isLoading && (
          <div className="mt-5 flex items-center justify-between gap-3">
            {isWelcome && (
              <>
                <button
                  onClick={handleClose}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  닫기
                </button>
                <button
                  onClick={handleStart}
                  className="rounded-2xl bg-sky-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  체험 시작하기 🏸
                </button>
              </>
            )}

            {step === "members" && (
              <>
                <button onClick={handleSkip} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50">건너뛰기</button>
                <button onClick={() => setStep("sessions")} className="rounded-2xl bg-sky-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-sky-700">다음 →</button>
              </>
            )}

            {step === "sessions" && (
              <>
                <button onClick={() => setStep("members")} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50">← 이전</button>
                <button onClick={() => setStep("bracket")} className="rounded-2xl bg-sky-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-sky-700">다음 →</button>
              </>
            )}

            {step === "bracket" && (
              <>
                <button onClick={() => setStep("sessions")} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50">← 이전</button>
                <button
                  onClick={() => { handleSessionClick(); handleCleanup(); }}
                  className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  일정 열기 & 완료
                </button>
              </>
            )}

            {isDone && (
              <button
                onClick={handleClose}
                className="ml-auto rounded-2xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                시작하기 🏸
              </button>
            )}
          </div>
        )}

        {/* 단계 점 */}
        {!isWelcome && !isLoading && !isDone && (
          <div className="mt-5 flex justify-center gap-1.5">
            {(["members", "sessions", "bracket"] as TutorialStep[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${step === s ? "w-5 bg-sky-500" : "w-1.5 bg-slate-200"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
