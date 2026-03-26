type SubscriptionOverlayProps = {
  visible: boolean;
  paymentLoading: boolean;
  paymentMode: "test" | "live";
  amount: number;
  onPay: () => void;
};

export function SubscriptionOverlay({
  visible,
  paymentLoading,
  paymentMode,
  amount,
  onPay,
}: SubscriptionOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
        <div className="text-5xl">🏸</div>
        <h2 className="mt-4 text-3xl font-black text-slate-900">
          체험 기간이 끝났습니다
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          서비스를 계속 사용하려면 구독 결제가 필요합니다.
          지금 결제하면 30일 동안 계속 이용할 수 있습니다.
        </p>

        <button
          onClick={onPay}
          disabled={paymentLoading}
          className="mt-8 w-full rounded-2xl bg-sky-600 px-4 py-4 text-lg font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {paymentLoading
            ? "결제창 준비 중..."
            : `${amount.toLocaleString()}원 결제하기`}
        </button>

        <p className="mt-4 text-xs font-medium text-slate-400">
          현재 결제 모드: {paymentMode === "live" ? "실결제" : "테스트"}
        </p>
      </div>
    </div>
  );
}
