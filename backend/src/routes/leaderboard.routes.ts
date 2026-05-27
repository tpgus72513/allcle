import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authOptional } from '../middlewares/authOptional.middleware';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(50).default(20),
});

/**
 * GET /api/v1/leaderboard?page=1&size=20
 * leaderboard는 Postgres VIEW. nickname, score, total_time_ms, section_id, rank.
 * 로그인 상태면 myRank를 같이 반환 (nickname 매칭).
 *
 * 주의: 현재 view에 period 필터 컬럼이 없어서 전체 랭킹만 노출.
 *       period(DAILY/WEEKLY) 지원하려면 view를 수정해야 함 — Sprint 2.
 */
router.get('/', authOptional, async (req, res, next) => {
  try {
    const { page, size } = listQuery.parse(req.query);
    const from = (page - 1) * size;
    const to = from + size - 1;

    const { data, error, count } = await supabase
      .from('leaderboard')
      .select('nickname, score, total_time_ms, section_id, rank', { count: 'exact' })
      .order('rank', { ascending: true })
      .range(from, to);

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);

    // 로그인 사용자라면 본인 닉네임으로 rank 검색
    let myRank: number | null = null;
    if (req.user) {
      const { data: me } = await supabase
        .from('leaderboard')
        .select('rank')
        .eq('nickname', req.user.nickname)
        .order('rank', { ascending: true })
        .limit(1)
        .maybeSingle();
      myRank = me?.rank ?? null;
    }

    res.json(
      ok({
        items: data ?? [],
        page,
        size,
        totalElements: count ?? 0,
        myRank,
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
