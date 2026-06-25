ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

UPDATE generation_jobs
SET lease_expires_at = COALESCE(started_at, updated_at, now()) + interval '10 minutes'
WHERE status = 'running'
  AND lease_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS generation_jobs_status_lease_idx
  ON generation_jobs (status, lease_expires_at);
