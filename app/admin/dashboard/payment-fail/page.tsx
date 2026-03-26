"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">
          결제가 완료되지 않았습니다
        </h1>
        <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-left">
          <p className="text-xs font-bold uppercase text-rose-400">
            Error Code: {errorCode ?? "-"}
          </p>
          <p className="mt-2 text-sm leading-6 text-rose-700">
            {errorMessage ??
              "사용자가 결제를 취소했거나 결제 처리 중 오류가 발생했습니다."}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩 중...</div>}>
      <PaymentFailContent />
    </Suspense>
  );
}
