// src/app/result/page.tsx — 결과 [FE-2 완성]
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFlowStore } from "../../store/useFlowStore";
import ResultCard from "../../components/ResultCard";
import { getResult } from "../../lib/services";
import type { SimResult } from "../../lib/types";

export default function ResultPage() {
  const router = useRouter();
  const { simId, selectedSeat, nickname, score, reset } = useFlowStore();
  const [result, setResult] = useState<SimResult | null>(null);

  useEffect(() => {
    if (!simId || score == null || !selectedSeat) {
      router.replace("/");
      return;
    }
    getResult(simId, selectedSeat.id).then(setResult);
  }, [simId, score, selectedSeat, router]);

  if (!result) return (
    <div className="flex min-h-screen items-center justify-center text-gray-500">
      결과 불러오는 중…
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col p-6">
      <h1 className="mb-6 text-xl font-bold">티켓팅 결과</h1>
      <ResultCard result={result} nickname={nickname} />
      <button
        onClick={() => { reset(); router.push("/"); }}
        className="mt-6 rounded-lg border border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50"
      >
        처음으로
      </button>
    </main>
  );
}
