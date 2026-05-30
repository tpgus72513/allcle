'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import type { Match } from '@/types';

const DIFFICULTY_STYLE: Record<string, string> = {
  입문: 'bg-green-500/20 text-green-300 border border-green-500/40',
  실전: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  지옥: 'bg-red-500/20 text-red-300 border border-red-500/40',
};

function MatchesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const teamId = Number(params.get('teamId'));

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teamId) { router.replace('/'); return; }
    api.matches
      .list(teamId)
      .then(setMatches)
      .catch(() => setError('경기 목록을 불러올 수 없어요.'))
      .finally(() => setLoading(false));
  }, [teamId, router]);

  async function handleMatchSelect(match: Match) {
    setStarting(match.matchId);
    try {
      const { simulationId } = await api.simulation.start(match.matchId);
      localStorage.setItem('simId', simulationId);
      localStorage.setItem('matchId', String(match.matchId));
      router.push(`/queue?simId=${simulationId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '시뮬레이션을 시작할 수 없어요.');
      setStarting(null);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-300">경기 목록 불러오는 중...</div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm font-medium text-slate-300 hover:text-white"
        >
          ← 팀 선택으로
        </button>
        <h1 className="text-2xl font-bold text-white">경기 선택</h1>
        <p className="mt-1 text-slate-300">예매할 경기를 고르세요</p>
      </motion.div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </p>
      )}

      {matches.length === 0 && !error && (
        <p className="text-slate-300">해당 팀의 예매 가능한 경기가 없어요.</p>
      )}

      <div className="space-y-3">
        {matches.map((match, i) => (
          <motion.button
            key={match.matchId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={starting !== null}
            onClick={() => handleMatchSelect(match)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-left transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-60"
          >
            <div>
              <p className="font-semibold text-white">
                {match.home.short_name} vs {match.away.short_name}
              </p>
              <p className="mt-0.5 text-sm text-slate-300">
                {formatDate(match.matchDate)}
                {match.stadium ? ` · ${match.stadium}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLE[match.difficulty] ?? 'bg-slate-600/40 text-slate-300'}`}
              >
                {match.difficulty}
              </span>
              {starting === match.matchId && (
                <span className="text-sm text-amber-400">시작 중...</span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </main>
  );
}

export default function MatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-300">
          로딩 중...
        </div>
      }
    >
      <MatchesContent />
    </Suspense>
  );
}
