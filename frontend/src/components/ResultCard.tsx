// src/components/ResultCard.tsx  [FE-2 담당]
// ─────────────────────────────────────────────────────────────
// 결과 공유 카드 (바이럴 핵심).
//  - Sprint 1: 점수·순위·등급·소요시간 표시하는 "골격"
//  - Sprint 4(Sprint 2): html2canvas로 이미지 export (아래 onShare)
//
// ⚠️ 결과 카드에 넣을 내용은 기획 미확정 항목.
//    여기선 [점수·순위·좌석등급·소요시간] 4종으로 선제안. 확정 후 조정.
// ─────────────────────────────────────────────────────────────
"use client";

import { useRef } from "react";
import type { SimResult } from "../lib/types";

export default function ResultCard({ result, nickname }: { result: SimResult; nickname: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  // [Sprint 2] html2canvas로 카드를 이미지로 뽑아 다운로드/공유.
  // 설치 필요: npm i html2canvas
  async function onShare() {
    if (!cardRef.current) return;
    const { default: html2canvas } = await import("html2canvas"); // SSR 회피용 동적 import
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `allcle_${nickname}.png`;
    a.click();
  }

  const sec = Math.round(result.elapsedMs / 1000);

  return (
    <div className="space-y-4">
      {/* 캡처 대상 카드 */}
      <div ref={cardRef} className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-800 p-6 text-white shadow-lg">
        <p className="text-xs opacity-80">allcle 티켓팅 결과</p>
        <p className="mt-1 text-lg font-bold">{nickname}</p>

        <div className="mt-4">
          <p className="text-xs opacity-80">점수</p>
          <p className="text-5xl font-extrabold tabular-nums">{result.score.toLocaleString("ko-KR")}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/15 py-2">
            <p className="text-[10px] opacity-80">순위</p>
            <p className="text-sm font-bold">{result.rank ? `${result.rank}위` : "—"}</p>
          </div>
          <div className="rounded-lg bg-white/15 py-2">
            <p className="text-[10px] opacity-80">좌석</p>
            <p className="text-sm font-bold">{result.grade}</p>
          </div>
          <div className="rounded-lg bg-white/15 py-2">
            <p className="text-[10px] opacity-80">소요</p>
            <p className="text-sm font-bold">{sec}초</p>
          </div>
        </div>
      </div>

      <button onClick={onShare} className="w-full rounded-lg bg-gray-900 py-3 font-bold text-white">
        결과 이미지 저장 / 공유
      </button>
    </div>
  );
}
