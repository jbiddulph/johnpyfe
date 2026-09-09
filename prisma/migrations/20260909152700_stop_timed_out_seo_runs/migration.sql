ALTER TABLE "ai_seo_runs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ai_seo_runs"
SET
  status = 'stopped',
  finished_at = NOW(),
  updated_at = NOW(),
  error = jsonb_build_object(
    'message',
    'Stopped: the background worker timed out around 112 listings (Netlify 15-minute limit) before finishing the requested 500.'
  )
WHERE status = 'running'
  AND finished_at IS NULL;
