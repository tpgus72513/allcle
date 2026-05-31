// src/lib/services.ts
// ─────────────────────────────────────────────────────────────
// 화면들은 api.ts를 직접 부르지 않고 이 파일 함수만 씁니다.
// 여기가 (1) mock ↔ 실제 API 전환 자리이자 (2) 백엔드 응답 → FE 타입 변환 자리.
//
//   [2단계] USE_MOCK=true  → mock으로 UI 작업
//   [3단계] USE_MOCK=false → 실제 BE 호출 (.env.local: NEXT_PUBLIC_USE_MOCK=false)
//
// ※ 실제 백엔드(GitHub) 구현 기준으로 엔드포인트/필드명 맞춤:
//    - Base는 /api/v1
//    - 시뮬 시작: POST /simulation (응답 simulationId)
//    - 좌석: GET /simulation/:id/seats → { sections:[{...isSoldOut}], ... }
//    - svgPath: GET /stadiums/:id 에서 따로 → seats와 merge
//    - 결과 rank: result엔 없음 → GET /leaderboard 의 myRank 사용
// ─────────────────────────────────────────────────────────────

import { apiFetch, setAuthToken, ApiError } from "./api";
import * as mock from "./mock";
import type {
  Team, Match, Section, Seat, StartResult, QueueStatus, CompleteResult, SimResult,
} from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── 1) 세션 생성 ───
// ⚠️ 닉네임 규칙(백엔드 zod): 2~20자, 한글/영문/숫자/_ 만. 공백·특수문자 불가.
export async function createAnonymous(nickname: string): Promise<{ userId: string; token: string }> {
  if (USE_MOCK) { await delay(200); const f = { userId: "mock-user", token: "mock-token" }; setAuthToken(f.token); return f; }
  const data = await apiFetch<{ userId: string; nickname: string; token: string }>(
    "/auth/anonymous", { method: "POST", body: { nickname }, auth: false });
  setAuthToken(data.token);
  return { userId: data.userId, token: data.token };
}

// ─── 2) 구단 목록 (백엔드: short_name/home_stadium_id snake_case) ───
export async function getTeams(): Promise<Team[]> {
  if (USE_MOCK) { await delay(200); return mock.MOCK_TEAMS; }
  const rows = await apiFetch<any[]>("/teams");
  return rows.map((t) => ({
    id: t.id, name: t.name, shortName: t.short_name, color: t.color, homeStadiumId: t.home_stadium_id,
  }));
}

// ─── 3) 경기 목록 (백엔드: matchId/home.name/away.name/stadium) ───
export async function getMatches(teamId: number): Promise<Match[]> {
  if (USE_MOCK) { await delay(200); return mock.MOCK_MATCHES; }
  const rows = await apiFetch<any[]>(`/matches?teamId=${teamId}`);
  return rows.map((m) => ({
    id: m.matchId, difficulty: m.difficulty, stadiumId: m.stadiumId,
    homeName: m.home?.name ?? "", awayName: m.away?.name ?? "", stadiumName: m.stadium ?? null,
  }));
}

// ─── 4) 시뮬 시작 (POST /simulation, 응답 simulationId) ───
export async function startSimulation(matchId: number): Promise<StartResult> {
  if (USE_MOCK) { await delay(200); return mock.MOCK_START; }
  const data = await apiFetch<{ simulationId: string }>("/simulation", { method: "POST", body: { matchId } });
  return { simId: data.simulationId };
}

// ─── 5) 대기열 (백엔드 미구현 → mock 유지) ───
export async function getQueue(simId: string): Promise<QueueStatus> {
  if (USE_MOCK) { await delay(100); return mock.mockQueue(); }
  return apiFetch<QueueStatus>(`/simulation/${simId}/queue`); // 큐 붙으면 동작
}

