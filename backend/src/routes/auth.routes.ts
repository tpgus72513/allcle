import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// POST /api/auth/anonymous — 익명 세션 생성 (닉네임만)
router.post('/anonymous', async (req, res, next) => {
  try {
    const { nickname } = req.body;
    // TODO: nickname 유효성 검사 → users INSERT → 토큰 발급
    // const { data, error } = await supabase
    //   .from('users')
    //   .insert({ nickname })
    //   .select('id')
    //   .single();
    res.json({ userId: 'TODO-uuid', token: 'TODO-token' });
  } catch (err) {
    next(err);
  }
});

export default router;
