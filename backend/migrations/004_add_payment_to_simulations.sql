-- ============================================================
-- 004_add_payment_to_simulations.sql
-- 시뮬레이션의 결제 단계 timestamp 추가 + 최종 정합성 가드.
--
-- 설계 메모:
--  - 실제 PG(토스/카카오페이) 연동은 안 함. "결제 페이지에서 머무는 시간"을
--    점수에 반영하기 위한 timestamp만 추적.
--  - payment_started_at은 옵션 — FE가 결제 페이지 진입 시 호출. 만약 호출
--    안 하고 바로 complete가 오면, 코드 레벨에서 seat_selected_at로 fallback.
--  - 시뮬이 COMPLETED로 전이되는 트리거가 POST /:id/complete 하나로 통일됨.
--
-- 적용 방법:
--   Supabase Dashboard → SQL Editor → 통째로 붙여넣고 Run.
--   001, 002, 003 마이그레이션이 먼저 적용돼 있어야 함.
-- ============================================================

BEGIN;

ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS payment_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz;

-- 정합성 가드:
--  - 결제 시작은 반드시 좌석 선택 이후
--  - 결제 완료는 반드시 결제 시작 시점과 같거나 이후
--    (단, 결제 시작 없이 바로 완료된 경우는 허용 — payment_started_at IS NULL일 때 통과)
ALTER TABLE simulations
  DROP CONSTRAINT IF EXISTS chk_payment_time_order;

ALTER TABLE simulations
  ADD CONSTRAINT chk_payment_time_order CHECK (
    (payment_started_at IS NULL OR seat_selected_at IS NOT NULL AND payment_started_at >= seat_selected_at)
    AND
    (payment_completed_at IS NULL
     OR (seat_selected_at IS NOT NULL AND payment_completed_at >= seat_selected_at
         AND (payment_started_at IS NULL OR payment_completed_at >= payment_started_at)))
  );

-- COMPLETED 상태로 전이됐다면 반드시 결제 완료 시점이 있어야 함.
-- (반대로 결제 완료 시점만 있고 status는 IN_PROGRESS인 경우는 허용 안 함 → 별도 가드)
ALTER TABLE simulations
  DROP CONSTRAINT IF EXISTS chk_completed_status_has_payment;

ALTER TABLE simulations
  ADD CONSTRAINT chk_completed_status_has_payment CHECK (
    status <> 'COMPLETED' OR payment_completed_at IS NOT NULL
  );

COMMIT;

-- ============================================================
-- (선택) 롤백
-- ============================================================
-- BEGIN;
-- ALTER TABLE simulations DROP CONSTRAINT IF EXISTS chk_completed_status_has_payment;
-- ALTER TABLE simulations DROP CONSTRAINT IF EXISTS chk_payment_time_order;
-- ALTER TABLE simulations
--   DROP COLUMN IF EXISTS payment_completed_at,
--   DROP COLUMN IF EXISTS payment_started_at;
-- COMMIT;
