/**
 * scoring.service.ts
 *
 * 시뮬 결과 점수를 계산하는 순수 함수 모음.
 *
 * 분리 이유 (학습 포인트):
 *  - 점수 공식은 "튜닝"의 대상이라 자주 바뀜. 라우터에 인라인으로 박으면
 *    공식 변경할 때마다 HTTP 핸들러를 건드려야 해서 위험.
 *  - 순수 함수라 단위 테스트가 쉬움. 입력(times, mistakes, difficulty)만
 *    바꿔가며 결과를 비교하면 됨. DB도 mock 안 필요.
 *  - 게임/시뮬 분야에서 "점수 공식 = 게임의 코어 밸런스"라 별도 모듈로
 *    독립시키는 게 정석.
 */

export type Difficulty = '입문' | '실전' | '지옥' | 'EASY' | 'NORMAL' | 'HARD';

export interface ScoreInput {
  /** captcha 발급~제출까지 걸린 시간 */
  captchaTimeMs: number;
  /** captcha 통과~좌석 선택까지 걸린 시간 */
  seatSelectTimeMs: number;
  /** 좌석 선택~결제 완료까지 걸린 시간 (payment_started_at 있으면 그 시점부터, 없으면 좌석 선택부터) */
  paymentTimeMs: number;
  /** captcha 오답 횟수 */
  mistakeCount: number;
  /** 매치 난이도 */
  difficulty: string;
}

export interface ScoreBreakdown {
  /** 최종 점수 (0 이상 정수) */
  score: number;
  /** 미세 분해 — 디버깅/UI 표시용 */
  parts: {
    base: number;
    captchaBonus: number;
    seatBonus: number;
    paymentBonus: number;
    mistakePenalty: number;
    raw: number;              // base + bonus - penalty (multiplier 적용 전)
    difficultyMultiplier: number;
  };
  /** 총 소요 시간 (captcha + seat + payment) */
  totalTimeMs: number;
  /** 최종 성공 판정 (점수 > 0) */
  success: boolean;
}

// ─────────── 튜닝 상수 ───────────
//
// 단계별 보너스의 의미:
//  - captcha 5초면 만점 2000  (사람이 정상적으로 풀면 5~15초)
//  - 좌석   10초면 만점 2000  (섹션 보고 결정)
//  - 결제   7.5초면 만점 1000 (카드번호 입력)
//
// 단계당 보너스를 다르게 둔 이유: captcha와 좌석 선택은 "시뮬의 핵심 도전"
// 이고, 결제는 부가적이라 비중을 낮춤. 진짜 티켓팅의 긴장감과 일치.

const BASE_SCORE = 5000;

const CAPTCHA_MAX_BONUS = 2000;
const CAPTCHA_DIVISOR = 5;   // captcha_time_ms / 5 만큼 차감

const SEAT_MAX_BONUS = 2000;
const SEAT_DIVISOR = 10;

const PAYMENT_MAX_BONUS = 1000;
const PAYMENT_DIVISOR = 15;

const MISTAKE_PENALTY_EACH = 500;

const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  입문: 1.0,
  EASY: 1.0,
  실전: 1.3,
  NORMAL: 1.3,
  지옥: 1.6,
  HARD: 1.6,
};

const SCORE_MIN = 0;
const SCORE_MAX = 99999;

/**
 * 점수 계산 본체.
 *
 * 공식 (말로 풀면):
 *  1) 기본 5000점에서 시작
 *  2) 각 단계 보너스를 더함. 빠르면 만점, 느리면 0까지 깎임.
 *  3) 미스 횟수만큼 페널티를 뺌.
 *  4) 난이도 배수를 곱함.
 *  5) [0, 99999] 범위로 클램프하고 정수로 반올림.
 */
export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const captchaBonus = bonus(input.captchaTimeMs, CAPTCHA_MAX_BONUS, CAPTCHA_DIVISOR);
  const seatBonus = bonus(input.seatSelectTimeMs, SEAT_MAX_BONUS, SEAT_DIVISOR);
  const paymentBonus = bonus(input.paymentTimeMs, PAYMENT_MAX_BONUS, PAYMENT_DIVISOR);
  const mistakePenalty = Math.max(0, input.mistakeCount) * MISTAKE_PENALTY_EACH;

  const raw = BASE_SCORE + captchaBonus + seatBonus + paymentBonus - mistakePenalty;
  const multiplier = DIFFICULTY_MULTIPLIER[input.difficulty] ?? 1.3;
  const scaled = Math.round(raw * multiplier);
  const score = clamp(scaled, SCORE_MIN, SCORE_MAX);

  const totalTimeMs = input.captchaTimeMs + input.seatSelectTimeMs + input.paymentTimeMs;

  return {
    score,
    parts: {
      base: BASE_SCORE,
      captchaBonus,
      seatBonus,
      paymentBonus,
      mistakePenalty,
      raw,
      difficultyMultiplier: multiplier,
    },
    totalTimeMs,
    success: score > 0,
  };
}

// ─────────── 내부 헬퍼 ───────────

/**
 * 시간 기반 보너스.
 *   bonus = max(0, maxBonus - elapsedMs / divisor)
 *
 * 예: maxBonus=2000, divisor=5 → 시간이 0ms면 2000, 10000ms(=10초)면 0.
 */
function bonus(elapsedMs: number, maxBonus: number, divisor: number): number {
  if (elapsedMs < 0) elapsedMs = 0;
  const b = maxBonus - elapsedMs / divisor;
  return Math.max(0, Math.round(b));
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
