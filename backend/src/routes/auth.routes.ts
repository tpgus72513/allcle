import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authRequired } from '../middlewares/auth.middleware';
import { HttpError, ok } from '../utils/apiResponse';
import { signSession } from '../utils/jwt';

const router = Router();

// (Rate limit은 운영 단계에서 nginx/Cloudflare 또는 express-rate-limit v8 옵션 맞춰 다시 추가)

const anonymousSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, '닉네임은 2자 이상')
    .max(20, '닉네임은 20자 이하')
    .regex(/^[A-Za-z0-9가-힣_]+$/, '한글/영문/숫자/_ 만 사용 가능'),
});

/**
 * POST /api/v1/auth/anonymous
 * 닉네임만 받아서 익명 user 생성 + JWT 토큰 발급.
 */
router.post('/anonymous', async (req, res, next) => {
  try {
    const { nickname } = anonymousSchema.parse(req.body);

    // 닉네임 중복은 막을지/허용할지 선택. 현재 users 테이블에 UNIQUE 제약이 없으니 일단 허용.
    // 막고 싶다면 아래 주석 해제:
    // const { data: dup } = await supabase.from('users').select('id').eq('nickname', nickname).maybeSingle();
    // if (dup) throw new HttpError(409, 'CONFLICT', '이미 사용 중인 닉네임입니다.');

    const { data, error } = await supabase
      .from('users')
      .insert({ nickname })
      .select('id, nickname, created_at')
      .single();

    if (error || !data) {
      throw new HttpError(500, 'INTERNAL_ERROR', `사용자 생성 실패: ${error?.message ?? 'unknown'}`);
    }

    const token = signSession(data.id, data.nickname);
    res.status(201).json(
      ok({
        userId: data.id,
        nickname: data.nickname,
        token,
        createdAt: data.created_at,
      }),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 * stateless JWT라 서버는 No Content만 응답. FE에서 토큰 폐기.
 */
router.post('/logout', authRequired, (_req, res) => {
  res.status(204).send();
});

export default router;
