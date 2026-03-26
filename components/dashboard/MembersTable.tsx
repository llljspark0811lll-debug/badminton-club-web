import type { Member } from "@/components/dashboard/types";
import { formatDate } from "@/components/dashboard/utils";

type MembersTableProps = {
  members: Member[];
  customFieldLabel: string;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
};

export function MembersTable({
  members,
  customFieldLabel,
  onEdit,
  onDelete,
}: MembersTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">이름</th>
              <th className="px-4 py-4 font-semibold">성별</th>
              <th className="px-4 py-4 font-semibold">생년월일</th>
              <th className="px-4 py-4 font-semibold">연락처</th>
              <th className="px-4 py-4 font-semibold">급수</th>
              <th className="px-4 py-4 font-semibold">
                {customFieldLabel}
              </th>
              <th className="px-4 py-4 font-semibold">메모</th>
              <th className="px-4 py-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-bold text-slate-900">
                  {member.name}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {member.gender}
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {formatDate(member.birth)}
                </td>
                <td className="px-4 py-4 font-medium text-slate-700">
                  {member.phone || "-"}
                </td>
                <td className="px-4 py-4 font-bold text-sky-600">
                  {member.level}
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {member.customFieldValue || "-"}
                </td>
                <td className="max-w-[220px] px-4 py-4 text-slate-400">
                  {member.note || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(member)}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(member.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                    >
                      탈퇴 처리
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
