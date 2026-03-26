import type { Member } from "@/components/dashboard/types";

type FeesTableProps = {
  members: Member[];
  selectedYear: number;
  onChangeYear: (year: number) => void;
  onToggleFee: (
    memberId: number,
    year: number,
    month: number,
    currentPaid: boolean
  ) => void;
  onMarkAllPaid: (memberId: number) => void;
  onMarkAllUnpaid: (memberId: number) => void;
};

export function FeesTable({
  members,
  selectedYear,
  onChangeYear,
  onToggleFee,
  onMarkAllPaid,
  onMarkAllUnpaid,
}: FeesTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            연도별 회비 관리
          </h3>
          <p className="text-sm text-slate-500">
            월별 납부 상태를 빠르게 체크할 수 있습니다.
          </p>
        </div>
        <input
          type="number"
          value={selectedYear}
          onChange={(event) =>
            onChangeYear(Number(event.target.value))
          }
          className="w-28 rounded-2xl border border-slate-200 px-4 py-3 text-center font-semibold outline-none transition focus:border-sky-400"
        />
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">회원</th>
                <th className="px-4 py-4 font-semibold">급수</th>
                {Array.from({ length: 12 }, (_, index) => (
                  <th
                    key={index}
                    className="px-2 py-4 text-center font-semibold"
                  >
                    {index + 1}월
                  </th>
                ))}
                <th className="px-4 py-4 font-semibold">일괄 처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {member.name}
                  </td>
                  <td className="px-4 py-4 font-bold text-sky-600">
                    {member.level}
                  </td>
                  {Array.from({ length: 12 }, (_, index) => {
                    const month = index + 1;
                    const fee = member.fees.find(
                      (item) =>
                        item.year === selectedYear &&
                        item.month === month
                    );
                    const isPaid = Boolean(fee?.paid);

                    return (
                      <td
                        key={month}
                        className="px-2 py-4 text-center"
                      >
                        <button
                          onClick={() =>
                            onToggleFee(
                              member.id,
                              selectedYear,
                              month,
                              isPaid
                            )
                          }
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition ${
                            isPaid
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          ✓
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onMarkAllPaid(member.id)}
                        className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                      >
                        전부 납부
                      </button>
                      <button
                        onClick={() => onMarkAllUnpaid(member.id)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                      >
                        전부 미납
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    회비를 관리할 회원이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
