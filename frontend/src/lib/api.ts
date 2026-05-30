import type {
  Team,
  Match,
  Section,
  QueueStatus,
  SimulationStart,
  CaptchaIssue,
  CaptchaSubmitResult,
  SimulationResult,
  LeaderboardEntry,
} from '@/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/** 백엔드 응답: { success, data, error, timestamp } */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    data: null as unknown as T,
    error: { code: 'PARSE_ERROR', message: res.statusText },
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? `API ${res.status}`);
  }

  return json.data;
}

export const api = {
  auth: {
    anonymous: (nickname: string) =>
      request<{ userId: string; nickname: string; token: string }>(
        '/auth/anonymous',
        { method: 'POST', body: JSON.stringify({ nickname }) }
      ),
  },

  teams: {
    list: () => request<Team[]>('/teams'),
  },

  matches: {
    list: (teamId: number) => request<Match[]>(`/matches?teamId=${teamId}`),
  },

  stadiums: {
    sections: (stadiumId: number) =>
      request<Section[]>(`/stadiums/${stadiumId}/sections`),
  },

  simulation: {
    /** POST /simulation — 시뮬 시작. 반환값: simulationId */
    start: (matchId: number) =>
      request<SimulationStart>('/simulation', {
        method: 'POST',
        body: JSON.stringify({ matchId }),
      }),

    /** GET /simulation/:id/queue — 1초 polling */
    queue: (simId: string) =>
      request<QueueStatus>(`/simulation/${simId}/queue`),

    /** POST /simulation/:id/captcha/issue — 캡차 코드 발급 */
    issueCaptcha: (simId: string) =>
      request<CaptchaIssue>(`/simulation/${simId}/captcha/issue`, {
        method: 'POST',
      }),

    /** POST /simulation/:id/captcha — 캡차 정답 제출 */
    submitCaptcha: (simId: string, captchaId: string, answer: string) =>
      request<CaptchaSubmitResult>(`/simulation/${simId}/captcha`, {
        method: 'POST',
        body: JSON.stringify({ captchaId, answer }),
      }),

    /** GET /simulation/:id/seats — 구역 목록 */
    seats: (simId: string) =>
      request<{ sections: Section[]; alreadySelectedSectionId: number | null }>(
        `/simulation/${simId}/seats`
      ),

    /** POST /simulation/:id/seats/select */
    selectSeat: (simId: string, sectionId: number) =>
      request<{ selectedSectionId: number; sectionName: string; grade: string; price: number; elapsedMs: number }>(
        `/simulation/${simId}/seats/select`,
        { method: 'POST', body: JSON.stringify({ sectionId }) }
      ),

    /** POST /simulation/:id/payment/start */
    startPayment: (simId: string) =>
      request<{ paymentStartedAt: string; alreadyStarted: boolean }>(
        `/simulation/${simId}/payment/start`,
        { method: 'POST' }
      ),

    /** POST /simulation/:id/complete */
    complete: (simId: string) =>
      request<SimulationResult>(`/simulation/${simId}/complete`, {
        method: 'POST',
      }),
  },

  leaderboard: {
    list: (matchId: number) =>
      request<LeaderboardEntry[]>(`/leaderboard?matchId=${matchId}`),
  },
};
