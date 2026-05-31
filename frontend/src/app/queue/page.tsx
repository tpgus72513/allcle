// src/app/queue/page.tsx — 대기열 [FE-1 골격]
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getQueue } from "../../lib/services";
import { useFlowStore } from "../../store/useFlowStore";

export default function QueuePage() {
  const router = useRouter();
  const { simId } = useFlowStore();
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    if (!simId) { router.replace("/"); return; }

    const poll = setInterval(async () => {
      const status = await getQueue(simId);
      setPosition(status.currentPosition);
      if (status.ready) {
        clearInterval(poll);
        router.push("/captcha");
      }
    }, 1000);

    return () => clearInterval(poll);
  }, [simId, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">대기 중…</h1>
      {/* TODO FE-1: 디자인·애니메이션 채우기 */}
      {position !== null && (
        <p className="text-4xl font-extrabold text-red-600 tabular-nums">{position}번째</p>
      )}
      <p className="text-sm text-gray-500">잠시만 기다려 주세요</p>
    </main>
  );
}
