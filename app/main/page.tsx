"use client";

import { useEffect, useState } from "react";

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
  birth: string;
  phone: string;
  level: string;
  createdAt: string;
  note: string;
  carnumber: string;
  deleted?: boolean;
  fees: Fee[];
}

export default function MainPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [members, setMembers] = useState<Member[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [sortBy, setSortBy] = useState<"name" | "date" | "level" | "gender">("name");
  const [form, setForm] = useState({
    name: "",
    gender: "",
    birth: "",
    phone: "",    
    level: "",
    carnumber: "",
    note: "",
  });

  // ✅ DB에서 회원 불러오기
  const fetchMembers = async () => {
    const adminId = localStorage.getItem("adminId");
    const res = await fetch("/api/members", {
      headers: {
        "x-admin-id": adminId || "1",
      },
    });
    const data = await res.json();
    setMembers(data);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // ✅ 정렬 로직 정의
  const sortMembers = (memberList: Member[]) => {
    return [...memberList].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "ko"); // 가나다순
      } else if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // 최신 등록순
      } else if (sortBy === "gender") {
        const order: { [key: string]: number } = {
          "남": 1,
          "여": 2,
        };
        return (order[a.gender] || 99) - (order[b.gender] || 99);
      } else if (sortBy === "level") {
        const levelOrder: { [key: string]: number } = {
          "A": 1, "B": 2, "C": 3, "D": 4, "초심": 5
        };
        const levelA = levelOrder[a.level] || 99;
        const levelB = levelOrder[b.level] || 99;
        return levelA - levelB; // 급수 높은 순 (A -> B -> C...)
      }
      return 0;
    });
  };

  const activeMembers = sortMembers(members.filter((m) => !m.deleted));
  const deletedMembers = members.filter((m) => m.deleted);

  // ✅ 등록 / 수정
  const handleSubmit = async () => {
    const adminId = localStorage.getItem("adminId") || "1";
    if (editingMember) {
      const prevMembers = members;
      const updatedMember: Member = { ...editingMember, ...form };

      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? updatedMember : m))
      );

      try {
        const res = await fetch("/api/members", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-id": adminId,
          },
          body: JSON.stringify({
            id: editingMember.id,
            adminId: parseInt(adminId),
            name: form.name,
            gender: form.gender,
            birth: form.birth,
            phone: form.phone,
            level: form.level,
            carnumber: form.carnumber,
            note: form.note,
          }),
        });

        if (!res.ok) {
          setMembers(prevMembers);
          alert("회원 수정에 실패했습니다.");
        }
      } catch (e) {
        setMembers(prevMembers);
        alert("네트워크 오류가 발생했습니다.");
      }
    } else {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": adminId,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) fetchMembers();
      else alert("회원 등록에 실패했습니다.");
    }

    setShowModal(false);
    setEditingMember(null);
    setForm({ name: "", gender: "", birth: "", phone: "", level: "", carnumber: "", note: "" });
  };

  // ✅ Soft Delete
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch("/api/members", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": localStorage.getItem("adminId") || "1",
      },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchMembers();
  };

  // ✅ 영구 삭제
  const handlePermanentDelete = async (id: number) => {
    if (!confirm("정말로 영구 삭제하시겠습니까?")) return;
    await fetch("/api/members/permanent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchMembers();
  };

  // ✅ 복구
  const handleRestore = async (id: number) => {
    const res = await fetch("/api/members", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-id": localStorage.getItem("adminId") || "1",
      },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchMembers();
  };

  // ✅ 회비 상태 토글
  const toggleFee = async (memberId: number, year: number, month: number, currentPaid: boolean) => {
    const prevMembers = members;
    setMembers((prev) =>
      prev.map((m) =>
        m.id !== memberId
          ? m
          : {
              ...m,
              fees: (() => {
                const exists = m.fees.find((f) => f.year === year && f.month === month);
                if (exists) {
                  return m.fees.map((f) =>
                    f.year === year && f.month === month ? { ...f, paid: !currentPaid } : f
                  );
                } else {
                  return [...m.fees, { id: Date.now(), year, month, paid: !currentPaid }];
                }
              })(),
            }
      )
    );

    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": localStorage.getItem("adminId") || "1",
        },
        body: JSON.stringify({ memberId, year, month, paid: !currentPaid }),
      });
      if (!res.ok) setMembers(prevMembers);
    } catch (e) {
      setMembers(prevMembers);
    }
  };

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleAllPaid = async (memberId: number) => {
    if (!confirm(`${selectedYear}년 전체를 완납 처리하시겠습니까?`)) return;
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        return fetch("/api/fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, year: selectedYear, month: i + 1, paid: true }),
        });
      });
      await Promise.all(promises);
      fetchMembers();
      alert("완료되었습니다.");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
          🏸 회원 관리 시스템
        </h1>

        {/* ✅ 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b pb-4">
          {[
            { id: "active", label: "활동 회원" },
            { id: "fees", label: "회비 관리" },
            { id: "deleted", label: "탈퇴 회원" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ✅ 활동 회원 상단 필터/등록 바 */}
        {activeTab === "active" && (
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm transition"
            >
              + 회원 등록
            </button>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700">정렬 기준:</span>
              <select
                className="border-gray-300 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="name">가나다순</option>
                <option value="date">최신 가입순</option>
                <option value="level">급수별(A-D)</option>
                <option value="gender">성별순(남→여)</option>
              </select>
            </div>
          </div>
        )}

        {/* ✅ 회비 관리 화면 */}
        {activeTab === "fees" && (
          <div className="animate-fadeIn">
            <div className="mb-4 p-4 bg-blue-50 rounded-xl flex justify-between items-center">
              <div className="flex gap-6 text-sm font-bold items-center">
                <div className="flex items-center gap-2"><span className="text-black">●</span> 미납부</div>
                <div className="flex items-center gap-2"><span className="text-red-500">●</span> 납부</div>
                <select
                  className="ml-4 p-2 border rounded-lg bg-white"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}년 회비</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4 border-r sticky left-0 bg-gray-100 z-10 w-24">이름</th>
                    {Array.from({ length: 12 }, (_, i) => (<th key={i + 1} className="p-3 border-r">{i + 1}월</th>))}
                    <th className="p-3">일괄</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeMembers.map((m) => (
                    <tr key={m.id} className="text-center hover:bg-gray-50 transition">
                      <td className="p-4 border-r font-bold sticky left-0 bg-white z-10">{m.name}</td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const feeRecord = m.fees?.find((f) => f.year === selectedYear && f.month === month);
                        const isPaid = feeRecord ? feeRecord.paid : false;
                        return (
                          <td key={month} className="p-3 border-r cursor-pointer group" onClick={() => toggleFee(m.id, selectedYear, month, isPaid)}>
                            <span className={`text-2xl transition-transform group-hover:scale-125 inline-block ${isPaid ? "text-red-500" : "text-gray-200"}`}>●</span>
                          </td>
                        );
                      })}
                      <td className="p-3">
                        <button onClick={() => handleAllPaid(m.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-xs font-bold hover:bg-red-600 hover:text-white transition">완납</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ✅ 회원 목록 테이블 (활동/탈퇴 공통) */}
        {activeTab !== "fees" && (
          <div className="overflow-hidden border rounded-xl shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 border-b text-gray-700">
                <tr>
                  <th className="p-4">이름</th>
                  <th className="p-4">성별</th>
                  <th className="p-4">생년월일</th>
                  <th className="p-4">연락처</th>                  
                  <th className="p-4">급수</th>
                  <th className="p-4">등록일</th>
                  <th className="p-4">차량번호</th>
                  <th className="p-4">비고</th>
                  <th className="p-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(activeTab === "active" ? activeMembers : deletedMembers).map((m) => (
                  <tr key={m.id} className={`hover:bg-gray-50 transition ${m.deleted ? "text-gray-400 bg-gray-50" : ""}`}>
                    <td className="p-4 font-semibold">{m.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${m.gender === "남"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                        }`}>
                        {m.gender}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      {m.birth ? new Date(m.birth).toLocaleDateString("ko-KR") : ""}
                    </td>
                    <td className="p-4">{m.phone}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${m.gender === "남"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                          }`}
                      >
                        {m.level}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-gray-500">{m.carnumber || "-"}</td>
                    <td className="p-4 text-gray-500">{m.note}</td>
                    <td className="p-4 text-center space-x-2">
                      {!m.deleted ? (
                        <>
                          {/* ✅ 수정 버튼: 테두리 및 음영 추가 */}
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setForm({
                                name: m.name || "",
                                gender: m.gender || "",
                                birth: m.birth || "",
                                phone: m.phone || "",                                
                                level: m.level || "",
                                carnumber: m.carnumber || "",
                                note: m.note || "",
                              });
                              setShowModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-bold shadow-sm hover:bg-yellow-500 hover:text-white hover:border-yellow-500 transition-all active:scale-95"
                          >
                            수정
                          </button>
                          {/* ✅ 삭제 버튼: 테두리 및 음영 추가 */}
                          <button 
                            onClick={() => handleDelete(m.id)} 
                            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-bold shadow-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
                          >
                            삭제
                          </button>
                        </>
                      ) : (
                        <>
                          {/* ✅ 복구 버튼: 테두리 및 음영 추가 */}
                          <button 
                            onClick={() => handleRestore(m.id)} 
                            className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold shadow-sm hover:bg-green-600 hover:text-white hover:border-green-600 transition-all active:scale-95"
                          >
                            복구
                          </button>
                          {/* ✅ 영구삭제 버튼: 테두리 및 음영 추가 */}
                          <button 
                            onClick={() => handlePermanentDelete(m.id)} 
                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-bold shadow-sm hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-all active:scale-95"
                          >
                            영구삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ 회원 등록/수정 모달 */}
{showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-2xl w-[420px] max-h-[85vh] overflow-y-auto shadow-2xl">
              <h2 className="text-xl font-bold mb-6 text-gray-800">{editingMember ? "회원 정보 수정" : "신규 회원 등록"}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">이름</label>
                  <input placeholder="홍길동" className="w-full border-gray-200 border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                {/* ✅ 성별 입력 추가 */}
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">성별</label>
                  <div className="flex gap-4 mt-1">
                    {["남", "여"].map((g) => (
                      <label key={g} className={`flex-1 flex items-center justify-center py-2 border rounded-lg cursor-pointer transition font-bold ${form.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        <input type="radio" className="hidden" name="gender" value={g} checked={form.gender === g} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                {[
                  { id: "birth", label: "생년월일", ph: "1990-01-01" },
                  { id: "phone", label: "연락처", ph: "010-0000-0000" },
                  { id: "level", label: "급수 (A, B, C, D, 초심)", ph: "A" },
                  { id: "carnumber", label: "차량번호", ph: "차량번호" },
                  { id: "note", label: "비고", ph: "특이사항" },
                ].map((input) => (
                  <div key={input.id}>
                    <label className="text-xs font-bold text-gray-500 ml-1">{input.label}</label>
                    <input placeholder={input.ph} className="w-full border-gray-200 border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={(form as any)[input.id]} onChange={(e) => setForm({ ...form, [input.id]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">취소</button>
                <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition">저장하기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}