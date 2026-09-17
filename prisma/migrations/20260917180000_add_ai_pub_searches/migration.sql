CREATE TABLE "ai_pub_searches" (
  "id" TEXT NOT NULL,
  "query" VARCHAR(500) NOT NULL,
  "user_id" TEXT,
  "visitor_id" TEXT,
  "status" TEXT NOT NULL,
  "error" VARCHAR(1000),
  "filters" JSONB,
  "result_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_pub_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_pub_searches_created_at_idx" ON "ai_pub_searches"("created_at" DESC);
CREATE INDEX "ai_pub_searches_visitor_id_created_at_idx" ON "ai_pub_searches"("visitor_id", "created_at");
CREATE INDEX "ai_pub_searches_user_id_created_at_idx" ON "ai_pub_searches"("user_id", "created_at");

ALTER TABLE "ai_pub_searches" ENABLE ROW LEVEL SECURITY;