// ─── 6) 좌석 현황 + 구장 svgPath merge ───
// seats: isSoldOut(시뮬별) / stadiums: svgPath(구장 고정). 둘을 id로 합침.
export async function getSeats(simId: string, stadiumId = 1): Promise<Section[]> {
  if (USE_MOCK) { await delay(300); return mock.MOCK_SECTIONS; }

  const [seatRes, stadiumRes] = await Promise.all([
    apiFetch<{ sections: any[]; alreadySelectedSectionId: number | null }>(`/simulation/${simId}/seats`),
    apiFetch<{ sections: any[] }>(`/stadiums/${stadiumId}`),
  ]);
  const svgById = new Map(stadiumRes.sections.map((s) => [s.id, s.svgPath as string | undefined]));

  return seatRes.sections.map((s) => ({
    id: s.id, name: s.name, grade: s.grade, price: s.price,
    popularity: s.popularity,
    soldOut: s.isSoldOut,              // ← isSoldOut 매핑
    svgPath: svgById.get(s.id),        // ← 구장에서 가져온 좌표(현재 비어있을 수 있음)
    area: guessArea(s.name),           // svgPath 채워지면 area는 불필요(placeholder 전용)
  }));
}

// ─── 6-2) 구역 내 개별 좌석 조회 ───
export async function getSectionSeats(simId: string, sectionId: number): Promise<Seat[]> {
  if (USE_MOCK) { await delay(200); return mock.getMockSeats(sectionId); }
  return apiFetch<Seat[]>(`/simulation/${simId}/seats/${sectionId}`);
}

// ─── 7) 좌석 선택. 409면 ApiError.alternatives({sectionId,name}) ───
export async function selectSeat(simId: string, sectionId: number): Promise<void> {
  if (USE_MOCK) {
    await delay(250);
    const t = mock.MOCK_SECTIONS.find((s) => s.id === sectionId);
    if (t?.soldOut) {
      const alts = mock.MOCK_SECTIONS.filter((s) => !s.soldOut).slice(0, 3)
        .map((s) => ({ sectionId: s.id, name: s.name }));
      throw new ApiError("SEAT_SOLD_OUT", "방금 매진됐어요", 409, alts);
    }
    return;
  }
  await apiFetch<void>(`/simulation/${simId}/seats/select`, { method: "POST", body: { sectionId } });
}

// ─── 8) 결제 시작 ───
export async function startPayment(simId: string): Promise<void> {
  if (USE_MOCK) { await delay(150); return; }
  await apiFetch<void>(`/simulation/${simId}/payment/start`, { method: "POST" });
}

// ─── 9) 완료 + 채점 (응답 score) ───
export async function completeSimulation(simId: string): Promise<CompleteResult> {
  if (USE_MOCK) { await delay(300); return mock.MOCK_COMPLETE; }
  const data = await apiFetch<{ score: number }>(`/simulation/${simId}/complete`, { method: "POST" });
  return { score: data.score };
}

// ─── 10) 결과 조회 + 순위(myRank) merge ───
// result엔 rank가 없으므로 leaderboard의 myRank를 같이 가져와 합침.
export async function getResult(simId: string, _sectionId: number): Promise<SimResult> {
  if (USE_MOCK) { await delay(200); return mock.mockResult(_sectionId); }
  const [result, board] = await Promise.all([
    apiFetch<any>(`/simulation/${simId}/result`),
    apiFetch<{ myRank: number | null }>(`/leaderboard?page=1&size=1`).catch(() => ({ myRank: null })),
  ]);
  return {
    score: result.score,
    rank: board.myRank ?? null,
    sectionName: result.section?.name ?? "-",
    grade: result.section?.grade ?? "-",
    elapsedMs: result.totalTimeMs ?? 0,
  };
}

// placeholder(grid) 배치용 임시 추정. svgPath 채워지면 SectionTile이 좌표로 그리므로 무의미.
function guessArea(name: string): Section["area"] {
  if (name.includes("외야")) return "outfield";
  if (name.includes("3루") || name.includes("블루")) return "third";
  if (name.includes("1루") || name.includes("오렌지")) return "first";
  if (name.includes("프리미엄") || name.includes("테이블") || name.includes("VIP")) return "home";
  return "field";
}
