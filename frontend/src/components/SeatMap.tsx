// src/components/SeatMap.tsx  [FE-2 담당]
// ─────────────────────────────────────────────────────────────
// Sprint 1 = 그리드 div placeholder.  Sprint 2 = <SectionTile> 내부만 <svg><path/>로 교체.
// (클릭/선택/매진차단 로직은 바깥에 있어 그대로 재사용)
//
// 합의 반영:
//  - seed 고정 → 진입 시 getSeats 1회만 (polling 없음)
//  - 매진 구역 클릭 차단
//  - selectSeat 409(SEAT_SOLD_OUT) → alternatives 모달 (안전망)
//  - 선택 좌석을 store에 "등급까지" 저장 (결과 카드용)
// ─────────────────────────────────────────────────────────────
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSeats, selectSeat } from "../lib/services";
import { ApiError } from "../lib/api";
import { useFlowStore } from "../store/useFlowStore";
import type { Section, Alternative } from "../lib/types";
import SeatPicker from "./SeatPicker";
import StadiumSVG from "./StadiumSVG";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

function popularityStyle(p: number): React.CSSProperties {
  const alpha = 0.12 + (p / 5) * 0.55; // popularity 1~5
  return { backgroundColor: `rgba(220, 38, 38, ${alpha})` };
}

// ★ Sprint 2엔 이 내부만 SVG <path>로 교체 ★
function SectionTile({ section, selected, onClick }: {
  section: Section; selected: boolean; onClick: () => void;
}) {
  const base = "relative rounded-lg border px-3 py-3 text-left transition-all w-full";
  const state = section.soldOut
    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-60"
    : selected
    ? "cursor-pointer border-red-600 ring-2 ring-red-500 shadow-md"
    : "cursor-pointer border-gray-300 hover:border-red-400";
  return (
    <button
      type="button" onClick={onClick} disabled={section.soldOut}
      aria-pressed={selected} className={`${base} ${state}`}
      style={section.soldOut ? undefined : popularityStyle(section.popularity)}
    >
      <div className="text-sm font-semibold leading-tight">{section.name}</div>
      <div className="mt-0.5 text-xs text-gray-700">{won(section.price)}</div>
      {section.soldOut ? (
        <span className="absolute right-2 top-2 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-white">매진</span>
      ) : (
        <span className="absolute right-2 top-2 text-[10px] text-gray-500">인기 {section.popularity}</span>
      )}
    </button>
  );
}

export default function SeatMap({ onConfirmed }: { onConfirmed: () => void }) {
  const { simId, setSelectedSeat } = useFlowStore();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alts, setAlts] = useState<Alternative[] | null>(null);
  const [step, setStep] = useState<"section" | "seat">("section");

  useEffect(() => {
    if (!simId) return;
    getSeats(simId).then((d) => { setSections(d); setLoading(false); });
  }, [simId]);

  const selected = useMemo(() => sections.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);
  const byArea = useMemo(() => {
    const g: Record<Section["area"], Section[]> = { outfield: [], third: [], field: [], first: [], home: [] };
    sections.forEach((s) => g[s.area].push(s));
    return g;
  }, [sections]);

  async function handleSeatConfirm(row: number, seatNumber: number) {
    if (!simId || selectedId == null || !selected || submitting) return;
    setSubmitting(true);
    try {
      await selectSeat(simId, selectedId);
      setSelectedSeat({ id: selected.id, name: selected.name, grade: selected.grade, price: selected.price, row, seatNumber });
      onConfirmed();
    } catch (e) {
      if (e instanceof ApiError && e.code === "SEAT_SOLD_OUT") {
        setAlts(e.alternatives ?? []);
        setStep("section");
      } else {
        alert("좌석 선택에 실패했어요. 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">좌석 정보를 불러오는 중…</div>;

  if (step === "seat" && selected && simId) {
    return (
      <>
        <SeatPicker
          simId={simId}
          section={selected}
          onSelect={handleSeatConfirm}
          onBack={() => setStep("section")}
          submitting={submitting}
        />
        {alts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-base font-bold">앗, 방금 매진됐어요 😢</h3>
              <p className="mt-1 text-sm text-gray-600">대신 이 구역은 어떠세요?</p>
              <div className="mt-3 space-y-2">
                {alts.map((a) => {
                  const price = sections.find((s) => s.id === a.sectionId)?.price;
                  return (
                    <button key={a.sectionId} onClick={() => { setSelectedId(a.sectionId); setAlts(null); }}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 hover:border-red-500 hover:bg-red-50">
                      <span className="text-sm font-medium">{a.name}</span>
                      {price != null && <span className="text-xs text-gray-600">{price.toLocaleString("ko-KR")}원</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setAlts(null)} className="mt-4 w-full rounded-lg bg-gray-100 py-2 text-sm text-gray-600">다시 고를게요</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">좌석을 선택하세요</h2>
      <p className="text-sm text-gray-500 mb-1">색이 진할수록 인기 구역 · 매진은 선택 불가</p>

      <StadiumSVG sections={sections} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
        <div className="text-sm">
          {selected ? (
            <><span className="font-semibold">{selected.name}</span><span className="ml-2 text-gray-600">{won(selected.price)}</span></>
          ) : <span className="text-gray-400">구역을 선택해 주세요</span>}
        </div>
        <button onClick={() => setStep("seat")} disabled={selectedId == null}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-300">
          좌석 선택하기 →
        </button>
      </div>

      {alts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold">앗, 방금 매진됐어요 😢</h3>
            <p className="mt-1 text-sm text-gray-600">대신 이 구역은 어떠세요?</p>
            <div className="mt-3 space-y-2">
              {alts.map((a) => {
                // 백엔드 alternatives엔 가격이 없어서, 이미 받아둔 sections에서 가격 조회
                const price = sections.find((s) => s.id === a.sectionId)?.price;
                return (
                  <button key={a.sectionId} onClick={() => { setSelectedId(a.sectionId); setAlts(null); }}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 hover:border-red-500 hover:bg-red-50">
                    <span className="text-sm font-medium">{a.name}</span>
                    {price != null && <span className="text-xs text-gray-600">{won(price)}</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setAlts(null)} className="mt-4 w-full rounded-lg bg-gray-100 py-2 text-sm text-gray-600">다시 고를게요</button>
          </div>
        </div>
      )}
    </div>
  );
}
