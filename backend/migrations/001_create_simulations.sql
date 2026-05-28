-- ============================================================
-- 001_create_simulations.sql
-- 진행 중/완료된 시뮬레이션 세션을 추적하는 테이블.
--
-- 명세서 §3.3은 진행 중 시뮬을 Redis Hash로 추적하라고 권장하지만,
-- MVP에선 Supabase 테이블 하나로 통합 (스택 단순화).
--
-- 적용 방법:
--   Supabase Dashboard → SQL Editor → 이 파일 내용 붙여넣고 Run.
-- 실패 시: 기존에 simulations 테이블/타입이 있으면 충돌 → 끝의 DROP 블록 주석 해제.
-- ============================================================

BEGIN;

-- status는 ENUM 대신 text + CHECK 제약으로. 나중에 값 추가/변경이 쉬움.
CREATE TABLE IF NOT EXISTS simulations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  match_id      int4        NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  status        text        NOT NULL DEFAULT 'IN_PROGRESS'
                CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

-- 자주 쓰는 쿼리에 맞춰 인덱스 2개:
-- 1) 특정 유저의 진행 중 시뮬 찾기 (POST /simulation에서 호출됨)
-- 2) 특정 매치의 시뮬 목록 (통계용)
CREATE INDEX IF NOT EXISTS idx_simulations_user_status  ON simulations (user_id, status);
CREATE INDEX IF NOT EXISTS idx_simulations_match        ON simulations (match_id);

-- 한 유저당 IN_PROGRESS는 최대 1개 — 부분 유니크 인덱스로 강제.
-- (Postgres에선 partial unique index가 ENUM·CHECK과 잘 어울림)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_simulations_user_in_progress
  ON simulations (user_id) WHERE status = 'IN_PROGRESS';

COMMIT;

-- ============================================================
-- (선택) 롤백 / 재시작용 — 위 블록 실패할 때만 주석 해제 후 실행
-- ============================================================
-- BEGIN;
-- DROP INDEX IF EXISTS uniq_simulations_user_in_progress;
-- DROP INDEX IF EXISTS idx_simulations_match;
-- DROP INDEX IF EXISTS idx_simulations_user_status;
-- DROP TABLE IF EXISTS simulations;
-- COMMIT;
