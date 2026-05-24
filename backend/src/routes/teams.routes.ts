import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/teams — KBO 10개 팀 목록 (실제 구현 예시)
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, color');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
