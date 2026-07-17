-- UK Pubs: pub crawl builder tables
-- =============================================================================
-- Run this manually in the Supabase SQL editor (or any Postgres client).
-- Do NOT rely on Prisma migrate for these tables unless you choose to later.
--
-- Tables (prefixed ukpubs_):
--   ukpubs_crawls       — one row per saved crawl (user_id = Supabase Auth UUID)
--   ukpubs_crawl_stops  — ordered stops (venue_id = "Venue".id, nullable for manual entries)
--
-- After running, redeploy / restart the app so Prisma can read the new tables.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ukpubs_crawls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    -- 0-based index of the stop the user is currently at (progress through the crawl)
    current_stop_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ukpubs_crawls_name_not_blank CHECK (char_length(trim(name)) > 0),
    CONSTRAINT ukpubs_crawls_current_stop_nonneg CHECK (current_stop_index >= 0)
);

CREATE INDEX IF NOT EXISTS ukpubs_crawls_user_id_idx
    ON ukpubs_crawls (user_id);

CREATE INDEX IF NOT EXISTS ukpubs_crawls_user_updated_idx
    ON ukpubs_crawls (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ukpubs_crawl_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_id UUID NOT NULL REFERENCES ukpubs_crawls (id) ON DELETE CASCADE,
    -- Null when the stop was typed in manually (not picked from the map / Venue table)
    venue_id INTEGER NULL REFERENCES "Venue" (id) ON DELETE SET NULL,
    venue_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ukpubs_crawl_stops_name_not_blank CHECK (char_length(trim(venue_name)) > 0),
    CONSTRAINT ukpubs_crawl_stops_sort_nonneg CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_stops_crawl_id_idx
    ON ukpubs_crawl_stops (crawl_id, sort_order);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_stops_venue_id_idx
    ON ukpubs_crawl_stops (venue_id);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_stops_user_venue_idx
    ON ukpubs_crawl_stops (venue_id)
    WHERE venue_id IS NOT NULL;

-- Keep updated_at fresh on crawl row changes
CREATE OR REPLACE FUNCTION ukpubs_crawls_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ukpubs_crawls_updated_at ON ukpubs_crawls;
CREATE TRIGGER ukpubs_crawls_updated_at
    BEFORE UPDATE ON ukpubs_crawls
    FOR EACH ROW
    EXECUTE PROCEDURE ukpubs_crawls_set_updated_at();

-- Optional: bump parent crawl.updated_at when stops change
CREATE OR REPLACE FUNCTION ukpubs_crawl_stops_touch_parent()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ukpubs_crawls
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.crawl_id, OLD.crawl_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ukpubs_crawl_stops_touch_parent ON ukpubs_crawl_stops;
CREATE TRIGGER ukpubs_crawl_stops_touch_parent
    AFTER INSERT OR UPDATE OR DELETE ON ukpubs_crawl_stops
    FOR EACH ROW
    EXECUTE PROCEDURE ukpubs_crawl_stops_touch_parent();
