// src/app/captcha/page.tsx — CAPTCHA  [FE-1 담당 · 골격]
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFlowStore } from "../../store/useFlowStore";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  return Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export default function CaptchaPage() {
  const router = useRouter();
  const { simId } = useFlowStore();
  const [code, setCode] = useState(makeCode);
  const [val, setVal] = useState("");

  function submit() {
    if (!simId) { router.replace("/"); return; }
    router.push("/seats");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-gray-500">아래 문자를 입력하세요 (봇 차단)</p>
      <div className="select-none rounded-lg bg-gray-200 px-8 py-4 text-2xl font-bold italic tracking-widest line-through">
        {code}
      </div>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-center"
        placeholder="입력"
      />
      <button onClick={submit} className="rounded-lg bg-red-600 px-6 py-2 font-bold text-white">
        확인
      </button>
      <button onClick={() => { setCode(makeCode()); setVal(""); }} className="text-xs text-gray-400 underline">
        새로 생성
      </button>
    </main>
  );
}
