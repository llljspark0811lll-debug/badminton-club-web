"use client";

import { useEffect, useState, useRef } from "react";
import { nanoid } from "nanoid";

// 💡 전역 Window 타입 선언
declare global {
  interface Window {
    TossPayments: any;
  }
}

const LEVELS = ["S", "A", "B", "C", "D", "E", "초심"];

interface Fee {
  id: number;
  year: number;
  month: number;
  paid: boolean;
}

interface Member {
  id: number;
  name: string;
  gender: string;
  birth: string | Date;
  phone: string;
  level: string;
  createdAt: string | Date;
  deletedAt?: string | Date;
  note: string;
  carnumber: string;
  deleted?: boolean;
  fees: Fee[];
}

interface Request {
  id: number;
  name: string;
  gender: string;
  birth: string | Date;
  phone: string;
  level: string;
  carnumber: string;
  note: string;
  createdAt: string | Date;
}

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "requests" | "fees" | "deleted">("members");
  const [clubName, setClubName] = useState("로딩 중...");
  const [clubId, setClubId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState<"name" | "date" | "level" | "gender">("name");

  // ✅ 결제 관련 상태
  const [isExpired, setIsExpired] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState({
    name: "", gender: "", birth: "", phone: "", level: "", carnumber: "", note: "",
  });

  const fetchClubName = async () => {
    try {
      const res = await fetch("/api/club-info", { cache: 'no-store', credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          setClubName(`[${data.name}]`);
          setClubId(data.id);
          if (data.calculatedStatus === "EXPIRED") setIsExpired(true);
        }
      }
    } catch (err) { setClubName("[클럽]"); }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data);
    } catch (err) { console.error("멤버 로딩 실패:", err); }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/member-request", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } catch (err) { console.error("신청 목록 로딩 실패:", err); }
  };

  useEffect(() => {
    fetchClubName();
    fetchMembers();
    fetchRequests();

    // 💡 Toss SDK v2 로드
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.onload = () => setSdkReady(true);
    document.head.appendChild(script);
  }, []);

  // ✅ 결제 실행 (v2 표준 방식)
  const handlePayment = async () => {
    if (!window.TossPayments || !clubId) {
      alert("결제 모듈을 준비 중입니다.");
      return;
    }

    try {
      // 1. 토스페이먼츠 초기화 (이미 발급받으신 클라이언트 키를 넣으세요)
      const clientKey = "test_ck_GePWvyJnrKvjpBgyP95OVgLzN97E"; 
      const tossPayments = window.TossPayments(clientKey);

      // 2. 결제 위젯이 아닌 '결제창' 인스턴스 생성
      const payment = tossPayments.payment({
        customerKey: nanoid(),
      });

      // 3. 결제 요청 (UI 선택 없이 바로 결제창 띄우기)
      await payment.requestPayment({
        method: "CARD", // 기본 결제 수단 (카드, 계좌이체 등)
        amount: {
          currency: "KRW",
          value: 9900,
        },
        orderId: nanoid(),
        orderName: `${clubName} 정기 이용권`,
        successUrl: `${window.location.origin}/admin/dashboard/payment-success?clubId=${clubId}`,
        failUrl: `${window.location.origin}/admin/dashboard/payment-fail`,
        customerEmail: "customer@example.com", // 선택 사항
        customerName: "클럽 관리자", // 선택 사항
      });

    } catch (err: any) {
      console.log("결제 처리 중 발생:", err);

      // 1. 사용자가 취소한 경우: 아무 창도 띄우지 않고 그냥 함수 종료
      if (err.code === "USER_CANCEL") {
        console.log("사용자가 결제창을 닫았습니다.");
        // 실패 페이지로 이동하지 않고, 그냥 대시보드에 머뭅니다.
        return;
      }

      // 2. 그 외 진짜 에러(네트워크 단절, 카드 거절 등)인 경우에만 알림
      alert(err.message || "결제 요청 중 오류가 발생했습니다.");
    }
  };

  // --- 기존 로직들 (정렬, 수정, 삭제 등) ---
  const sortMembers = (memberList: Member[]) => {
    return [...memberList].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ko");
      if (sortBy === "date") return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();
      if (sortBy === "gender") return (a.gender === "남" ? 1 : 2) - (b.gender === "남" ? 1 : 2);
      if (sortBy === "level") return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level);
      return 0;
    });
  };

  const activeMembers = sortMembers(members.filter((m) => !m.deleted));
  const deletedMembers = members.filter((m) => m.deleted);

  const handleSubmit = async () => {
    if (!form.name || !form.gender || !form.level) {
      alert("이름, 성별, 급수는 필수 입력 사항입니다.");
      return;
    }
    const url = "/api/members";
    const method = editingMember ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMember ? { ...form, id: editingMember.id } : form),
        credentials: "include",
      });
      if (res.ok) {
        alert(editingMember ? "수정되었습니다." : "등록되었습니다.");
        setShowModal(false);
        setEditingMember(null);
        setForm({ name: "", gender: "", birth: "", phone: "", level: "", carnumber: "", note: "" });
        fetchMembers();
      }
    } catch (error) { alert("오류 발생"); }
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    const birthDate = m.birth ? new Date(m.birth as string) : null;
    setForm({
      name: m.name,
      gender: m.gender,
      birth: birthDate && !isNaN(birthDate.getTime()) ? birthDate.toISOString().split("T")[0] : "",
      phone: m.phone,
      level: m.level,
      carnumber: m.carnumber || "",
      note: m.note || "",
    });
    setShowModal(true);
  };

