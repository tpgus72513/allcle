import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { HttpError, ok } from '../utils/apiResponse';

const router = Router();

const idParam = z.object({ id: z.coerce.number().int().positive() });

/**
 * GET /api/v1/stadiums/:id
 * 구장 + sections 목록 (좌석 등급, 가격, 좌석 수, popularity 포함).
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);

    const { data, error } = await supabase
      .from('stadiums')
      .select(
        `
          id,
          name,
          total_capacity,
          sections ( id, name, grade, price, total_seats, popularity, svg_path )
        `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', '구장을 찾을 수 없습니다.');

    res.json(
      ok({
        id: data.id,
        name: data.name,
        totalCapacity: data.total_capacity,
        sections: (data.sections ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          price: s.price,
          totalSeats: s.total_seats,
          popularity: s.popularity,
          svgPath: s.svg_path,
        })),
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
