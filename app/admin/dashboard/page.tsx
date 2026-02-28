"use client";

import { useEffect, useState } from "react";

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
  const [clubName, setClubName] = useState("로딩 중..."); // 초기값 변경
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState<"name" | "date" | "level" | "gender">("name");

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState({
    name: "",
    gender: "",
    birth: "",
    phone: "",
    level: "",
    carnumber: "",
    note: "",
  });

  // 1. 클럽 이름 가져오기 함수 추가
  const fetchClubName = async () => {
    try {
      const res = await fetch("/api/club-info", {
        cache: 'no-store',
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          // 💡 이 부분을 수정합니다!
          setClubName(`[${data.name}]`);
          localStorage.setItem("clubName", `[${data.name}]`);
        }
      } else {
        const backupName = localStorage.getItem("clubName");
        setClubName(backupName || "[클럽]");
      }
    } catch (err) {
      setClubName("[클럽]");
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data);
    } catch (err) {
      console.error("멤버 로딩 실패:", err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/member-request", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } catch (err) {
      console.error("신청 목록 로딩 실패:", err);
    }
  };

  useEffect(() => {
    fetchClubName(); // 페이지 진입 시 클럽명 가져오기
    fetchMembers();
    fetchRequests();
  }, []);

  // --- 기존 로직 (sortMembers, handleSubmit, openEditModal 등은 동일하므로 생략 가능하나 흐름을 위해 유지) ---
  
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

  const handleApprove = async (id: number) => {
    if (!confirm("이 신청을 승인하시겠습니까?")) return;
    const res = await fetch("/api/member-request/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) {
      alert("승인되었습니다. 회원에게 알림 문자가 발송됩니다."); // 문자 발송 안내 추가
      fetchRequests();
      fetchMembers();
      setActiveTab("members");
    }
  };

  // 거절 기능 추가 예시
  const handleReject = async (id: number) => {
    if (!confirm("정말 가입 신청을 거절하시겠습니까?")) return;
    const res = await fetch("/api/member-request/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) {
      alert("거절되었습니다. 회원에게 알림 문자가 발송됩니다.");
      fetchRequests();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch("/api/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) fetchMembers();
  };

  const handleRestore = async (id: number) => {
    const res = await fetch("/api/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) fetchMembers();
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm("영구 삭제 시 복구가 불가능합니다. 계속하시겠습니까?")) return;
    const res = await fetch("/api/members/permanent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      credentials: "include",
    });
    if (res.ok) fetchMembers();
  };

  const toggleFee = async (memberId: number, year: number, month: number, currentPaid: boolean) => {
    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, year, month, paid: !currentPaid }),
      credentials: "include",
    });
    if (res.ok) fetchMembers();
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        
        <div className="flex justify-between items-center mb-8">
          {/* 💡 여기에 동적 클럽 이름 적용 */}
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">🏸 {clubName} 회원관리</h1>
          <button onClick={() => { setEditingMember(null); setForm({ name: "", gender: "", birth: "", phone: "", level: "", carnumber: "", note: "" }); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">+ 직접 등록</button>
        </div>

        <div className="flex gap-2 mb-6 border-b pb-4 overflow-x-auto whitespace-nowrap">
          {[{ id: "members", label: "회원 목록" }, { id: "requests", label: "가입 신청" }, { id: "fees", label: "회비 관리" }, { id: "deleted", label: "탈퇴 회원" }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2 rounded-full text-sm font-semibold transition ${activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}>{tab.label}{tab.id === "requests" && requests.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>}</button>
          ))}
        </div>

        {(activeTab === "members" || activeTab === "deleted") && (
          <div className="flex justify-end mb-4 items-center gap-2">
            <span className="text-xs font-bold text-gray-500">정렬 기준:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs border rounded-lg p-1.5 outline-none bg-white shadow-sm">
              <option value="name">가나다순</option>
              <option value="date">최신 가입순</option>
              <option value="level">급수순</option>
              <option value="gender">성별순</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
          <table className="min-w-[1000px] w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="p-4">이름</th>
                <th className="p-4 text-center">성별</th>
                <th className="p-4">생년월일</th>
                <th className="p-4">연락처</th>
                <th className="p-4 text-center">급수</th>
                {activeTab !== "fees" && <><th className="p-4">차량번호</th><th className="p-4">비고</th><th className="p-4 text-center">관리</th></>}
                {activeTab === "fees" && Array.from({ length: 12 }, (_, i) => <th key={i} className="p-2 text-center text-[11px] font-bold">{i + 1}월</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeTab === "members" && activeMembers.map((m) => (
                <tr key={m.id} className="hover:bg-blue-50/30 transition">
                  <td className="p-4 font-bold text-gray-800">{m.name}</td>
                  <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.gender === "남" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>{m.gender}</span></td>
                  <td className="p-4 text-gray-500">{new Date(m.birth as string).toLocaleDateString("ko-KR")}</td>
                  <td className="p-4 font-mono">{m.phone}</td>
                  <td className="p-4 text-center"><span className={`px-3 py-1 rounded-lg text-xs font-black shadow-sm border ${m.gender === "남" ? "bg-white border-blue-200 text-blue-600" : "bg-white border-pink-200 text-pink-600"}`}>{m.level}</span></td>
                  <td className="p-4 text-gray-600">{m.carnumber || "-"}</td>
                  <td className="p-4 text-gray-400 text-xs truncate max-w-[150px]">{m.note || "-"}</td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => openEditModal(m)} className="px-3 py-1.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-bold hover:bg-yellow-500 hover:text-white transition">수정</button>
                    <button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-500 hover:text-white transition">삭제</button>
                  </td>
                </tr>
              ))}

              {activeTab === "requests" && requests.map((r) => (
                <tr key={r.id} className="bg-yellow-50/20 hover:bg-yellow-50 transition">
                  <td className="p-4 font-bold text-gray-800">{r.name}</td>
                  <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.gender === "남" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>{r.gender}</span></td>
                  <td className="p-4 text-gray-500">{new Date(r.birth as string).toLocaleDateString("ko-KR")}</td>
                  <td className="p-4 font-mono">{r.phone}</td>
                  <td className="p-4 text-center font-black text-gray-700">{r.level}</td>
                  <td className="p-4 text-gray-600">{r.carnumber || "-"}</td>
                  <td className="p-4 text-gray-400 text-xs">{r.note || "-"}</td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => handleApprove(r.id)} className="px-5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold shadow-md hover:bg-green-700 transition">승인</button>
                    {/* 💡 거절 버튼 추가 */}
                    <button onClick={() => handleReject(r.id)} className="px-5 py-1.5 rounded-lg bg-gray-500 text-white text-xs font-bold shadow-md hover:bg-gray-600 transition">거절</button>
                  </td>
                </tr>
              ))}

              {activeTab === "fees" && activeMembers.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-bold border-r">{m.name}</td>
                  <td className="p-4 text-center border-r text-xs font-bold text-gray-400">{m.gender}</td>
                  <td className="p-4 text-gray-400 text-xs">{new Date(m.birth as string).getFullYear()}년</td>
                  <td className="p-4 font-mono text-xs border-r">{m.phone.slice(-4)}</td>
                  <td className="p-4 text-center border-r font-black text-blue-600">{m.level}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const isPaid = m.fees?.find(f => f.year === selectedYear && f.month === month)?.paid;
                    return (
                      <td key={month} className="p-0 text-center border-r cursor-pointer hover:bg-blue-50 transition" onClick={() => toggleFee(m.id, selectedYear, month, !!isPaid)}>
                        <span className={`text-xl ${isPaid ? "text-red-500" : "text-gray-200"}`}>●</span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {activeTab === "deleted" && deletedMembers.map((m) => (
                <tr key={m.id} className="bg-gray-50 text-gray-400">
                  <td className="p-4 font-bold line-through">{m.name}</td>
                  <td className="p-4 text-center">{m.gender}</td>
                  <td className="p-4">{new Date(m.birth as string).toLocaleDateString("ko-KR")}</td>
                  <td className="p-4 font-mono">{m.phone}</td>
                  <td className="p-4 text-center">{m.level}</td>
                  <td className="p-4">{m.carnumber || "-"}</td>
                  <td className="p-4 text-xs">탈퇴회원</td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => handleRestore(m.id)} className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold hover:bg-green-600 hover:text-white transition">복구</button>
                    <button onClick={() => handlePermanentDelete(m.id)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-red-600 hover:text-white transition">영구삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-[420px] shadow-2xl animate-fadeIn">
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
              <button onClick={() => { setShowModal(false); setEditingMember(null); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">취소</button>
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}