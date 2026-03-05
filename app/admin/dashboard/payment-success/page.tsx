"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// 💡 실제 로직을 담당하는 컴포넌트
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");
      const clubId = searchParams.get("clubId");

      // 파라미터가 없으면 중단
      if (!paymentKey || !orderId || !amount || !clubId) return;

      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount, clubId }),
        });

        if (res.ok) {
          alert("결제가 성공했습니다! 30일간 서비스를 이용하실 수 있습니다.");
          router.push("/admin/dashboard");
        } else {
          const errorData = await res.json();
          alert(`결제 승인 실패: ${errorData.error || "알 수 없는 오류"}`);
          router.push("/admin/dashboard");
        }
      } catch (err) {
        console.error("결제 처리 에러:", err);
        alert("결제 처리 중 서버 통신 오류가 발생했습니다.");
        router.push("/admin/dashboard");
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-lg">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl font-bold text-gray-800">결제를 최종 승인 중입니다...</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려 주세요. 창을 닫지 마세요.</p>
          </>
        ) : (
          <p className="text-lg font-bold text-gray-800">처리가 완료되었습니다.</p>
        )}
      </div>
    </div>
  );
}

// 💡 Next.js에서 useSearchParams를 쓰려면 Suspense로 감싸는 것이 필수입니다.
export default function PaymentSuccess() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-lg font-medium text-gray-600">페이지를 불러오는 중입니다...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}