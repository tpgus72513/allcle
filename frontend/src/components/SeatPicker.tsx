// src/components/SeatPicker.tsx — 구역 선택 후 개별 좌석(열/번) 선택
"use client";

import { useEffect, useState } from "react";
import { getSectionSeats } from "../lib/services";
import type { Seat, Section } from "../lib/types";

interface Props {
  simId: string;
  section: Section;
  onSelect: (row: number, seatNumber: number) => void;
  onBack: () => void;
  submitting: boolean;
}

export default function SeatPicker({ simId, section, onSelect, onBack, submitting }: Props) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<{ row: number; number: number } | null>(null);

  useEffect(() => {
    getSectionSeats(simId, section.id).then((s) => { setSeats(s); setLoading(false); });
  }, [simId, section.id]);

  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
  const cols = [...new Set(seats.map((s) => s.number))].sort((a, b) => a - b);

  if (loading) return <div className="p-8 text-center text-gray-500">좌석 배치 불러오는 중…</div>;

  return (
    <div className="flex flex-col p-4">
      <button onClick={onBack} className="mb-2 self-start text-sm text-gray-500 hover:text-gray-800">
        ← 구역 다시 선택
      </button>
      <h2 className="text-lg font-bold">{section.name}</h2>
      <p className="text-sm text-gray-500">{section.grade} · {section.price.toLocaleString("ko-KR")}원</p>

      {/* 범례 */}
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-4 w-4 rounded bg-purple-400" />선택 가능</span>
        <span className="flex items-center gap-1"><span className="inline-block h-4 w-4 rounded bg-gray-200" />매진</span>
        <span className="flex items-center gap-1"><span className="inline-block h-4 w-4 rounded bg-black" />선택됨</span>
      </div>

      <div className="mt-3 rounded bg-green-700 py-1 text-center text-xs font-bold text-white">⚾ FIELD 방향</div>

      {/* 좌석 그리드 */}
      <div className="mt-3 overflow-x-auto rounded-xl bg-gray-50 p-3">
        <table className="mx-auto border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-8 text-[10px] text-gray-400" />
              {cols.map((c) => (
                <th key={c} className="w-6 text-center text-[10px] font-normal text-gray-400">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <td className="pr-1 text-right text-[10px] text-gray-400">{r}열</td>
                {cols.map((c) => {
                  const seat = seats.find((s) => s.row === r && s.number === c);
                  if (!seat) return <td key={c} />;
                  const isPicked = picked?.row === r && picked?.number === c;
                  return (
                    <td key={c}>
                      <button
                        disabled={seat.taken}
                        onClick={() => setPicked({ row: r, number: c })}
                        title={seat.taken ? "매진" : `${r}열 ${c}번`}
                        className={[
                          "h-5 w-5 rounded transition-colors",
                          seat.taken
                            ? "cursor-not-allowed bg-gray-200"
                            : isPicked
                            ? "bg-black ring-1 ring-gray-800"
                            : "bg-purple-400 hover:bg-purple-500",
                        ].join(" ")}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 확인 바 */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
        <div className="text-sm">
          {picked
            ? <><span className="font-semibold">{section.name}</span><span className="ml-2 text-gray-600">{picked.row}열 {picked.number}번</span></>
            : <span className="text-gray-400">좌석을 선택해 주세요</span>}
        </div>
        <button
          disabled={!picked || submitting}
          onClick={() => picked && onSelect(picked.row, picked.number)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-300"
        >
          {submitting ? "처리 중…" : "이 좌석으로 결제"}
        </button>
      </div>
    </div>
  );
}
