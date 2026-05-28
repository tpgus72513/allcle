BEGIN;

ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS queue_entered_at timestamptz;

-- 폴링이 자주 오니까 (sim_id, queue_entered_at) 조회를 빠르게
CREATE INDEX IF NOT EXISTS idx_simulations_queue_entered
  ON simulations (id) WHERE queue_entered_at IS NOT NULL;

COMMIT;