'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';

interface CaptchaState {
  captchaId: string;
  captchaText: string;
  ttlMs: number;
  issuedAt: string;
}

function CaptchaContent() {
  const router = useRouter();
  const params = useSearchParams();
  const simId = params.get('simId') ?? '';

  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!simId) { router.replace('/'); return; }
    issueCaptcha();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId]);

  async function issueCaptcha() {
    setLoading(true);
    setError('');
    try {
      const issued = await api.simulation.issueCaptcha(simId);
      setCaptcha(issued);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CAPTCHA를 불러올 수 없어요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captcha || !input.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.simulation.submitCaptcha(simId, captcha.captchaId, input.trim());
      if (result.passed) {
        router.push(`/seats?simId=${simId}`);
      } else {
        setMistakes(result.mistakes);
        setShake(true);
        setError(`틀렸어요! (${result.mistakes}회 실수)`);
        setTimeout(() => setShake(false), 500);
        if (result.nextCaptcha) {
          setCaptcha({
            captchaId: result.nextCaptcha.captchaId,
            captchaText: result.nextCaptcha.captchaText,
            ttlMs: result.nextCaptcha.ttlMs,
            issuedAt: new Date().toISOString(),
          });
          setInput('');
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '제출 실패';
      if (msg.includes('CAPTCHA_EXPIRED') || msg.includes('만료')) {
        setError('캡차가 만료됐어요. 새로 발급할게요.');
        await issueCaptcha();
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-300">CAPTCHA 준비 중...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🤖</div>
          <h1 className="text-2xl font-bold text-white">CAPTCHA 인증</h1>
          <p className="mt-1 text-slate-300">아래 코드를 빠르게 입력하세요!</p>
          {mistakes > 0 && (
            <p className="mt-1 text-sm font-medium text-orange-400">실수 {mistakes}회</p>
          )}
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-slate-600 bg-slate-800 p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              보안 코드
            </span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              ))}
            </div>
          </div>

          <motion.div
            animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative select-none text-center"
          >
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-around opacity-20">
              <div className="h-px bg-slate-300" style={{ transform: 'rotate(-1deg)' }} />
              <div className="h-px bg-slate-300" style={{ transform: 'rotate(0.5deg)' }} />
            </div>
            <span
              className="font-mono text-4xl font-black tracking-[0.3em] text-amber-400"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
            >
              {captcha?.captchaText ?? '----'}
            </span>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            placeholder="코드 입력"
            className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-center font-mono text-xl tracking-widest text-white outline-none placeholder:text-slate-400 placeholder:tracking-normal focus:border-amber-400"
          />

          {error && (
            <p className="text-center text-sm font-medium text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={!input.trim() || submitting}
            className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {submitting ? '인증 중...' : '확인'}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

export default function CaptchaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-300">
          로딩 중...
        </div>
      }
    >
      <CaptchaContent />
    </Suspense>
  );
}
