"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState(
    "결제 승인 정보를 확인하고 있습니다."
  );

  useEffect(() => {
    async function confirmPayment() {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");

      if (!paymentKey || !orderId || !amount) {
        setMessage("결제 정보가 부족합니다.");
        return;
      }

      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "결제 승인에 실패했습니다.");
        router.push("/admin/dashboard");
        return;
      }

      setMessage("결제가 완료되었습니다. 대시보드로 이동합니다.");
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1200);
    }

    confirmPayment().catch((error: Error) => {
      alert(error.message);
      router.push("/admin/dashboard");
    });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
        <h1 className="mt-6 text-2xl font-black text-slate-900">
          결제 승인 중
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩 중...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
