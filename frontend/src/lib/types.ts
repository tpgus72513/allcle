// src/lib/types.ts
// ─────────────────────────────────────────────────────────────
// 백엔드 응답 타입의 단일 소스. (실제 GitHub 백엔드 구현 기준으로 확정)
// 백엔드는 snake_case/다른 필드명을 쓰는 곳이 있어서, services.ts에서
// "백엔드 응답 → 아래 FE 타입"으로 변환(adapter)합니다. 컴포넌트는 FE 타입만 봄.
// ─────────────────────────────────────────────────────────────

export type Difficulty = "입문" | "실전" | "지옥";

// 잠실 시드 기준 실제 grade 값: VIP/테이블/익사이팅/블루/응원/레드/네이비/외야응원/외야일반
// 종류가 많아 union 대신 string으로 둠.
export type Grade = string;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; alternatives?: Alternative[] } | null;
  timestamp: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  color: string;
  homeStadiumId: number;
}

export interface Match {
  id: number;
  difficulty: Difficulty;
  stadiumId: number;
  homeName: string;
  awayName: string;
  stadiumName: string | null;
}

// 좌석맵이 그릴 구역. svgPath(구장 모양) + soldOut(매진현황)을 합친 형태.
export interface Section {
  id: number;
  name: string;
  grade: Grade;
  price: number;
  popularity: number; // 1~5 (백엔드 isSoldOut 계산에 쓰는 값)
  soldOut: boolean;   // 백엔드 isSoldOut 을 매핑
  svgPath?: string;   // GET /stadiums/:id 에서 옴. ⚠️ 현재 seed에 값 없음(빈값일 수 있음)
  area: "outfield" | "third" | "field" | "first" | "home"; // grid placeholder 배치용(임시)
}

// 매진 시 대체 구역 추천. 백엔드는 {sectionId, name}만 줌(가격 없음).
export interface Alternative {
  sectionId: number;
  name: string;
}

export interface StartResult {
  simId: string; // 백엔드 simulationId 를 매핑
}

export interface QueueStatus {
  currentPosition: number;
  totalAhead: number;
  ready: boolean;
}

export interface Seat {
  id: number;
  sectionId: number;
  row: number;
  number: number;
  taken: boolean;
}

export interface CompleteResult {
  score: number;
}

// 결과 카드용. rank는 result API엔 없어서 /leaderboard의 myRank로 채움.
export interface SimResult {
  score: number;
  rank: number | null;
  sectionName: string;
  grade: Grade;
  elapsedMs: number; // totalTimeMs
}
