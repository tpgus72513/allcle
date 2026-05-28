import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authRequired } from '../middlewares/auth.middleware';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

// ============================================================
// POST /api/v1/simulation
// 매치를 골라 새 시뮬레이션을 시작.
// 이미 IN_PROGRESS인 시뮬이 있으면 ABANDONED로 정리하고 새로 시작.
// (한 유저가 페이지 새로고침해도 막히지 않게 — UX 친화)
// ============================================================

const startSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { matchId } = startSchema.parse(req.body);

    // 1) 매치 존재 확인 — 없는 매치로 시작 시도 시 404
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select(
        `
          id, match_date, difficulty, stadium_id, home_team_id, away_team_id,
          home:teams!matches_home_team_id_fkey ( name, short_name, color ),
          away:teams!matches_away_team_id_fkey ( name, short_name, color ),
          stadium:stadiums ( name )
        `,
      )
      .eq('id', matchId)
      .maybeSingle();
    if (matchErr) throw new HttpError(500, 'INTERNAL_ERROR', matchErr.message);
    if (!match) throw new HttpError(404, 'NOT_FOUND', '경기를 찾을 수 없습니다.');

    // 2) 진행 중 기존 시뮬 정리 — 한 유저당 IN_PROGRESS는 최대 1개라는 제약 위반 방지
    const nowIso = new Date().toISOString();
    const { error: cleanupErr } = await supabase
      .from('simulations')
      .update({ status: 'ABANDONED', completed_at: nowIso })
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS');
    if (cleanupErr) throw new HttpError(500, 'INTERNAL_ERROR', cleanupErr.message);

    // 3) 새 시뮬 INSERT — id/started_at/status는 DB default
    const { data: created, error: createErr } = await supabase
      .from('simulations')
      .insert({ user_id: userId, match_id: matchId })
      .select('id, status, started_at')
      .single();
    if (createErr || !created) {
      throw new HttpError(500, 'INTERNAL_ERROR', `시뮬 생성 실패: ${createErr?.message ?? 'unknown'}`);
    }

    res.status(201).json(
      ok({
        simulationId: created.id,
        status: created.status,
        startedAt: created.started_at,
        match: {
          id: match.id,
          matchDate: match.match_date,
          difficulty: match.difficulty,
          stadiumId: match.stadium_id,
          stadium: (match as any).stadium?.name ?? null,
          home: (match as any).home,
          away: (match as any).away,
        },
        // queueWsUrl, queuePosition 등은 다음 단계(큐 로직)에서 추가
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/v1/simulation/current
// 진행 중인 내 시뮬 조회 (페이지 새로고침 시 클라이언트가 복구용으로 사용).
// 없으면 404.
// ============================================================

router.get('/current', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from('simulations')
      .select(
        `
          id, status, started_at, match_id,
          match:matches (
            id, match_date, difficulty, stadium_id,
            home:teams!matches_home_team_id_fkey ( name, short_name, color ),
            away:teams!matches_away_team_id_fkey ( name, short_name, color ),
            stadium:stadiums ( name )
          )
        `,
      )
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS')
      .maybeSingle();

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', '진행 중인 시뮬이 없습니다.');

    res.json(
      ok({
        simulationId: data.id,
        status: data.status,
        startedAt: data.started_at,
        match: data.match,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/v1/simulation/:id/abandon
// 사용자가 명시적으로 포기 (FE에서 새로고침/뒤로가기 감지 시 호출).
// ============================================================

router.post('/:id/abandon', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    // 본인 것만 ABANDONED 처리. RLS 대신 코드 레벨 가드.
    const { data, error } = await supabase
      .from('simulations')
      .update({ status: 'ABANDONED', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS')
      .select('id, status, completed_at')
      .maybeSingle();

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
    if (!data) {
      throw new HttpError(404, 'NOT_FOUND', '취소할 진행 중 시뮬이 없습니다.');
    }
    res.json(ok({ simulationId: data.id, status: data.status, completedAt: data.completed_at }));
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/v1/simulation/:id/result   (기존 — Sprint 1)
// 본인의 완료된 시뮬 결과 조회.
// ============================================================

router.get('/:id/result', authRequired, async (req, res, next) => {
  try {
    const id = req.params.id;
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
