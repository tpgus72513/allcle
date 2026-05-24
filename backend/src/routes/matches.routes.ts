import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/matches?teamId= — 선택한 팀의 예매 가능 경기
router.get('/', async (req, res, next) => {
  try {
    const { teamId } = req.query;
    // TODO: home_team_id 또는 away_team_id = teamId 인 matches 조회
    res.json([]);
  } catch (err) {
    next(err);
  }
});

export default router;
