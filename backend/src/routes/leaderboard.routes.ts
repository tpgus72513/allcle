import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/leaderboard?matchId= — 매치별 랭킹 (leaderboard view 기반)
router.get('/', async (req, res, next) => {
  try {
    const { matchId } = req.query;
    // TODO: matchId 필터링 추가
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
