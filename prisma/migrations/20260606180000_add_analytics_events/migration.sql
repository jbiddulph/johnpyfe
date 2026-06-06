-- CreateTable
CREATE TABLE "analytics_events" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "page_type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "entity_id" INTEGER,
    "label" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");
CREATE INDEX "analytics_events_page_type_entity_id_idx" ON "analytics_events"("page_type", "entity_id");
CREATE INDEX "analytics_events_path_idx" ON "analytics_events"("path");
