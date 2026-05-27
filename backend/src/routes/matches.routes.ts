import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

const listQuery = z.object({
  difficulty: z.enum(['입문', '실전', '지옥']).optional(),
  teamId: z.coerce.number().int().positive().optional(),
});

/**
 * GET /api/v1/matches
 * 경기 목록. ?difficulty=지옥&teamId=1 으로 필터 가능.
 */
router.get('/', async (req, res, next) => {
  try {
    const { difficulty, teamId } = listQuery.parse(req.query);

    let query = supabase
      .from('matches')
      .select(
        `
          id,
          match_date,
          difficulty,
          home_team_id,
          away_team_id,
          stadium_id,
          home:teams!matches_home_team_id_fkey ( name, short_name, color ),
          away:teams!matches_away_team_id_fkey ( name, short_name, color ),
          stadium:stadiums ( name )
        `,
      )
      .order('match_date', { ascending: true });

    if (difficulty) query = query.eq('difficulty', difficulty);
    if (teamId) {
      // 홈/원정 어느 쪽이든 매칭
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }

    const { data, error } = await query;
    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);

    const items = (data ?? []).map((m: any) => ({
      matchId: m.id,
      matchDate: m.match_date,
      difficulty: m.difficulty,
      home: m.home,
      away: m.away,
      stadium: m.stadium?.name ?? null,
      stadiumId: m.stadium_id,
    }));

    res.json(ok(items));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/matches/:id — 경기 단건 (좌석 정보 제공 X, 좌석은 /stadiums/:id 로)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_REQUEST', 'id는 양의 정수여야 합니다.');
    }

    const { data, error } = await supabase
      .from('matches')
      .select(
        `
          id, match_date, difficulty, stadium_id,
          home:teams!matches_home_team_id_fkey ( id, name, short_name, color ),
          away:teams!matches_away_team_id_fkey ( id, name, short_name, color ),
          stadium:stadiums ( id, name, total_capacity )
        `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', '경기를 찾을 수 없습니다.');

    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

export default router;
