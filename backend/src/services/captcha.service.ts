/**
 * captcha.service.ts
 *
 * CAPTCHA의 도메인 로직을 라우터에서 분리해둔 모듈.
 * 라우터(routes/simulation.routes.ts)는 HTTP 입출력 + DB 호출만 담당하고,
 * "정답을 어떻게 만들지·어떻게 검증할지" 는 여기로 위임.
 *
 * 분리 이유 (학습 포인트):
 *  1) 라우터에 비즈니스 로직이 섞이면 테스트가 어려움. 이 모듈은 순수 함수라
 *     captcha.service.test.ts에서 fetch 없이도 단위 테스트 가능.
 *  2) 나중에 실제 hCaptcha/reCAPTCHA로 교체할 때, 라우터 코드는 그대로 두고
 *     이 파일 하나만 갈아끼우면 됨 (의존성 역전의 맛보기).
 */

import { createHash, randomInt } from 'node:crypto';

// 사용자 입력 헷갈리는 글자(0/O, 1/l/I) 제외한 36진 풀.
// 4자리만 뽑으므로 충돌 가능성은 충분히 낮음 (32^4 ≈ 1.05M).
const CAPTCHA_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/** captcha 코드 한 자릿수의 길이. 명세서 §6.1 TEXT_4DIGIT 기준. */
export const CAPTCHA_LENGTH = 4;

/**
 * 발급된 captcha의 유효 시간.
 * 사람이 인식하고 입력하는 데 충분하면서, 미리 만들어둔 답을 재사용하는
 * 봇 시나리오를 막을 수 있을 정도의 짧은 시간 — 90초로 잡음.
 */
export const CAPTCHA_TTL_MS = 90_000;

export interface IssuedCaptcha {
  /** DB에 저장할 sha256 해시. 평문은 응답에만 들어가고 즉시 폐기 */
  answerHash: string;
  /** 클라이언트에 그대로 노출되는 코드 (자체 시뮬레이터라 SVG 왜곡 없이 그냥 text) */
  answerPlain: string;
  /** 발급 시점 — 그대로 DB의 captcha_issued_at에 박힘 */
  issuedAt: Date;
}

/**
 * 새 captcha 한 개를 만든다.
 *
 * Math.random()이 아니라 crypto.randomInt를 쓰는 이유:
 *  Math.random()은 의사난수 PRNG라 시드 추정이 가능한 반면,
 *  crypto.randomInt는 OS의 엔트로피 소스에서 뽑는 CSPRNG라 예측 불가능.
 *  보안 관련 값은 항상 crypto 모듈을 쓰는 습관을 들이는 게 좋음.
 */
export function generateCaptcha(): IssuedCaptcha {
  let answerPlain = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    answerPlain += CAPTCHA_ALPHABET[randomInt(CAPTCHA_ALPHABET.length)];
  }
  return {
    answerPlain,
    answerHash: hashAnswer(answerPlain),
    issuedAt: new Date(),
  };
}

/**
 * 정답 비교 함수.
 *
 * - 대소문자 무시: 입력 UX 배려. 사용자가 'A'로 봐도 'a'로 입력 가능하게.
 * - trim: 모바일 키패드가 자동으로 trailing space를 붙이는 경우가 잦음.
 * - timing-safe 비교가 이상적이지만, 짧은 해시 문자열 비교에 큰 의미는 없어 ===로 단순화.
 *   (정말 민감한 경우엔 crypto.timingSafeEqual을 쓰는 게 정석)
 */
export function verifyAnswer(userInput: string, storedHash: string): boolean {
  const normalized = userInput.trim().toLowerCase();
  if (normalized.length !== CAPTCHA_LENGTH) return false;
  return hashAnswer(normalized) === storedHash;
}

/**
 * 발급 시점으로부터 TTL이 지났는지 검사.
 * DB에서 가져온 timestamptz는 string으로 올 수 있으니 Date로 정규화해서 비교.
 */
export function isExpired(issuedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!issuedAt) return true;
  const issued = typeof issuedAt === 'string' ? new Date(issuedAt) : issuedAt;
  return now.getTime() - issued.getTime() > CAPTCHA_TTL_MS;
}

/**
 * captchaId 생성 — 명세서 §4.3 request의 captchaId 필드와 매칭하기 위해 사용.
 *
 * 별도 컬럼을 만들지 않고, "발급 시각(epoch ms)"을 base36으로 인코딩해서 ID로 씀.
 * 장점: 추가 DB 컬럼 없이도 클라이언트가 보낸 captchaId가
 *      현재 서버 상태(captcha_issued_at)와 일치하는지 한 줄로 검증 가능.
 * 단점: 시각이 그대로 노출되지만 보안 가치가 있는 값은 아님.
 */
export function makeCaptchaId(issuedAt: Date): string {
  return `cap_${issuedAt.getTime().toString(36)}`;
}

export function captchaIdMatches(captchaId: string, issuedAt: Date | string): boolean {
  const issued = typeof issuedAt === 'string' ? new Date(issuedAt) : issuedAt;
  return captchaId === makeCaptchaId(issued);
}

// ─────────────── 내부 헬퍼 ───────────────

function hashAnswer(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}
