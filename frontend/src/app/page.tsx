// src/app/page.tsx — 홈/로그인  [FE-1 담당 · 골격]
// 닉네임 입력 → 세션 생성(createAnonymous) → 팀 목록 → 선택 시 경기선택으로.
// FE-1이 디자인/카피 채우면 됨. 지금은 플로우가 끊기지 않을 최소 골격.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAnonymous, getTeams } from "../lib/services";
import { useFlowStore } from "../store/useFlowStore";
import type { Team } from "../lib/types";

export default function HomePage() {
  const router = useRouter();
  const { setNickname, setTeam } = useFlowStore();
  const [nick, setNick] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [started, setStarted] = useState(false);

  async function start() {
    if (!nick.trim()) return;
    await createAnonymous(nick.trim());
    setNickname(nick.trim());
    setTeams(await getTeams());
    setStarted(true);
  }

  function pick(t: Team) {
    setTeam(t);
    router.push("/matches");
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-extrabold">⚾ allcle</h1>
      <p className="text-sm text-gray-500">좌석 사수를 연습하라</p>

      {!started ? (
        <div className="mt-8 space-y-3">
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="닉네임"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <button onClick={start} className="w-full rounded-lg bg-red-600 py-2 font-bold text-white">
            시작하기
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-2">
          <p className="text-sm font-semibold">응원 팀 선택</p>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t)}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-3 py-3 text-left hover:border-gray-400"
            >
              <span className="h-4 w-4 rounded-full" style={{ background: t.color }} />
              <span className="font-medium">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
