'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

function QueueContent() {
  const router = useRouter();
  const params = useSearchParams();
  const simId = params.get('simId') ?? '';

  const [position, setPosition] = useState<number | null>(null);
  const [initialPosition, setInitialPosition] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!simId) { router.replace('/'); return; }

    async function poll() {
      try {
        const status = await api.simulation.queue(simId);
        setPosition(status.currentPosition);
        if (initialPosition === null) setInitialPosition(status.initialPosition);
        if (status.ready) {
          setReady(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => router.push(`/captcha?simId=${simId}`), 1200);
        }
      } catch {
        setError('대기열 상태를 불러올 수 없어요.');
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId]);

  const progress =
    initialPosition && position !== null
      ? Math.max(0, Math.min(100, ((initialPosition - position) / initialPosition) * 100))
      : 0;

  const enteredCount = initialPosition !== null && position !== null
    ? initialPosition - position
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {ready ? (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mb-4 text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-amber-400">입장 준비 완료!</h2>
            <p className="mt-2 text-slate-300">잠시 후 CAPTCHA로 이동합니다...</p>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-sm text-center"
          >
            <div className="mb-8 text-5xl">⏳</div>
            <h1 className="mb-2 text-2xl font-bold text-white">대기열 입장 중</h1>
            <p className="mb-8 text-slate-300">잠시만 기다려주세요</p>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
                {error}
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-end justify-center gap-1">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={position}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="text-6xl font-bold tabular-nums text-amber-400"
                    >
                      {position !== null ? position.toLocaleString() : '—'}
                    </motion.span>
                  </AnimatePresence>
                  <span className="mb-2 text-slate-300">번째</span>
                </div>

                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-700">
                  <motion.div
                    className="h-full rounded-full bg-amber-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.8 }}
                  />
                </div>

                <p className="text-sm text-slate-300">
                  {enteredCount !== null
                    ? `${enteredCount.toLocaleString()}명 입장 완료`
                    : '대기열 확인 중...'}
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-300">
          로딩 중...
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
