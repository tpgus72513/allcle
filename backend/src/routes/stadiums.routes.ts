import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/stadiums/:id/sections — 구장 구역 정보 + SVG
router.get('/:id/sections', async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO: stadium_id = id 인 sections 조회 (svg_path 포함)
    res.json([]);
  } catch (err) {
    next(err);
  }
});

export default router;
