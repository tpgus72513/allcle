// 대기열 시뮬레이션 로직 — Redis/Bull 없이 결정론적으로 계산한다.
// 핵심 아이디어: 시작 위치와 난이도별 감소 속도가 정해져 있으므로,
// "경과 시간"만 알면 현재 대기 위치를 매번 역산할 수 있다.
// → 서버가 상태를 들고 있을 필요가 적고, polling만으로 충분하다.

import type { Difficulty } from '../types';

// 난이도별 1초당 줄어드는 대기 인원
const DRAIN_RATE_PER_SEC: Record<Difficulty, number> = {
  입문: 500,
  실전: 250,
  지옥: 100,
};

// 난이도별 시작 대기 인원
const START_POSITION: Record<Difficulty, number> = {
  입문: 1200,
  실전: 3500,
  지옥: 8000,
};

// 시뮬레이션 시작 시 부여할 시작 위치 + 예상 대기 시간(ms)
export function getStartPosition(difficulty: Difficulty) {
  const total = START_POSITION[difficulty];
  const drainPerSec = DRAIN_RATE_PER_SEC[difficulty];
  const estimatedWaitMs = Math.ceil(total / drainPerSec) * 1000;
  return { queuePosition: total, estimatedWaitMs };
}

// 시작 시각(startedAt)과 현재 시각으로 현재 대기 위치 계산
export function calculateQueuePosition(
  difficulty: Difficulty,
  startedAt: number,
  now: number = Date.now()
) {
  const elapsedSec = (now - startedAt) / 1000;
  const drained = Math.floor(elapsedSec * DRAIN_RATE_PER_SEC[difficulty]);
  const currentPosition = Math.max(0, START_POSITION[difficulty] - drained);
  return {
    currentPosition,
    totalAhead: currentPosition,
    ready: currentPosition === 0,
  };
}
