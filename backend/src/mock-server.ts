/**
 * Supabase 없이 프론트엔드 플로우 테스트용 Mock 서버
 * 실행: npx tsx src/mock-server.ts
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ── 인메모리 저장소 ─────────────────────────────────────────────
const users = new Map<string, { id: string; nickname: string }>();
const simulations = new Map<
  string,
  {
    id: string;
    userId: string;
    matchId: number;
    difficulty: string;
    startedAt: Date;
    captchaId?: string;
    captchaText?: string;
    captchaPassedAt?: Date;
    captchaMistakes: number;
    selectedSectionId?: number;
    seatSelectedAt?: Date;
    paymentStartedAt?: Date;
  }
>();

// ── 시드 데이터 ──────────────────────────────────────────────────
const TEAMS = [
  { id: 1, name: 'LG 트윈스', short_name: 'LG', color: '#C30452', home_stadium_id: 1 },
  { id: 2, name: '두산 베어스', short_name: '두산', color: '#131230', home_stadium_id: 1 },
  { id: 3, name: 'KT wiz', short_name: 'KT', color: '#000000', home_stadium_id: 2 },
  { id: 4, name: 'SSG 랜더스', short_name: 'SSG', color: '#CE0E2D', home_stadium_id: 3 },
  { id: 5, name: '한화 이글스', short_name: '한화', color: '#FF6600', home_stadium_id: 4 },
  { id: 6, name: 'KIA 타이거즈', short_name: 'KIA', color: '#05141F', home_stadium_id: 5 },
  { id: 7, name: '삼성 라이온즈', short_name: '삼성', color: '#1428A0', home_stadium_id: 6 },
  { id: 8, name: '롯데 자이언츠', short_name: '롯데', color: '#041E42', home_stadium_id: 7 },
  { id: 9, name: 'NC 다이노스', short_name: 'NC', color: '#315288', home_stadium_id: 8 },
  { id: 10, name: '키움 히어로즈', short_name: '키움', color: '#570514', home_stadium_id: 9 },
];

const MATCHES = [
  {
    matchId: 1, matchDate: '2026-06-15T14:00:00Z', difficulty: '입문',
    home: { name: 'LG 트윈스', short_name: 'LG', color: '#C30452' },
    away: { name: '두산 베어스', short_name: '두산', color: '#131230' },
    stadium: '잠실야구장', stadiumId: 1,
    home_team_id: 1, away_team_id: 2,
  },
  {
    matchId: 2, matchDate: '2026-06-16T18:30:00Z', difficulty: '실전',
    home: { name: 'LG 트윈스', short_name: 'LG', color: '#C30452' },
    away: { name: 'KIA 타이거즈', short_name: 'KIA', color: '#05141F' },
    stadium: '잠실야구장', stadiumId: 1,
    home_team_id: 1, away_team_id: 6,
  },
  {
    matchId: 3, matchDate: '2026-06-20T18:00:00Z', difficulty: '지옥',
    home: { name: '두산 베어스', short_name: '두산', color: '#131230' },
    away: { name: 'LG 트윈스', short_name: 'LG', color: '#C30452' },
    stadium: '잠실야구장', stadiumId: 1,
    home_team_id: 2, away_team_id: 1,
  },
  {
    matchId: 4, matchDate: '2026-06-22T14:00:00Z', difficulty: '입문',
    home: { name: 'KT wiz', short_name: 'KT', color: '#000000' },
    away: { name: 'SSG 랜더스', short_name: 'SSG', color: '#CE0E2D' },
    stadium: '수원KT위즈파크', stadiumId: 2,
    home_team_id: 3, away_team_id: 4,
  },
  {
    matchId: 5, matchDate: '2026-06-25T18:30:00Z', difficulty: '실전',
    home: { name: '한화 이글스', short_name: '한화', color: '#FF6600' },
    away: { name: '삼성 라이온즈', short_name: '삼성', color: '#1428A0' },
    stadium: '한화생명이글스파크', stadiumId: 4,
    home_team_id: 5, away_team_id: 7,
  },
];

const SECTIONS = [
  { id: 1, name: '1루 VIP석', grade: 'VIP', price: 55000, totalSeats: 200, popularity: 5, isSoldOut: false, soldOutScore: 0.2 },
  { id: 2, name: '3루 응원석', grade: 'PREMIUM', price: 35000, totalSeats: 800, popularity: 4, isSoldOut: false, soldOutScore: 0.4 },
  { id: 3, name: '외야 응원석', grade: 'GENERAL', price: 15000, totalSeats: 1500, popularity: 3, isSoldOut: false, soldOutScore: 0.6 },
  { id: 4, name: '1루 내야 일반석', grade: 'GENERAL', price: 20000, totalSeats: 1200, popularity: 3, isSoldOut: true, soldOutScore: 0.9 },
  { id: 5, name: '중앙 테이블석', grade: 'TABLE', price: 75000, totalSeats: 100, popularity: 5, isSoldOut: false, soldOutScore: 0.3 },
];

const DECAY_RATE: Record<string, number> = { 입문: 400, 실전: 130, 지옥: 65 };
const INITIAL_POSITION = 5824;

// ── 유틸 ─────────────────────────────────────────────────────────
function ok<T>(data: T) {
  return { success: true, data, error: null, timestamp: new Date().toISOString() };
}
function fail(code: string, message: string, status = 400) {
  return { success: false, data: null, error: { code, message }, timestamp: new Date().toISOString(), _status: status };
}
function uuid() {
  return crypto.randomUUID();
}
function generateCaptchaText() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4자리
}

// ── 라우트 ───────────────────────────────────────────────────────

// 헬스체크
app.get('/api/v1/health', (_req, res) => res.json(ok({ status: 'ok', mode: 'mock' })));

// POST /api/v1/auth/anonymous
app.post('/api/v1/auth/anonymous', (req, res) => {
  const { nickname } = req.body as { nickname?: string };
  if (!nickname || nickname.trim().length < 2) {
    return res.status(400).json(fail('INVALID_NICKNAME', '닉네임은 2자 이상'));
  }
  const user = { id: uuid(), nickname: nickname.trim() };
  users.set(user.id, user);
  const token = `mock-token-${user.id}`;
  return res.status(201).json(ok({ userId: user.id, nickname: user.nickname, token, createdAt: new Date().toISOString() }));
});

// GET /api/v1/teams
app.get('/api/v1/teams', (_req, res) => res.json(ok(TEAMS)));

// GET /api/v1/matches
app.get('/api/v1/matches', (req, res) => {
  const teamId = req.query.teamId ? Number(req.query.teamId) : null;
  let result = MATCHES;
  if (teamId) {
    result = MATCHES.filter(m => m.home_team_id === teamId || m.away_team_id === teamId);
  }
  return res.json(ok(result));
});

// POST /api/v1/simulation — 시뮬 시작
app.post('/api/v1/simulation', (req, res) => {
  const { matchId } = req.body as { matchId?: number };
  const match = MATCHES.find(m => m.matchId === Number(matchId));
  if (!match) return res.status(404).json(fail('NOT_FOUND', '경기를 찾을 수 없습니다.', 404));

  const simId = uuid();
  simulations.set(simId, {
    id: simId,
    userId: 'mock-user',
    matchId: match.matchId,
    difficulty: match.difficulty,
    startedAt: new Date(),
    captchaMistakes: 0,
  });

  return res.status(201).json(ok({
    simulationId: simId,
    status: 'IN_PROGRESS',
    startedAt: simulations.get(simId)!.startedAt.toISOString(),
    soldOutSeed: Math.floor(Math.random() * 1000000),
    match: {
      id: match.matchId,
      matchDate: match.matchDate,
      difficulty: match.difficulty,
      stadiumId: match.stadiumId,
      stadium: match.stadium,
      home: match.home,
      away: match.away,
    },
  }));
});

// GET /api/v1/simulation/:id/queue
app.get('/api/v1/simulation/:id/queue', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));

  const elapsedSec = (Date.now() - sim.startedAt.getTime()) / 1000;
  const rate = DECAY_RATE[sim.difficulty] ?? 130;
  const current = Math.max(0, INITIAL_POSITION - elapsedSec * rate);
  const currentPosition = Math.floor(current);

  return res.json(ok({
    currentPosition,
    initialPosition: INITIAL_POSITION,
    totalInQueue: INITIAL_POSITION,
    estimatedWaitMs: Math.round((currentPosition / rate) * 1000),
    ready: current <= 0,
    elapsedSec: Math.floor(elapsedSec),
  }));
});

// POST /api/v1/simulation/:id/captcha/issue
app.post('/api/v1/simulation/:id/captcha/issue', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));
  if (sim.captchaPassedAt) return res.status(409).json(fail('CAPTCHA_ALREADY_PASSED', '이미 통과'));

  const captchaText = generateCaptchaText();
  const captchaId = `cap-${Date.now()}`;
  sim.captchaId = captchaId;
  sim.captchaText = captchaText;

  return res.status(201).json(ok({
    captchaId,
    captchaType: 'TEXT_4DIGIT',
    captchaText,
    ttlMs: 30000,
    issuedAt: new Date().toISOString(),
  }));
});

// POST /api/v1/simulation/:id/captcha — 정답 제출
app.post('/api/v1/simulation/:id/captcha', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));
  if (sim.captchaPassedAt) return res.status(409).json(fail('CAPTCHA_ALREADY_PASSED', '이미 통과'));

  const { captchaId, answer } = req.body as { captchaId?: string; answer?: string };
  if (!captchaId || !answer) return res.status(400).json(fail('INVALID_REQUEST', 'captchaId, answer 필요'));

  const passed = answer === sim.captchaText;
  const elapsedMs = 1200;

  if (passed) {
    sim.captchaPassedAt = new Date();
    return res.json(ok({ passed: true, elapsedMs, mistakes: sim.captchaMistakes }));
  }

  sim.captchaMistakes += 1;
  const nextText = generateCaptchaText();
  const nextId = `cap-${Date.now()}`;
  sim.captchaId = nextId;
  sim.captchaText = nextText;

  return res.json(ok({
    passed: false,
    elapsedMs,
    mistakes: sim.captchaMistakes,
    nextCaptcha: { captchaId: nextId, captchaText: nextText, ttlMs: 30000 },
  }));
});

// GET /api/v1/simulation/:id/seats
app.get('/api/v1/simulation/:id/seats', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));
  if (!sim.captchaPassedAt) return res.status(409).json(fail('CAPTCHA_NOT_PASSED', 'CAPTCHA 먼저'));

  return res.json(ok({
    sections: SECTIONS,
    alreadySelectedSectionId: sim.selectedSectionId ?? null,
  }));
});

// POST /api/v1/simulation/:id/seats/select
app.post('/api/v1/simulation/:id/seats/select', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));

  const { sectionId } = req.body as { sectionId?: number };
  const section = SECTIONS.find(s => s.id === Number(sectionId));
  if (!section) return res.status(404).json(fail('NOT_FOUND', '섹션 없음', 404));
  if (section.isSoldOut) return res.status(409).json(fail('SEAT_SOLD_OUT', '매진'));

  sim.selectedSectionId = section.id;
  sim.seatSelectedAt = new Date();

  return res.json(ok({
    selectedSectionId: section.id,
    sectionName: section.name,
    grade: section.grade,
    price: section.price,
    seatNumbers: [],
    elapsedMs: 3200,
  }));
});

// POST /api/v1/simulation/:id/payment/start
app.post('/api/v1/simulation/:id/payment/start', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));
  if (!sim.seatSelectedAt) return res.status(409).json(fail('SEAT_NOT_SELECTED', '좌석 먼저'));

  if (sim.paymentStartedAt) {
    return res.json(ok({ paymentStartedAt: sim.paymentStartedAt.toISOString(), alreadyStarted: true }));
  }
  sim.paymentStartedAt = new Date();
  return res.status(201).json(ok({ paymentStartedAt: sim.paymentStartedAt.toISOString(), alreadyStarted: false }));
});

// POST /api/v1/simulation/:id/complete
app.post('/api/v1/simulation/:id/complete', (req, res) => {
  const sim = simulations.get(req.params.id);
  if (!sim) return res.status(404).json(fail('NOT_FOUND', '시뮬을 찾을 수 없습니다.', 404));
  if (!sim.seatSelectedAt) return res.status(409).json(fail('SEAT_NOT_SELECTED', '좌석 먼저'));
  if (!sim.captchaPassedAt) return res.status(409).json(fail('CAPTCHA_NOT_PASSED', 'CAPTCHA 먼저'));

  const now = new Date();
  const captchaTimeMs = sim.captchaPassedAt.getTime() - sim.startedAt.getTime();
  const seatSelectTimeMs = sim.seatSelectedAt.getTime() - sim.captchaPassedAt.getTime();
  const paymentTimeMs = now.getTime() - (sim.paymentStartedAt ?? sim.seatSelectedAt).getTime();
  const totalTimeMs = captchaTimeMs + seatSelectTimeMs + paymentTimeMs;
  const mistakePenalty = sim.captchaMistakes * 300;
  const score = Math.max(0, 10000 - Math.floor(totalTimeMs / 100) - mistakePenalty);

  return res.json(ok({
    simulationId: sim.id,
    score,
    totalTimeMs,
    captchaTimeMs,
    seatSelectTimeMs,
    paymentTimeMs,
    mistakeCount: sim.captchaMistakes,
    isSuccess: true,
    breakdown: [],
    completedAt: now.toISOString(),
  }));
});

// GET /api/v1/leaderboard
app.get('/api/v1/leaderboard', (_req, res) =>
  res.json(ok([
    { nickname: '광클요정', score: 9200, section: '1루 VIP석' },
    { nickname: '티켓마스터', score: 8700, section: '중앙 테이블석' },
    { nickname: '빛클러', score: 8100, section: '3루 응원석' },
  ]))
);

// ── 서버 시작 ─────────────────────────────────────────────────────
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\n🎭 Mock 서버 실행 중: http://localhost:${PORT}`);
  console.log('   Supabase 없이 프론트 플로우 테스트 가능\n');
});
