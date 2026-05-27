import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authRequired } from '../middlewares/auth.middleware';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

/**
 * GET /api/v1/users/me
 * 내 정보 + 총 시뮬레이션 수 + 베스트 점수
 */
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const [{ data: user, error: userErr }, { data: results, error: resErr }] = await Promise.all([
      supabase.from('users').select('id, nickname, created_at').eq('id', userId).maybeSingle(),
      supabase.from('simulation_results').select('score').eq('user_id', userId),
    ]);

    if (userErr) throw new HttpError(500, 'INTERNAL_ERROR', userErr.message);
    if (!user) throw new HttpError(404, 'NOT_FOUND', '유저를 찾을 수 없습니다.');
    if (resErr) throw new HttpError(500, 'INTERNAL_ERROR', resErr.message);

    const scores = (results ?? []).map((r) => r.score);
    const bestScore = scores.length ? Math.max(...scores) : 0;

    res.json(
      ok({
        userId: user.id,
        nickname: user.nickname,
        totalSimulations: scores.length,
        bestScore,
        createdAt: user.created_at,
      }),
    );
  } catch (err) {
    next(err);
  }
});

const historyQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(50).default(10),
});

/**
 * GET /api/v1/users/me/history?page=1&size=10
 * 내 시뮬레이션 결과 목록 (최신순). match, section을 join.
 */
router.get('/me/history', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { page, size } = historyQuery.parse(req.query);
    const from = (page - 1) * size;
    const to = from + size - 1;

    // count + page 데이터를 한 번에. {count: 'exact'}는 전체 row 수.
    const { data, error, count } = await supabase
      .from('simulation_results')
      .select(
        `
          id,
          score,
          total_time_ms,
          success,
          created_at,
          match:matches ( id, match_date, difficulty,
                          home:teams!matches_home_team_id_fkey ( name ),
                          stadium:stadiums ( name ) ),
          section:sections ( name, grade )
        `,
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);

    const items = (data ?? []).map((r: any) => ({
      simulationId: r.id,
      score: r.score,
      totalTimeMs: r.total_time_ms,
      isSuccess: r.success,
      completedAt: r.created_at,
      matchDate: r.match?.match_date ?? null,
      difficulty: r.match?.difficulty ?? null,
      homeTeam: r.match?.home?.name ?? null,
      stadium: r.match?.stadium?.name ?? null,
      section: r.section?.name ?? null,
      grade: r.section?.grade ?? null,
    }));

    res.json(ok({ items, page, size, totalElements: count ?? 0 }));
  } catch (err) {
    next(err);
  }
});

export default router;
