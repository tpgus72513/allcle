// src/app/match/page.tsx — 경기 선택 [FE-1 골격]
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMatches, startSimulation } from "../../lib/services";
import { useFlowStore } from "../../store/useFlowStore";
import type { Match } from "../../lib/types";

export default function MatchPage() {
  const router = useRouter();
  const { team, setMatch, setSimId } = useFlowStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) { router.replace("/"); return; }
    getMatches(team.id).then((m) => { setMatches(m); setLoading(false); });
  }, [team, router]);

  async function handleSelect(m: Match) {
    setMatch(m);
    const { simId } = await startSimulation(m.id);
    setSimId(simId);
    router.push("/queue");
  }

  if (loading) return <div className="p-8 text-center text-gray-500">경기 목록 불러오는 중…</div>;

  return (
    <main className="flex min-h-screen flex-col p-6">
      <h1 className="text-xl font-bold">경기를 선택하세요</h1>
      {/* TODO FE-1: 디자인·카피 채우기 */}
      <div className="mt-4 space-y-3">
        {matches.map((m) => (
          <button key={m.id} onClick={() => handleSelect(m)}
            className="w-full rounded-xl border border-gray-200 p-4 text-left hover:border-red-400">
            <p className="font-semibold">{m.homeName} vs {m.awayName}</p>
            <p className="text-sm text-gray-500">난이도 {m.difficulty} · {m.stadiumName ?? ""}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
