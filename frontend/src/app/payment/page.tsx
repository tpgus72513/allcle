// src/app/payment/page.tsx — 결제  [FE-2 담당]
// ─────────────────────────────────────────────────────────────
//  - 진입 시 startPayment 호출 (BE: 결제 페이지 머문 시간이 점수에 반영됨)
//  - 3분 카운트다운 (타이머 길이는 기획 미확정 → PAY_SECONDS 상수로 빼둠)
//  - "결제하기" → completeSimulation(채점) → score를 store에 → 결과로
//  - 시간 만료 → 결과로(실패 처리). 채점은 BE가 함.
// ─────────────────────────────────────────────────────────────
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startPayment, completeSimulation } from "../../lib/services";
import { useFlowStore } from "../../store/useFlowStore";

const PAY_SECONDS = 180; // ⏱ 3분. 기획 확정되면 이 숫자만 바꾸면 됨.

export default function PaymentPage() {
  const router = useRouter();
  const { simId, selectedSeat, setScore } = useFlowStore();
  const [left, setLeft] = useState(PAY_SECONDS);
  const [paying, setPaying] = useState(false);
  const done = useRef(false); // 중복 complete 방지

  // 진입 가드 + payment/start
  useEffect(() => {
    if (!simId || !selectedSeat) { router.replace("/"); return; }
    startPayment(simId);
  }, [simId, selectedSeat, router]);

  // 카운트다운
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const finish = useCallback(async () => {
    if (!simId || done.current) return;
    done.current = true;
    setPaying(true);
    try {
      const { score } = await completeSimulation(simId);
      setScore(score);
    } catch {
      setScore(0);
    } finally {
      router.push("/result");
    }
  }, [simId, setScore, router]);

  // 만료 → 결과로 (BE가 시간초과를 점수에 반영)
  useEffect(() => {
    if (left <= 0 && !done.current) finish();
  }, [left, finish]);

  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, "0");
  const ss = String(Math.max(0, left % 60)).padStart(2, "0");
  const danger = left <= 30;

  return (
    <main className="flex min-h-screen flex-col p-6">
      <h1 className="text-xl font-bold">결제</h1>

      <div className={`mt-6 rounded-xl border p-4 text-center ${danger ? "border-red-500 bg-red-50" : "border-gray-200"}`}>
        <p className="text-xs text-gray-500">결제 제한 시간</p>
        <p className={`mt-1 text-4xl font-extrabold tabular-nums ${danger ? "text-red-600" : ""}`}>{mm}:{ss}</p>
      </div>

      {selectedSeat && (
        <div className="mt-6 rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm"><span className="text-gray-500">구역</span><span className="font-semibold">{selectedSeat.name} ({selectedSeat.grade})</span></div>
          <div className="mt-1 flex justify-between text-sm"><span className="text-gray-500">좌석</span><span className="font-semibold">{selectedSeat.row}열 {selectedSeat.seatNumber}번</span></div>
          <div className="mt-1 flex justify-between text-sm"><span className="text-gray-500">금액</span><span className="font-semibold">{selectedSeat.price.toLocaleString("ko-KR")}원</span></div>
        </div>
      )}

      <button onClick={finish} disabled={paying || left <= 0}
        className="mt-auto rounded-lg bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:bg-gray-300">
        {paying ? "결제 중…" : "결제하기"}
      </button>
    </main>
  );
}
