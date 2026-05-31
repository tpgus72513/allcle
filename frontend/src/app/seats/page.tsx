// src/app/seat/page.tsx — 좌석 선택 [FE-2 완성]
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlowStore } from "../../store/useFlowStore";
import SeatMap from "../../components/SeatMap";

export default function SeatPage() {
  const router = useRouter();
  const { simId } = useFlowStore();

  useEffect(() => {
    if (!simId) router.replace("/");
  }, [simId, router]);

  if (!simId) return null;

  return (
    <main className="min-h-screen bg-white">
      <SeatMap onConfirmed={() => router.push("/payment")} />
    </main>
  );
}