// 1. 탈퇴 회원으로 이동 (Soft Delete)
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? 탈퇴 회원 탭으로 이동합니다.")) return;
    
    try {
      const res = await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });

      if (res.ok) {
        // ✅ 중요: 삭제 성공 후 목록을 다시 불러와야 화면에서 사라집니다!
        await fetchMembers(); 
        alert("탈퇴 회원 탭으로 이동되었습니다.");
      } else {
        alert("삭제 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("삭제 에러:", error);
      alert("오류가 발생했습니다.");
    }
  };

  // 2. 탈퇴 회원 복구 (Restore)
  const handleRestore = async (id: number) => {
    if (!confirm("해당 회원을 복구하시겠습니까?")) return;
    
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });

      if (res.ok) {
        // ✅ 중요: 복구 성공 후 목록 갱신
        await fetchMembers();
        alert("회원이 복구되었습니다.");
      }
    } catch (error) {
      console.error("복구 에러:", error);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm("영구 삭제 시 모든 회비 기록이 삭제되며 복구가 불가능합니다. 계속하시겠습니까?")) return;
    const res = await fetch("/api/members/permanent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) fetchMembers();
  };

  const toggleFee = async (memberId: number, year: number, month: number, currentPaid: boolean) => {
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, year, month, paid: !currentPaid }),
        credentials: "include",
      });
      if (res.ok) fetchMembers();
    } catch (error) { console.error(error); }
  };

  const handleAllPaid = async (memberId: number) => {
    if (!confirm(`${selectedYear}년 전체를 완납 처리하시겠습니까?`)) return;
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        return fetch("/api/fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, year: selectedYear, month: i + 1, paid: true }),
          credentials: "include",
        });
      });
      await Promise.all(promises);
      fetchMembers();
      alert("전체 완납 처리되었습니다.");
    } catch (error) { console.error(error); }
  };

  const handleAllUnpaid = async (memberId: number) => {
    if (!confirm(`${selectedYear}년 전체 납부 기록을 삭제/해제하시겠습니까?`)) return;
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        return fetch("/api/fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, year: selectedYear, month: i + 1, paid: false }),
          credentials: "include",
        });
      });
      await Promise.all(promises);
      fetchMembers();
      alert("전체 해제 처리되었습니다.");
    } catch (error) { console.error(error); }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("승인하시겠습니까?")) return;
    const res = await fetch("/api/member-request/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) { fetchRequests(); fetchMembers(); setActiveTab("members"); }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6 font-sans relative">
      
      {/* 🛑 만료 시 결제 유도 레이어 */}
      {isExpired && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">체험 기간 종료</h2>
            <p className="text-gray-600 mb-8 font-medium">서비스를 계속 이용하시려면<br/>정기 이용권 결제가 필요합니다.</p>
            
            <button 
              onClick={handlePayment} 
              className="w-full py-4 rounded-xl font-black text-lg bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95"
            >
              9,900원 결제하기
            </button>
            <p className="mt-4 text-[11px] text-gray-400">토스페이먼츠의 보안 결제 시스템을 사용합니다.</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">🏸 {clubName} 회원관리</h1>
          <button onClick={() => { setEditingMember(null); setForm({ name: "", gender: "", birth: "", phone: "", level: "", carnumber: "", note: "" }); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">+ 직접 등록</button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b pb-4 overflow-x-auto whitespace-nowrap">
          {[{ id: "members", label: "회원 목록" }, { id: "requests", label: "가입 신청" }, { id: "fees", label: "회비 관리" }, { id: "deleted", label: "탈퇴 회원" }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2 rounded-full text-sm font-semibold transition ${activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}>{tab.label}{tab.id === "requests" && requests.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>}</button>
          ))}
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
          <table className="min-w-[1100px] w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="p-4 sticky left-0 bg-gray-50 z-10 border-r w-32">이름</th>
                {activeTab !== "fees" ? (
                  <>
                    <th className="p-4 text-center">성별</th>
                    <th className="p-4">생년월일</th>
                    {activeTab === "deleted" && <th className="p-4 text-red-500 font-bold">탈퇴일</th>}
                    <th className="p-4">연락처</th>
                    <th className="p-4 text-center">급수</th>
                    <th className="p-4">차량번호</th>
                    <th className="p-4">비고</th>
                    <th className="p-4 text-center">관리</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 text-center border-r">급수</th>
                    {Array.from({ length: 12 }, (_, i) => <th key={i} className="p-2 text-center text-[11px] font-bold border-r">{i + 1}월</th>)}
                    <th className="p-4 text-center">일괄 작업</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* 회원 목록 & 탈퇴 회원 & 회비 로직은 생략 없이 유지됨 (내부 맵핑 동일) */}
              {activeTab === "members" && activeMembers.map((m) => (
                <tr key={m.id} className="hover:bg-blue-50/30 transition">
                  <td className="p-4 font-bold text-gray-800 sticky left-0 bg-white z-10 border-r">{m.name}</td>
                  <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.gender === "남" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>{m.gender}</span></td>
                  <td className="p-4 text-gray-500">{new Date(m.birth as string).toLocaleDateString("ko-KR")}</td>
                  <td className="p-4 font-mono">{m.phone}</td>
                  <td className="p-4 text-center font-bold text-blue-600">{m.level}</td>
                  <td className="p-4 text-gray-600">{m.carnumber || "-"}</td>
                  <td className="p-4 text-gray-400 text-xs truncate max-w-[150px]">{m.note || "-"}</td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => openEditModal(m)} className="px-3 py-1.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-bold hover:bg-yellow-500 hover:text-white">수정</button>
                    <button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-500 hover:text-white">삭제</button>
                  </td>
                </tr>
              ))}
              {activeTab === "fees" && activeMembers.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 text-center">
                  <td className="p-4 font-bold text-gray-800 sticky left-0 bg-white z-10 border-r">{m.name}</td>
                  <td className="p-4 border-r font-bold text-blue-600 text-xs">{m.level}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const isPaid = m.fees?.find(f => f.year === selectedYear && f.month === month)?.paid;
                    return (
                      <td key={month} className="p-0 border-r cursor-pointer" onClick={() => toggleFee(m.id, selectedYear, month, !!isPaid)}>
                        <span className={`text-xl ${isPaid ? "text-red-500" : "text-gray-200"}`}>●</span>
                      </td>
                    );
                  })}
                  <td className="p-2 space-x-1">
                    <button onClick={() => handleAllPaid(m.id)} className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">완납</button>
                    <button onClick={() => handleAllUnpaid(m.id)} className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded border border-gray-200">해제</button>
                  </td>
                </tr>
              ))}
              {activeTab === "deleted" && deletedMembers.map((m) => (
                <tr key={m.id} className="hover:bg-red-50/30 transition bg-gray-50">
                  <td className="p-4 font-bold text-gray-400 sticky left-0 bg-gray-50 z-10 border-r">{m.name}</td>
                  <td className="p-4 text-center"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-500">{m.gender}</span></td>
                  <td className="p-4 text-gray-400">{new Date(m.birth as string).toLocaleDateString("ko-KR")}</td>
                  <td className="p-4 text-red-500 font-bold">
                    {m.deletedAt ? new Date(m.deletedAt as string).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="p-4 font-mono text-gray-400">{m.phone}</td>
                  <td className="p-4 text-center font-bold text-gray-400">{m.level}</td>
                  <td className="p-4 text-gray-400">{m.carnumber || "-"}</td>
                  <td className="p-4 text-gray-400 text-xs italic">{m.note || "-"}</td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => handleRestore(m.id)} className="px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-500 hover:text-white">복구</button>
                    <button onClick={() => handlePermanentDelete(m.id)} className="px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-500 hover:text-white">영구삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모달 창 (회원 등록/수정) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-[420px] shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">{editingMember ? "회원 정보 수정" : "신규 회원 등록"}</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div><label className="text-xs font-bold text-gray-400 ml-1">이름</label><input placeholder="이름" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-400 ml-1">성별</label><div className="flex gap-2">{["남", "여"].map(g => (<button key={g} onClick={() => setForm({...form, gender: g})} className={`flex-1 py-2.5 rounded-xl border font-bold transition ${form.gender === g ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-gray-50 text-gray-400"}`}>{g}</button>))}</div></div>
              <div><label className="text-xs font-bold text-gray-400 ml-1">생년월일</label><input type="date" className="w-full border p-3 rounded-xl outline-none" value={form.birth} onChange={e => setForm({...form, birth: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-400 ml-1">연락처</label><input placeholder="010-0000-0000" className="w-full border p-3 rounded-xl outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-400 ml-1">급수</label><select className="w-full border p-3 rounded-xl outline-none bg-white font-bold" value={form.level} onChange={e => setForm({...form, level: e.target.value})}><option value="">급수 선택</option>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-400 ml-1">차량번호</label><input placeholder="차량번호" className="w-full border p-3 rounded-xl outline-none" value={form.carnumber} onChange={e => setForm({...form, carnumber: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-400 ml-1">비고</label><textarea placeholder="특이사항 입력" className="w-full border p-3 rounded-xl outline-none h-20 resize-none" value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowModal(false); setEditingMember(null); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">취소</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}