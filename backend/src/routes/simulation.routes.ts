import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authRequired } from '../middlewares/auth.middleware';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

/**
 * Sprint 1: 결과 조회만.
 * 시뮬레이션 시작/대기열/캡차/좌석/완료는 Sprint 2에서 추가.
 *
 * GET /api/v1/simulation/:id/result
 * 본인 결과만 조회 가능 (다른 사람 결과는 403).
 */
router.get('/:id/result', authRequired, async (req, res, next) => {
  try {
    const id = req.params.id; // uuid 문자열 그대로
    if (!id) throw new HttpError(400, 'INVALID_REQUEST', 'id가 필요합니다.');

    const { data, error } = await supabase
      .from('simulation_results')
      .select(
        `
          id,
          user_id,
          score,
          total_time_ms,
          queue_time_ms,
          seat_select_time_ms,
          captcha_time_ms,
          mistake_count,
          success,
          created_at,
          match:matches ( id, match_date, difficulty,
                          home:teams!matches_home_team_id_fkey ( name ),
                          away:teams!matches_away_team_id_fkey ( name ),
                          stadium:stadiums ( name ) ),
          section:sections ( name, grade, price )
        `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', '시뮬레이션 결과를 찾을 수 없습니다.');
    if (data.user_id !== req.user!.id) {
      throw new HttpError(403, 'FORBIDDEN', '본인의 결과만 조회할 수 있습니다.');
    }

    res.json(
      ok({
        simulationId: data.id,
        score: data.score,
        totalTimeMs: data.total_time_ms,
        queueTimeMs: data.queue_time_ms,
        seatSelectTimeMs: data.seat_select_time_ms,
        captchaTimeMs: data.captcha_time_ms,
        mistakeCount: data.mistake_count,
        isSuccess: data.success,
        completedAt: data.created_at,
        match: data.match,
        section: data.section,
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
