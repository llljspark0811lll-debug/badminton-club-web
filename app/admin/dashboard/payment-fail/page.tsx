"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h2>
        
        <div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-red-400 font-bold uppercase mb-1">Error Code: {errorCode}</p>
          <p className="text-sm text-red-700 font-medium leading-relaxed">
            {errorMessage || "사용자가 결제를 취소했거나 알 수 없는 오류가 발생했습니다."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-95"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <FailContent />
    </Suspense>
  );
}