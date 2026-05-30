'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import type { Team } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<'nickname' | 'team'>('nickname');
  const [nickname, setNickname] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleNicknameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { userId, token } = await api.auth.anonymous(nickname.trim());
      localStorage.setItem('userId', userId);
      localStorage.setItem('token', token);
      localStorage.setItem('nickname', nickname.trim());
      const teamList = await api.teams.list();
      setTeams(teamList);
      setStep('team');
    } catch {
      setError('서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }

  function handleTeamSelect(teamId: number) {
    router.push(`/matches?teamId=${teamId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <div className="mb-2 text-6xl">⚾</div>
        <h1 className="text-3xl font-bold text-amber-400">allcle</h1>
        <p className="mt-1 text-slate-300">야구 티켓팅 실전 훈련 시뮬레이터</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'nickname' && (
          <motion.div
            key="nickname"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
              <h2 className="mb-6 text-center text-xl font-semibold text-white">
                닉네임을 입력해주세요
              </h2>
              <form onSubmit={handleNicknameSubmit} className="space-y-4">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 광클요정"
                  maxLength={20}
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-center text-lg text-white outline-none placeholder:text-slate-400 focus:border-amber-400"
                />
                {error && (
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !nickname.trim()}
                  className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-50"
                >
                  {loading ? '연결 중...' : '시작하기'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {step === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl"
          >
            <h2 className="mb-6 text-center text-xl font-semibold text-white">
              응원하는 팀을 선택하세요
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {teams.map((team) => (
                <motion.button
                  key={team.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleTeamSelect(team.id)}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-500 hover:bg-slate-700"
                >
                  <div
                    className="mb-2 h-5 w-5 rounded-full ring-2 ring-white/20"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-center text-sm font-semibold leading-tight text-white">
                    {team.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
