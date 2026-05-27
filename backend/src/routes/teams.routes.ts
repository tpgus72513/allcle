import { Router } from 'express';
import { supabase } from '../config/supabase';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

/**
 * GET /api/v1/teams
 * KBO 구단 목록 (현재 시드는 LG·두산 2팀).
 */
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, short_name, color, home_stadium_id')
      .order('id', { ascending: true });

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
    res.json(ok(data ?? []));
  } catch (err) {
    next(err);
  }
});

export default router;
