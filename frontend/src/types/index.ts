export interface Team {
  id: number;
  name: string;
  short_name: string;
  color: string;
  home_stadium_id: number;
}

export interface TeamInfo {
  name: string;
  short_name: string;
  color: string;
}

/** GET /api/v1/matches 응답 항목 */
export interface Match {
  matchId: number;
  matchDate: string;
  difficulty: string;
  home: TeamInfo;
  away: TeamInfo;
  stadium: string | null;
  stadiumId: number;
}

export interface Section {
  id: number;
  name: string;
  grade: string;
  price: number;
  totalSeats: number;
  popularity: number;
  isSoldOut: boolean;
  soldOutScore: number;
}

export interface QueueStatus {
  currentPosition: number;
  initialPosition: number;
  totalInQueue: number;
  estimatedWaitMs: number;
  ready: boolean;
  elapsedSec: number;
}

/** POST /api/v1/simulation 응답 */
export interface SimulationStart {
  simulationId: string;
  status: string;
  startedAt: string;
  soldOutSeed: number;
  match: {
    id: number;
    matchDate: string;
    difficulty: string;
    stadiumId: number;
    stadium: string | null;
    home: TeamInfo;
    away: TeamInfo;
  };
}

/** POST /api/v1/simulation/:id/captcha/issue 응답 */
export interface CaptchaIssue {
  captchaId: string;
  captchaType: string;
  captchaText: string;
  ttlMs: number;
  issuedAt: string;
}

/** POST /api/v1/simulation/:id/captcha 응답 (성공 시) */
export interface CaptchaSubmitResult {
  passed: boolean;
  elapsedMs: number;
  mistakes: number;
  nextCaptcha?: {
    captchaId: string;
    captchaText: string;
    ttlMs: number;
  };
}

export interface SimulationResult {
  simulationId: string;
  score: number;
  totalTimeMs: number;
  captchaTimeMs: number;
  seatSelectTimeMs: number;
  paymentTimeMs: number;
  mistakeCount: number;
  isSuccess: boolean;
  breakdown: unknown[];
  completedAt: string;
}

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  section: string;
}
