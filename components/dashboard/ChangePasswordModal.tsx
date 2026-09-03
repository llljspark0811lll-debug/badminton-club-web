"use client";

import { useEffect, useState } from "react";
import {
  isValidPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/password-policy";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ChangePasswordModal({
  open,
  onClose,
  onChanged,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("모든 비밀번호 항목을 입력해 주세요.");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "비밀번호를 변경하지 못했습니다.");
        return;
      }
      alert("비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.");
      onChanged();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-slate-900">비밀번호 변경</h2>
        <p className="mt-2 text-sm text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>

        <div className="mt-6 space-y-4">
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="현재 비밀번호" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="새 비밀번호 확인" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" />
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600">취소</button>
          <button type="submit" disabled={submitting} className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white disabled:bg-slate-300">{submitting ? "변경 중..." : "비밀번호 변경"}</button>
        </div>
      </form>
    </div>
  );
}
