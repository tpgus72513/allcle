import { Router } from 'express';
import { getStartPosition, calculateQueuePosition } from '../services/queue.service';

const router = Router();

// POST /api/simulation/start — 시뮬레이션 시작 (매치 선택)
router.post('/start', async (req, res, next) => {
  try {
    const { matchId } = req.body;
    // TODO: simId 생성, matches에서 difficulty 조회, 시작 시각 저장(메모리/세션)
    const difficulty = '지옥'; // TODO: matches에서 가져오기
    const { queuePosition, estimatedWaitMs } = getStartPosition(difficulty);
    res.json({ simId: 'TODO-uuid', queuePosition, estimatedWaitMs });
  } catch (err) {
    next(err);
  }
});

// GET /api/simulation/:simId/queue — 대기열 진행 상태 (FE가 1초마다 polling)
router.get('/:simId/queue', async (req, res, next) => {
  try {
    // TODO: simId로 저장해둔 difficulty와 startedAt 조회
    const difficulty = '지옥';
    const startedAt = Date.now(); // TODO: 실제 시작 시각으로 교체
    res.json(calculateQueuePosition(difficulty, startedAt));
  } catch (err) {
    next(err);
  }
});

// POST /api/simulation/:simId/captcha — CAPTCHA 제출
router.post('/:simId/captcha', async (req, res, next) => {
  try {
    const { answer } = req.body;
    // TODO: 정답 검증
    res.json({ success: true, nextStep: 'select-seat' });
  } catch (err) {
    next(err);
  }
});

// POST /api/simulation/:simId/select-seat — 좌석(구역) 선택 시도
router.post('/:simId/select-seat', async (req, res, next) => {
  try {
    const { sectionId } = req.body;
    // TODO: 매진 여부 판정 (popularity 기반), 성공 시 좌석 배정
    res.json({ success: false, seatInfo: null, soldOutSections: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/simulation/:simId/payment — 결제 시뮬레이션 (3분 타이머)
router.post('/:simId/payment', async (req, res, next) => {
  try {
    res.json({ success: true, paymentTime: 0 });
  } catch (err) {
    next(err);
  }
});

// POST /api/simulation/:simId/complete — 종료 + 채점
router.post('/:simId/complete', async (req, res, next) => {
  try {
    // TODO: 채점(소요시간 + 실수 + 좌석등급) 후 simulation_results INSERT
    res.json({ score: 0, breakdown: {}, rank: 'TODO' });
  } catch (err) {
    next(err);
  }
});

export default router;
