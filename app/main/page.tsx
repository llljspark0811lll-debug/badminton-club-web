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
  birth: string;
  phone: string;
  address: string;
  level: string;
  createdAt: string;
  note: string;
  deleted?: boolean;
  fees: Fee[];
}

export default function MainPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [members, setMembers] = useState<Member[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [form, setForm] = useState({
    name: "",
    birth: "",
    phone: "",
    address: "",
    level: "",
    note: "",
  });

  // ✅ DB에서 회원 불러오기
  const fetchMembers = async () => {
    const res = await fetch("/api/members");
    const data = await res.json();
    setMembers(data);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // ✅ 등록 / 수정
  const handleSubmit = async () => {
    if (editingMember) {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMember.id,
          ...form,
        }),
      });
    } else {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setShowModal(false);
    setEditingMember(null);
    setForm({
      name: "",
      birth: "",
      phone: "",
      address: "",
      level: "",
      note: "",
    });

    fetchMembers();
  };

  // ✅ Soft Delete
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    await fetch("/api/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchMembers();
  };

  // ✅ 영구 삭제
  const handlePermanentDelete = async (id: number) => {
    if (
      !confirm(
        "정말로 삭제하시겠습니까?\n삭제하시면 데이터는 영구적으로 삭제됩니다."
      )
    )
      return;

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      fetchMembers();
    }
  };

  // ✅ 회비 상태 토글 함수
  const toggleFee = async (memberId: number, year: number, month: number, currentPaid: boolean) => {
    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        year,
        month,
        paid: !currentPaid, // 현재 상태의 반대로 보냄 (true -> false)
      }),
    });

    if (res.ok) {
      fetchMembers(); // 화면 새로고침 대신 데이터를 다시 불러옵니다.
    }
  };

  // ✅ 현재 연도 상태 (기본값은 올해)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ✅ 모든 달 한번에 납부 처리하는 함수
  const handleAllPaid = async (memberId: number) => {
    if (!confirm(`${selectedYear}년 전체를 완납 처리하시겠습니까?`)) return;

    try {
      // 1월부터 12월까지 순회하며 API 호출
      const promises = Array.from({ length: 12 }, (_, i) => {
        return fetch("/api/fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId,
            year: selectedYear,
            month: i + 1,
            paid: true,
          }),
        });
      });

      await Promise.all(promises); // 모든 호출이 끝날 때까지 대기
      fetchMembers(); // 화면 갱신
      alert("전체 납부 처리가 완료되었습니다.");
    } catch (error) {
      console.error("전체 납부 실패:", error);
    }
  };

  const activeMembers = members.filter((m) => !m.deleted);
  const deletedMembers = members.filter((m) => m.deleted);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          🏸 회원 관리 시스템
        </h1>

        {/* ✅ 탭 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-lg ${activeTab === "active"
              ? "bg-blue-600 text-white"
              : "bg-gray-300"
              }`}
          >
            활동 회원
          </button>

          <button
            onClick={() => setActiveTab("fees")}
            className={`px-4 py-2 rounded-lg ${activeTab === "fees"
              ? "bg-blue-600 text-white"
              : "bg-gray-300"}`}>
            회비 관리
          </button>

          <button
            onClick={() => setActiveTab("deleted")}
            className={`px-4 py-2 rounded-lg ${activeTab === "deleted"
              ? "bg-blue-600 text-white"
              : "bg-gray-300"
              }`}
          >
            탈퇴 회원
          </button>
        </div>

        {/* ✅ 활동회원일 때만 등록 버튼 */}
        {activeTab === "active" && (
          <button
            onClick={() => setShowModal(true)}
            className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
          >
            + 회원 등록
          </button>
        )}

        {activeTab === "fees" && (
  <div>
    <div className="mb-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
      <div className="flex gap-4 text-sm font-bold items-center">
        <span>현황:</span>
        <span className="text-black">● 미납</span>
        <span className="text-red-500">● 완납</span>
        
        {/* ✅ 연도 선택 드롭다운 */}
        <select 
          className="ml-4 p-1 border rounded"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
                  {/* 가입년도부터 내년까지 자동 생성 (예시로 2024~2027) */}
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-3 border sticky left-0 bg-gray-200 z-10">이름</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i + 1} className="p-3 border">{i + 1}월</th>
                    ))}
                    <th className="p-3 border">비고</th> {/* 완납 버튼용 칸 */}
                  </tr>
                </thead>
                <tbody>
                  {activeMembers.map((m) => (
                    <tr key={m.id} className="text-center hover:bg-gray-50">
                      <td className="p-3 border font-bold sticky left-0 bg-white z-10">{m.name}</td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const feeRecord = m.fees?.find(f => f.year === selectedYear && f.month === month);
                        const isPaid = feeRecord ? feeRecord.paid : false;

                        return (
                          <td
                            key={month}
                            className="p-3 border cursor-pointer"
                            onClick={() => toggleFee(m.id, selectedYear, month, isPaid)}
                          >
                            <span className={`text-xl ${isPaid ? "text-red-500" : "text-black opacity-10"}`}>●</span>
                          </td>
                        );
                      })}
                      <td className="p-2 border">
                        <button
                          onClick={() => handleAllPaid(m.id)}
                          className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-200"
                        >
                          완납
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ✅ 활동/탈퇴 테이블 (fees 아닐 때만 보임) */}
        {activeTab !== "fees" && (
          <table className="w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">이름</th>
                <th className="p-2 border">연락처</th>
                <th className="p-2 border">주소</th>
                <th className="p-2 border">급수</th>
                <th className="p-2 border">등록일</th>
                <th className="p-2 border">비고</th>
                <th className="p-2 border">관리</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "active"
                ? activeMembers
                : deletedMembers
              ).map((m) => (
                <tr
                  key={m.id}
                  className={`text-center ${
                    m.deleted
                      ? "line-through text-gray-400 bg-gray-100"
                      : ""
                  }`}
                >
                  <td className="p-2 border">{m.name}</td>
                  <td className="p-2 border">{m.phone}</td>
                  <td className="p-2 border">{m.address}</td>
                  <td className="p-2 border">{m.level}</td>
                  <td className="p-2 border">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2 border">{m.note}</td>
                  <td className="p-2 border space-x-2">
                    {!m.deleted && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMember(m);
                            setForm({
                              name: m.name,
                              birth: m.birth,
                              phone: m.phone,
                              address: m.address,
                              level: m.level,
                              note: m.note,
                            });
                            setShowModal(true);
                          }}
                          className="bg-yellow-500 text-white px-2 py-1 rounded"
                        >
                          수정
                        </button>

                        <button
                          onClick={() => handleDelete(m.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded"
                        >
                          삭제
                        </button>
                      </>
                    )}

                    {m.deleted && (
                      <>
                        <button
                          onClick={() => handleRestore(m.id)}
                          className="bg-green-600 text-white px-2 py-1 rounded"
                        >
                          복구
                        </button>

                        <button
                          onClick={() => handlePermanentDelete(m.id)}
                          className="bg-red-700 text-white px-2 py-1 rounded"
                        >
                          영구 삭제
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ✅ 모달 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl w-[400px]">
              <h2 className="text-lg font-bold mb-4">
                {editingMember ? "회원 수정" : "회원 등록"}
              </h2>

              {["name", "birth", "phone", "address", "level", "note"].map(
                (key) => (
                  <input
                    key={key}
                    placeholder={key}
                    className="w-full border p-2 mb-2 rounded"
                    value={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                )
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-2 rounded mt-2"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
