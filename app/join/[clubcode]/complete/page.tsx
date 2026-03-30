export default function JoinCompletePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_45%,#ffffff_100%)] px-4 py-6 sm:p-6">
      <div className="w-full max-w-[440px] rounded-[2rem] border border-white/70 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-600">
          가입 신청 완료
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">
          신청이 완료되었습니다.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          운영진이 신청 내용을 확인한 뒤 승인해드릴 예정입니다.
          지금은 이 화면을 닫으셔도 됩니다.
        </p>
      </div>
    </main>
  );
}
