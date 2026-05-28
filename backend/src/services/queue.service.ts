// backend/src/services/queue.service.ts
const DECAY_RATE = { 입문: 400, 실전: 130, 지옥: 65 } as const; // 명/초
const INITIAL_POSITION = 5824;

export type Difficulty = keyof typeof DECAY_RATE;

export interface QueueStatus {
  currentPosition: number;
  initialPosition: number;
  totalInQueue: number;        // FE에서 "5824명 중 X등" 표시용
  estimatedWaitMs: number;
  ready: boolean;              // true면 캡차 단계로
  elapsedSec: number;
}

export function getQueuePosition(
  queueEnteredAt: Date | string,
  difficulty: Difficulty,
): QueueStatus {
  const start = new Date(queueEnteredAt).getTime();
  const elapsedSec = (Date.now() - start) / 1000;
  const rate = DECAY_RATE[difficulty];

  const current = Math.max(0, INITIAL_POSITION - elapsedSec * rate);
  const currentPosition = Math.floor(current);

  return {
    currentPosition,
    initialPosition: INITIAL_POSITION,
    totalInQueue: INITIAL_POSITION,
    estimatedWaitMs: Math.round((currentPosition / rate) * 1000),
    ready: current <= 0,
    elapsedSec: Math.floor(elapsedSec),
  };
}