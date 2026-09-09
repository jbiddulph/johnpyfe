CREATE TABLE "venue_seo_recommendations" (
  "id" TEXT NOT NULL,
  "venue_id" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "improvement_count" INTEGER NOT NULL DEFAULT 0,
  "analysis" JSONB NOT NULL,
  "changes" JSONB NOT NULL,
  "warnings" JSONB,
  "sources" JSONB,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "applied_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "venue_seo_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_seo_runs" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "requested_limit" INTEGER NOT NULL,
  "processed_count" INTEGER NOT NULL DEFAULT 0,
  "applied_count" INTEGER NOT NULL DEFAULT 0,
  "drafted_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "error" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),

  CONSTRAINT "ai_seo_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "venue_seo_recommendations_venue_id_status_idx" ON "venue_seo_recommendations"("venue_id", "status");
CREATE INDEX "venue_seo_recommendations_status_generated_at_idx" ON "venue_seo_recommendations"("status", "generated_at" DESC);
CREATE INDEX "ai_seo_runs_status_started_at_idx" ON "ai_seo_runs"("status", "started_at" DESC);

ALTER TABLE "venue_seo_recommendations"
  ADD CONSTRAINT "venue_seo_recommendations_venue_id_fkey"
  FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "venue_seo_recommendations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_seo_runs" ENABLE ROW LEVEL SECURITY;
