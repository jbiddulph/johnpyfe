CREATE TABLE "site_seo_audits" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "focus" VARCHAR(2000),
  "score" INTEGER,
  "summary" TEXT,
  "findings" JSONB,
  "inventory" JSONB,
  "proposal_count" INTEGER NOT NULL DEFAULT 0,
  "error" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_seo_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_seo_proposals" (
  "id" TEXT NOT NULL,
  "audit_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "rationale" TEXT NOT NULL,
  "impact" TEXT NOT NULL DEFAULT 'medium',
  "effort" TEXT NOT NULL DEFAULT 'low',
  "before" JSONB,
  "after" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_at" TIMESTAMP(3),
  "applied_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_seo_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_seo_page_configs" (
  "page_key" TEXT NOT NULL,
  "title_template" VARCHAR(200),
  "description_template" VARCHAR(500),
  "keywords" VARCHAR(500),
  "intro_text" TEXT,
  "link_title_template" VARCHAR(200),
  "image_alt_template" VARCHAR(200),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_seo_page_configs_pkey" PRIMARY KEY ("page_key")
);

CREATE TABLE "site_seo_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_seo_settings_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "site_seo_audits_status_started_at_idx" ON "site_seo_audits"("status", "started_at" DESC);
CREATE INDEX "site_seo_proposals_audit_id_status_idx" ON "site_seo_proposals"("audit_id", "status");
CREATE INDEX "site_seo_proposals_status_created_at_idx" ON "site_seo_proposals"("status", "created_at" DESC);

ALTER TABLE "site_seo_proposals"
  ADD CONSTRAINT "site_seo_proposals_audit_id_fkey"
  FOREIGN KEY ("audit_id") REFERENCES "site_seo_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_seo_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_seo_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_seo_page_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_seo_settings" ENABLE ROW LEVEL SECURITY;
