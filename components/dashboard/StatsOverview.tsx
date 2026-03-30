"use client";

import { useMemo, useState } from "react";
import type {
  DashboardStats,
  DashboardStatsPeriodKey,
} from "@/components/dashboard/types";

type StatsOverviewProps = {
  stats: DashboardStats | null;
  loading: boolean;
};

type StatCard = {
  label: string;
  value: number;
  hint: string;
};

function formatPeriodLabel(
  label: string,
  startDate: string | Date,
  endDate: string | Date
) {
  const start = new Date(startDate).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });

  return `${label} 기준 ${start} - ${end}`;
}

export function StatsOverview({
  stats,
  loading,
}: StatsOverviewProps) {
  const [period, setPeriod] =
    useState<DashboardStatsPeriodKey>("WEEK");

  const periodStats = useMemo(() => {
    if (!stats) {
      return null;
    }

    return period === "WEEK" ? stats.week : stats.month;
  }, [period, stats]);

  const statCards = useMemo<StatCard[]>(() => {
    if (!periodStats) {
      return [];
    }

    if (period === "WEEK") {
      return [
        {
          label: "운동 일정",
          value: periodStats.sessionCount,
          hint: "이번 주 등록된 일정 수",
        },
        {
          label: "참석 신청",
          value: periodStats.registeredCount,
          hint: "참석 확정 신청 수",
        },
        {
          label: "게스트",
          value: periodStats.guestCount,
          hint: "동반 게스트 신청 수",
        },
        {
          label: "대기 인원",
          value: periodStats.waitlistCount,
          hint: "정원 초과 대기 수",
        },
      ];
    }

    return [
      {
        label: "운동 일정",
        value: periodStats.sessionCount,
        hint: "이번 달 등록된 일정 수",
      },
      {
        label: "참석 신청",
        value: periodStats.registeredCount,
        hint: "이번 달 참석 신청 수",
      },
      {
        label: "신규 회원",
        value: periodStats.newMembersCount,
        hint: "이번 달 승인된 신규 회원",
      },
      {
        label: "미납 회원",
        value: periodStats.unpaidMembersCount,
        hint: "이번 달 월회비 미납 수",
      },
    ];
  }, [period, periodStats]);

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">
            2차 로드맵
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            주간/월간 운영 통계
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            카카오톡으로는 남기기 어려운 운영 흐름을 통계로
            정리해서, 총무가 이번 주와 이번 달 상태를 한 번에
            파악할 수 있게 합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriod("WEEK")}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              period === "WEEK"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            이번 주
          </button>
          <button
            onClick={() => setPeriod("MONTH")}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              period === "MONTH"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            이번 달
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-[1.5rem] bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
          운영 통계를 불러오는 중입니다.
        </div>
      ) : stats && periodStats ? (
        <div className="mt-5 space-y-5">
          <div className="text-xs font-medium text-slate-400">
            {formatPeriodLabel(
              period === "WEEK" ? "주간 통계" : "월간 통계",
              periodStats.startDate,
              periodStats.endDate
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <article
                key={card.label}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <p className="text-sm font-semibold text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {card.hint}
                </p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    운영 체크 포인트
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    총무가 바로 확인해야 할 핵심 신호입니다.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-sky-50 px-4 py-4">
                  <p className="text-sm font-semibold text-sky-700">
                    실제 출석 처리
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {stats.month.attendanceHandledCount}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    이번 달 출석/지각/결석까지 처리된 기록 수
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-700">
                    운영 혼잡도
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {stats.week.waitlistCount + stats.month.waitlistCount}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    최근 운영에서 발생한 대기 인원 누적 수
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-black text-slate-900">
                이번 달 활동 상위 회원
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                참석 신청이 많은 회원을 빠르게 확인합니다.
              </p>

              <div className="mt-4 space-y-3">
                {stats.topMembers.map((member, index) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {index + 1}. {member.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        지각 {member.lateCount}회 · 게스트 동반{" "}
                        {member.guestHostedCount}회
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-700 shadow-sm">
                      {member.attendanceCount}회
                    </div>
                  </div>
                ))}

                {stats.topMembers.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    이번 달 집계된 참석 기록이 아직 없습니다.
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
          운영 통계를 아직 불러오지 못했습니다.
        </div>
      )}
    </section>
  );
}
