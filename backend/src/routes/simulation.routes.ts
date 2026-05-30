import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authRequired } from '../middlewares/auth.middleware';
import { HttpError, ok } from '../utils/apiResponse';
import {
  CAPTCHA_TTL_MS,
  captchaIdMatches,
  generateCaptcha,
  isExpired,
  makeCaptchaId,
  verifyAnswer,
} from '../services/captcha.service';
import {
  evaluateSection,
  evaluateSections,
} from '../services/seatAvailability.service';
import { calculateScore } from '../services/scoring.service';

const router = Router();

// ============================================================
// POST /api/v1/simulation
// 매치를 골라 새 시뮬레이션을 시작.
// ============================================================

const startSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { matchId } = startSchema.parse(req.body);

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

    const nowIso = new Date().toISOString();
    const { error: cleanupErr } = await supabase
      .from('simulations')
      .update({ status: 'ABANDONED', completed_at: nowIso })
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS');
    if (cleanupErr) throw new HttpError(500, 'INTERNAL_ERROR', cleanupErr.message);

    const { data: created, error: createErr } = await supabase
      .from('simulations')
      .insert({ user_id: userId, match_id: matchId })
      .select('id, status, started_at, sold_out_seed')
      .single();
    if (createErr || !created) {
      throw new HttpError(500, 'INTERNAL_ERROR', `시뮬 생성 실패: ${createErr?.message ?? 'unknown'}`);
    }

    res.status(201).json(
      ok({
        simulationId: created.id,
        status: created.status,
        startedAt: created.started_at,
        soldOutSeed: created.sold_out_seed,
        match: {
          id: match.id,
          matchDate: match.match_date,
          difficulty: match.difficulty,
          stadiumId: match.stadium_id,
          stadium: (match as any).stadium?.name ?? null,
          home: (match as any).home,
          away: (match as any).away,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/v1/simulation/current
// ============================================================

router.get('/current', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from('simulations')
      .select(
        `
          id, status, started_at, match_id,
          captcha_issued_at, captcha_passed_at, captcha_mistakes,
          selected_section_id, seat_selected_at,
          payment_started_at, payment_completed_at,
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
        captcha: {
          issuedAt: data.captcha_issued_at,
          passedAt: data.captcha_passed_at,
          mistakes: data.captcha_mistakes,
        },
        seat: {
          selectedSectionId: data.selected_section_id,
          selectedAt: data.seat_selected_at,
        },
        payment: {
          startedAt: data.payment_started_at,
          completedAt: data.payment_completed_at,
        },
        match: data.match,
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/:id/abandon', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

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
// POST /api/v1/simulation/:id/captcha/issue   (Sprint 3)
// ============================================================

router.post('/:id/captcha/issue', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const sim = await loadInProgressSim(id, userId);
    if (sim.captcha_passed_at) {
      throw new HttpError(409, 'CAPTCHA_ALREADY_PASSED', '이미 캡차를 통과한 시뮬입니다.');
    }

    const issued = generateCaptcha();
    const { error: updateErr } = await supabase
      .from('simulations')
      .update({
        captcha_issued_at: issued.issuedAt.toISOString(),
        captcha_answer_hash: issued.answerHash,
      })
      .eq('id', id)
      .eq('user_id', userId);
    if (updateErr) throw new HttpError(500, 'INTERNAL_ERROR', updateErr.message);

    res.status(201).json(
      ok({
        captchaId: makeCaptchaId(issued.issuedAt),
        captchaType: 'TEXT_4DIGIT',
        captchaText: issued.answerPlain,
        ttlMs: CAPTCHA_TTL_MS,
        issuedAt: issued.issuedAt.toISOString(),
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/v1/simulation/:id/captcha   (Sprint 3)
// ============================================================

const submitSchema = z.object({
  captchaId: z.string().min(1),
  answer: z.string().min(1).max(16),
});

router.post('/:id/captcha', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    const { captchaId, answer } = submitSchema.parse(req.body);

    const sim = await loadInProgressSim(id, userId);
    if (sim.captcha_passed_at) {
      throw new HttpError(409, 'CAPTCHA_ALREADY_PASSED', '이미 캡차를 통과한 시뮬입니다.');
    }
    if (!sim.captcha_issued_at || !sim.captcha_answer_hash) {
      throw new HttpError(409, 'CAPTCHA_NOT_ISSUED', '먼저 captcha를 발급받아야 합니다.');
    }
    if (!captchaIdMatches(captchaId, sim.captcha_issued_at)) {
      throw new HttpError(409, 'CAPTCHA_STALE', '오래된 captchaId입니다. 새로 발급된 captcha를 사용하세요.');
    }

    const now = new Date();
    if (isExpired(sim.captcha_issued_at, now)) {
      const reissued = await reissueCaptcha(id, userId);
      throw new HttpError(409, 'CAPTCHA_EXPIRED', 'captcha가 만료되었습니다. 새 captcha를 사용하세요.', {
        captchaId: makeCaptchaId(reissued.issuedAt),
        captchaText: reissued.answerPlain,
        ttlMs: CAPTCHA_TTL_MS,
      });
    }

    const passed = verifyAnswer(answer, sim.captcha_answer_hash);
    const elapsedMs = now.getTime() - new Date(sim.captcha_issued_at).getTime();

    if (passed) {
      const { error: passErr } = await supabase
        .from('simulations')
        .update({
          captcha_passed_at: now.toISOString(),
          captcha_answer_hash: null,
        })
        .eq('id', id)
        .eq('user_id', userId);
      if (passErr) throw new HttpError(500, 'INTERNAL_ERROR', passErr.message);

      return res.json(
        ok({
          passed: true,
          elapsedMs,
          mistakes: sim.captcha_mistakes,
        }),
      );
    }

    const reissued = await reissueCaptcha(id, userId, { incrementMistakes: true });
    return res.json(
      ok({
        passed: false,
        elapsedMs,
        mistakes: sim.captcha_mistakes + 1,
        nextCaptcha: {
          captchaId: makeCaptchaId(reissued.issuedAt),
          captchaText: reissued.answerPlain,
          ttlMs: CAPTCHA_TTL_MS,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/v1/simulation/:id/seats    (Sprint 4)
// ============================================================

router.get('/:id/seats', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const sim = await loadInProgressSim(id, userId);
    if (!sim.captcha_passed_at) {
      throw new HttpError(409, 'CAPTCHA_NOT_PASSED', '먼저 captcha를 통과해야 합니다.');
    }

    const { data: ctx, error: ctxErr } = await supabase
      .from('simulations')
      .select(
        `
          sold_out_seed,
          match:matches ( difficulty, stadium_id )
        `,
      )
      .eq('id', id)
      .single();
    if (ctxErr || !ctx) throw new HttpError(500, 'INTERNAL_ERROR', ctxErr?.message ?? 'no ctx');

    const stadiumId = (ctx as any).match?.stadium_id;
    const difficulty = (ctx as any).match?.difficulty ?? 'NORMAL';
    if (!stadiumId) throw new HttpError(500, 'INTERNAL_ERROR', '매치에 stadium 정보 없음');

    const { data: sections, error: sectionsErr } = await supabase
      .from('sections')
      .select('id, name, grade, price, total_seats, popularity')
      .eq('stadium_id', stadiumId)
      .order('id', { ascending: true });
    if (sectionsErr) throw new HttpError(500, 'INTERNAL_ERROR', sectionsErr.message);

    const availability = evaluateSections(
      ctx.sold_out_seed,
      difficulty,
      (sections ?? []).map((s) => ({ id: s.id, popularity: s.popularity ?? 3 })),
    );
    const byId = new Map(availability.map((a) => [a.sectionId, a]));

    res.json(
      ok({
        sections: (sections ?? []).map((s) => {
          const av = byId.get(s.id)!;
          return {
            id: s.id,
            name: s.name,
            grade: s.grade,
            price: s.price,
            totalSeats: s.total_seats,
            popularity: s.popularity,
            isSoldOut: av.isSoldOut,
            soldOutScore: av.soldOutScore,
          };
        }),
        alreadySelectedSectionId: sim.selected_section_id,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/v1/simulation/:id/seats/select    (Sprint 4)
// ============================================================

const selectSchema = z.object({
  sectionId: z.coerce.number().int().positive(),
  seatNumbers: z.array(z.string()).optional(),
});

router.post('/:id/seats/select', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    const { sectionId, seatNumbers } = selectSchema.parse(req.body);

    const sim = await loadInProgressSim(id, userId);
    if (!sim.captcha_passed_at) {
      throw new HttpError(409, 'CAPTCHA_NOT_PASSED', '먼저 captcha를 통과해야 합니다.');
    }
    if (sim.seat_selected_at) {
      throw new HttpError(409, 'SEAT_ALREADY_SELECTED', '이미 좌석을 선택한 시뮬입니다.');
    }

    const { data: ctx, error: ctxErr } = await supabase
      .from('simulations')
      .select(
        `
          sold_out_seed,
          match:matches ( difficulty, stadium_id )
        `,
      )
      .eq('id', id)
      .single();
    if (ctxErr || !ctx) throw new HttpError(500, 'INTERNAL_ERROR', ctxErr?.message ?? 'no ctx');

    const stadiumId = (ctx as any).match?.stadium_id;
    const difficulty = (ctx as any).match?.difficulty ?? 'NORMAL';

    const { data: section, error: sectionErr } = await supabase
      .from('sections')
      .select('id, name, stadium_id, popularity, grade, price')
      .eq('id', sectionId)
      .maybeSingle();
    if (sectionErr) throw new HttpError(500, 'INTERNAL_ERROR', sectionErr.message);
    if (!section) throw new HttpError(404, 'NOT_FOUND', '섹션을 찾을 수 없습니다.');
    if (section.stadium_id !== stadiumId) {
      throw new HttpError(400, 'INVALID_REQUEST', '이 경기의 구장과 다른 섹션입니다.');
    }

    const av = evaluateSection({
      seed: ctx.sold_out_seed,
      sectionId,
      popularity: section.popularity ?? 3,
      difficulty,
    });
    if (av.isSoldOut) {
      const alternatives = await suggestAlternatives({
        stadiumId,
        seed: ctx.sold_out_seed,
        difficulty,
        excludeId: sectionId,
      });
      throw new HttpError(409, 'SEAT_SOLD_OUT', '선택한 섹션이 이미 매진되었습니다.', {
        alternatives,
      });
    }

    const now = new Date();
    const { error: updateErr } = await supabase
      .from('simulations')
      .update({
        selected_section_id: sectionId,
        seat_selected_at: now.toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);
    if (updateErr) throw new HttpError(500, 'INTERNAL_ERROR', updateErr.message);

    const elapsedMs = now.getTime() - new Date(sim.captcha_passed_at).getTime();

    res.json(
      ok({
        selectedSectionId: sectionId,
        sectionName: section.name,
        grade: section.grade,
        price: section.price,
        seatNumbers: seatNumbers ?? [],
        elapsedMs,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// [NEW] POST /api/v1/simulation/:id/payment/start
// 결제 페이지 진입 알림. payment_started_at 박음.
//
// FE가 좌석 선택 후 "결제하기" 버튼 누르고 카드정보 화면으로 진입할 때 호출.
// 호출 안 해도 complete는 동작함 (시간 측정은 좌석 선택 시점부터로 fallback).
// ============================================================

router.post('/:id/payment/start', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const sim = await loadInProgressSim(id, userId);
    if (!sim.seat_selected_at) {
      throw new HttpError(409, 'SEAT_NOT_SELECTED', '먼저 좌석을 선택해야 합니다.');
    }
    if (sim.payment_completed_at) {
      throw new HttpError(409, 'PAYMENT_ALREADY_COMPLETED', '이미 결제가 완료된 시뮬입니다.');
    }
    if (sim.payment_started_at) {
      // 멱등성 — 이미 시작했으면 그대로 OK 응답
      return res.json(
        ok({
          paymentStartedAt: sim.payment_started_at,
          alreadyStarted: true,
        }),
      );
    }

    const now = new Date();
    const { error } = await supabase
      .from('simulations')
      .update({ payment_started_at: now.toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);

    res.status(201).json(
      ok({
        paymentStartedAt: now.toISOString(),
        alreadyStarted: false,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// [NEW] POST /api/v1/simulation/:id/complete
// 결제 확정 + 시뮬 종료 + 점수 산출 + simulation_results INSERT.
//
// 트랜잭션 메모:
//  순서는 (1) simulation_results INSERT → (2) simulations UPDATE.
//  만약 (1) 후 (2) 실패하면 result는 남고 sim은 IN_PROGRESS 상태로 남는데,
//  GET /:id/result는 정상 동작하므로 사용자 경험은 보존됨. 다음 호출 시
//  멱등성 가드(이미 result가 있으면 INSERT 스킵)로 보강할 수도 있음.
//  진짜 운영이면 Supabase RPC(PL/pgSQL function)로 묶는 게 정석.
// ============================================================

router.post('/:id/complete', authRequired, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const sim = await loadInProgressSim(id, userId);

    // 단계 가드 — 좌석은 반드시 선택돼 있어야 함
    if (!sim.seat_selected_at || !sim.selected_section_id) {
      throw new HttpError(409, 'SEAT_NOT_SELECTED', '먼저 좌석을 선택해야 합니다.');
    }
    if (!sim.captcha_passed_at) {
      throw new HttpError(409, 'CAPTCHA_NOT_PASSED', '먼저 captcha를 통과해야 합니다.');
    }
    if (sim.payment_completed_at) {
      throw new HttpError(409, 'PAYMENT_ALREADY_COMPLETED', '이미 결제가 완료된 시뮬입니다.');
    }

    // 시뮬 컨텍스트(난이도, match_id)를 가져옴
    const { data: ctx, error: ctxErr } = await supabase
      .from('simulations')
      .select(
        `
          match_id, captcha_issued_at,
          match:matches ( difficulty )
        `,
      )
      .eq('id', id)
      .single();
    if (ctxErr || !ctx) throw new HttpError(500, 'INTERNAL_ERROR', ctxErr?.message ?? 'no ctx');

    const difficulty = (ctx as any).match?.difficulty ?? 'NORMAL';
    const matchId = (ctx as any).match_id;

    // 각 단계 소요 시간 계산
    const captchaIssuedAt = ctx.captcha_issued_at ? new Date(ctx.captcha_issued_at) : null;
    const captchaPassedAt = new Date(sim.captcha_passed_at);
    const seatSelectedAt = new Date(sim.seat_selected_at);
    const paymentStartedAt = sim.payment_started_at ? new Date(sim.payment_started_at) : null;
    const now = new Date();

    const captchaTimeMs = captchaIssuedAt
      ? Math.max(0, captchaPassedAt.getTime() - captchaIssuedAt.getTime())
      : 0;
    const seatSelectTimeMs = Math.max(0, seatSelectedAt.getTime() - captchaPassedAt.getTime());
    // payment_started_at이 있으면 그 시점부터, 없으면 좌석 선택 시점부터 결제 완료까지
    const paymentTimeMs = Math.max(
      0,
      now.getTime() - (paymentStartedAt ?? seatSelectedAt).getTime(),
    );

    // 점수 계산
    const breakdown = calculateScore({
      captchaTimeMs,
      seatSelectTimeMs,
      paymentTimeMs,
      mistakeCount: sim.captcha_mistakes ?? 0,
      difficulty,
    });

    const totalTimeMs = captchaTimeMs + seatSelectTimeMs + paymentTimeMs;

    // (1) simulation_results INSERT — id를 simulation id와 동일하게 박아 1:1 매핑
    const { error: insertErr } = await supabase.from('simulation_results').insert({
      id: id,
      user_id: userId,
      match_id: matchId,
      section_id: sim.selected_section_id,
      score: breakdown.score,
      total_time_ms: totalTimeMs,
      queue_time_ms: 0, // 큐 단계 미구현
      captcha_time_ms: captchaTimeMs,
      seat_select_time_ms: seatSelectTimeMs,
      mistake_count: sim.captcha_mistakes ?? 0,
      success: breakdown.success,
    });
    if (insertErr) throw new HttpError(500, 'INTERNAL_ERROR', `결과 저장 실패: ${insertErr.message}`);

    // (2) simulations UPDATE — payment_completed_at + status COMPLETED + completed_at
    const { error: updateErr } = await supabase
      .from('simulations')
      .update({
        payment_completed_at: now.toISOString(),
        status: 'COMPLETED',
        completed_at: now.toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);
    if (updateErr) {
      // 결과는 저장됐지만 상태 전이 실패. 사용자에겐 결과를 그대로 노출하되 로그.
      console.error('[complete] result inserted but status update failed:', updateErr.message);
    }

    res.json(
      ok({
        simulationId: id,
        score: breakdown.score,
        totalTimeMs,
        captchaTimeMs,
        seatSelectTimeMs,
        paymentTimeMs,
        mistakeCount: sim.captcha_mistakes ?? 0,
        isSuccess: breakdown.success,
        breakdown: breakdown.parts, // 학습/디버깅용 점수 분해
        completedAt: now.toISOString(),
      }),
    );
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/v1/simulation/:id/result   (기존)
// ============================================================

router.get('/:id/result', authRequired, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) throw new HttpError(400, 'INVALID_REQUEST', 'id가 필요합니다.');

    const { data, error } = await supabase
      .from('simulation_results')
      .select(
        `
          id, user_id, score, total_time_ms, queue_time_ms,
          seat_select_time_ms, captcha_time_ms, mistake_count, success, created_at,
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

// ============================================================
// ─────────────────── 내부 헬퍼 ───────────────────
// ============================================================

async function loadInProgressSim(id: string, userId: string) {
  const { data, error } = await supabase
    .from('simulations')
    .select(
      `id, user_id, status,
       captcha_issued_at, captcha_answer_hash, captcha_passed_at, captcha_mistakes,
       sold_out_seed, selected_section_id, seat_selected_at,
       payment_started_at, payment_completed_at`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
  if (!data) throw new HttpError(404, 'NOT_FOUND', '시뮬을 찾을 수 없습니다.');
  if (data.user_id !== userId) throw new HttpError(403, 'FORBIDDEN', '본인의 시뮬이 아닙니다.');
  if (data.status !== 'IN_PROGRESS') {
    throw new HttpError(409, 'NOT_IN_PROGRESS', `현재 상태(${data.status})에선 진행할 수 없습니다.`);
  }
  return data;
}

async function reissueCaptcha(
  id: string,
  userId: string,
  opts: { incrementMistakes?: boolean } = {},
) {
  const issued = generateCaptcha();

  if (opts.incrementMistakes) {
    const { data: cur, error: readErr } = await supabase
      .from('simulations')
      .select('captcha_mistakes')
      .eq('id', id)
      .single();
    if (readErr) throw new HttpError(500, 'INTERNAL_ERROR', readErr.message);
    if (!cur) throw new HttpError(404, 'NOT_FOUND', '시뮬을 찾을 수 없습니다.');

    const { error } = await supabase
      .from('simulations')
      .update({
        captcha_issued_at: issued.issuedAt.toISOString(),
        captcha_answer_hash: issued.answerHash,
        captcha_mistakes: (cur.captcha_mistakes ?? 0) + 1,
      })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
  } else {
    const { error } = await supabase
      .from('simulations')
      .update({
        captcha_issued_at: issued.issuedAt.toISOString(),
        captcha_answer_hash: issued.answerHash,
      })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
  }

  return issued;
}

async function suggestAlternatives(args: {
  stadiumId: number;
  seed: number;
  difficulty: string;
  excludeId: number;
}) {
  const { data: sections, error } = await supabase
    .from('sections')
    .select('id, name, popularity')
    .eq('stadium_id', args.stadiumId)
    .neq('id', args.excludeId);
  if (error || !sections) return [];

  return sections
    .map((s) => ({
      sectionId: s.id,
      name: s.name,
      ...evaluateSection({
        seed: args.seed,
        sectionId: s.id,
        popularity: s.popularity ?? 3,
        difficulty: args.difficulty,
      }),
    }))
    .filter((s) => !s.isSoldOut)
    .sort((a, b) => a.soldOutScore - b.soldOutScore)
    .slice(0, 3)
    .map(({ sectionId, name }) => ({ sectionId, name }));
}

export default router;
