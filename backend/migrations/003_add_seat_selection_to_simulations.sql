-- ============================================================
-- 003_add_seat_selection_to_simulations.sql
-- 시뮬레이션의 좌석 선택 단계를 추적하기 위한 컬럼들.
--
-- 설계 메모:
--  - "결정론적 가짜 매진": 시뮬 시작 시점에 sold_out_seed라는 랜덤 정수를
--    한 번만 박아두고, 이후 매진 여부 판정은 (seed, sectionId, popularity,
--    difficulty)의 함수로 매번 다시 계산함. 같은 seed면 항상 같은 결과 →
--    클라이언트가 새로고침해도 매진 패턴이 바뀌지 않음 (UX 일관성).
--  - DB에 "어떤 섹션이 매진됐는가"를 미리 펼쳐 저장하지 않는 이유: 섹션 수가
--    구장마다 다르고, 룰이 바뀌면 마이그레이션이 필요해짐. seed만 박아두면
--    룰은 코드 한 곳(services/seatAvailability.service.ts)에서 자유롭게 진화.
--  - selected_section_id는 sections(id)를 FK로 참조. 사용자가 매진 안 된
--    섹션만 고를 수 있게 코드 레벨에서 검증.
--
-- 적용 방법:
--   Supabase Dashboard → SQL Editor → 이 파일 통째로 붙여넣고 Run.
--   001, 002가 먼저 실행돼 있어야 함.
-- ============================================================

BEGIN;

ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS sold_out_seed       int4        NOT NULL
                                                DEFAULT (floor(random() * 2147483647))::int4,
  ADD COLUMN IF NOT EXISTS selected_section_id int4        REFERENCES sections(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS seat_selected_at    timestamptz;

-- 진입 가드 + 정합성 체크
--  - 좌석을 선택하려면 반드시 captcha를 통과한 상태여야 한다.
--    (captcha_passed_at IS NOT NULL)
--  - 좌석 선택 시각이 있다면 selected_section_id도 같이 있어야 한다.
ALTER TABLE simulations
  DROP CONSTRAINT IF EXISTS chk_seat_after_captcha;

ALTER TABLE simulations
  ADD CONSTRAINT chk_seat_after_captcha CHECK (
    seat_selected_at IS NULL
    OR (
      captcha_passed_at IS NOT NULL
      AND selected_section_id IS NOT NULL
      AND seat_selected_at >= captcha_passed_at
    )
  );

-- 좌석 선택된 시뮬만 빠르게 찾는 부분 인덱스 (다음 단계: 결제로 가는 후보들)
CREATE INDEX IF NOT EXISTS idx_simulations_seat_selected
  ON simulations (user_id) WHERE seat_selected_at IS NOT NULL;

COMMIT;

-- ============================================================
-- (선택) 롤백
-- ============================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_simulations_seat_selected;
-- ALTER TABLE simulations DROP CONSTRAINT IF EXISTS chk_seat_after_captcha;
-- ALTER TABLE simulations
--   DROP COLUMN IF EXISTS seat_selected_at,
--   DROP COLUMN IF EXISTS selected_section_id,
--   DROP COLUMN IF EXISTS sold_out_seed;
-- COMMIT;
