/**
 * seatAvailability.service.ts
 *
 * "어떤 섹션이 매진됐는가?"를 결정하는 도메인 로직.
 *
 * 핵심 아이디어 — 결정론적 가짜 매진(deterministic fake sold-out):
 *  - 시뮬 시작 시점에 sold_out_seed라는 정수를 한 번만 박아두고,
 *  - 이후 매진 여부는 (seed, sectionId, popularity, difficulty)를 입력으로
 *    "항상 같은 결과"를 내는 순수 함수로 계산.
 *  - 클라이언트가 새로고침을 해도, 다른 기기에서 같은 시뮬을 봐도
 *    매진 패턴이 동일 → UX 일관성.
 *
 * 왜 이게 정석적이냐:
 *  - DB에 "매진 섹션 목록"을 펼쳐 저장하면 룰 변경 때마다 마이그레이션이 필요.
 *  - seed만 저장하고 룰은 코드 한 곳에 두면, 룰 튜닝이 코드 수정만으로 끝남.
 *  - "결정론적 + 시드 의존" 패턴은 게임/시뮬레이션 분야의 표준 — Minecraft의
 *    월드 시드, A/B 테스트의 사용자별 분배 시드 등도 같은 원리.
 *
 * 비순수 함수(Math.random 같은)를 절대 쓰지 않는 이유:
 *  - 호출할 때마다 결과가 바뀌면 같은 시뮬을 두 번 조회했을 때 매진 패턴이
 *    달라지는 비일관성 발생.
 */

import { createHash } from 'node:crypto';

// DB의 difficulty enum 값은 한국어 '입문' | '실전' | '지옥'.
// (sprint1-final/backend/src/routes/matches.routes.ts의 zod enum 참고)
// 영문 키도 같이 받아두면 나중에 i18n할 때 편함.
export type Difficulty = '입문' | '실전' | '지옥' | 'EASY' | 'NORMAL' | 'HARD';

/**
 * 난이도별 기본 매진 강도(base sold-out factor).
 * popularity_normalized([0, 1])와 함께 최종 매진 임계값을 만듦.
 *
 * 최종 공식:
 *   threshold = base(난이도) + popularity_normalized * 0.4
 *   isSoldOut = noise < threshold     (noise ∈ [0, 1))
 *
 * 값의 직관 (popularity는 DB에서 1~5):
 *  - 입문 + pop 1 (0.2) → threshold 0.28 → 매진률 ≈ 28%
 *  - 입문 + pop 5 (1.0) → threshold 0.60 → 매진률 ≈ 60%
 *  - 지옥 + pop 1 (0.2) → threshold 0.48 → 매진률 ≈ 48%
 *  - 지옥 + pop 5 (1.0) → threshold 0.80 → 매진률 ≈ 80%
 *
 * "지옥 + 인기 5" 라도 100% 매진은 안 됨 → 항상 alt 후보가 존재.
 */
const DIFFICULTY_BASE: Record<string, number> = {
  입문: 0.2,
  EASY: 0.2,
  실전: 0.3,
  NORMAL: 0.3,
  지옥: 0.4,
  HARD: 0.4,
};

/** popularity 스케일의 최댓값. DB 값이 1~5 정수임을 반영. */
const POPULARITY_MAX = 5;

export interface SectionAvailabilityInput {
  /** simulations.sold_out_seed */
  seed: number;
  /** sections.id */
  sectionId: number;
  /** sections.popularity. DB는 1~5 정수. 함수 내부에서 정규화함. */
  popularity: number;
  /** matches.difficulty */
  difficulty: string;
}

export interface SectionAvailability {
  sectionId: number;
  isSoldOut: boolean;
  /** UI 표시용 — 0.0(여유) ~ 1.0(꽉참) */
  soldOutScore: number;
}

/**
 * 한 섹션이 매진됐는지 판정.
 *
 * 알고리즘:
 *  1) seed와 sectionId를 합쳐 sha256 해시 → 앞 8바이트만 떼서 [0, 1) 부동소수로 정규화.
 *     (Math.random() 대신 결정론적 해시를 쓰는 게 핵심)
 *  2) 매진 임계값 = base(난이도) + popularity * 0.5
 *  3) noise < 임계값 이면 매진.
 *
 * 학습 포인트 — 왜 해시?
 *  seed는 시뮬 전체에 하나뿐인데, 섹션마다 다른 결과가 나와야 함.
 *  단순히 (seed + sectionId)를 쓰면 sectionId가 1만 다르면 결과도 1만 차이라
 *  인접 섹션이 같이 매진되는 패턴이 보임. 해시를 통과시키면 작은 입력 차이가
 *  큰 출력 차이로 퍼져서(avalanche effect) 패턴이 보이지 않게 됨.
 */
export function evaluateSection(input: SectionAvailabilityInput): SectionAvailability {
  const noise = deterministicNoise(input.seed, input.sectionId);
  const base = DIFFICULTY_BASE[input.difficulty] ?? 0.3;
  const popularityNormalized = clamp01(input.popularity / POPULARITY_MAX);
  const threshold = Math.min(1, base + popularityNormalized * 0.4);

  return {
    sectionId: input.sectionId,
    isSoldOut: noise < threshold,
    // UI에서 "혼잡도 게이지" 같은 걸 그리고 싶을 때 쓸 값.
    // threshold에 가까울수록 만석에 가까움.
    soldOutScore: round2(threshold),
  };
}

/**
 * 여러 섹션을 한 번에 평가. 라우터에선 GET /seats에서 이 함수 한 번만 호출.
 */
export function evaluateSections(
  seed: number,
  difficulty: string,
  sections: Array<{ id: number; popularity: number }>,
): SectionAvailability[] {
  return sections.map((s) =>
    evaluateSection({
      seed,
      sectionId: s.id,
      popularity: s.popularity,
      difficulty,
    }),
  );
}

// ─────────────── 내부 헬퍼 ───────────────

/**
 * (seed, sectionId) → [0, 1) 부동소수.
 *
 * sha256(seed:sectionId)의 앞 8바이트(uint64)를 2^64로 나눠 정규화.
 * 결정론적이라 같은 입력이면 항상 같은 출력.
 */
function deterministicNoise(seed: number, sectionId: number): number {
  const hash = createHash('sha256').update(`${seed}:${sectionId}`).digest();
  // 앞 8바이트만 사용. BigInt로 다뤄야 정밀도 손실 없음.
  const big = hash.readBigUInt64BE(0);
  // 2^53 - 1로 모듈로해서 안전한 Number 범위로 끌어옴 후 정규화.
  // (BigInt를 직접 Number()로 캐스팅하면 53비트 넘는 부분이 잘림 — 의도된 동작)
  const safe = Number(big % BigInt(Number.MAX_SAFE_INTEGER));
  return safe / Number.MAX_SAFE_INTEGER;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
