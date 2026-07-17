-- UK Pubs: pub crawl builder tables
-- =============================================================================
-- Run this in the Supabase SQL editor (full script in one go).
--
-- Tables (prefixed ukpubs_):
--   ukpubs_crawls       — user_id = Supabase Auth UUID
--   ukpubs_crawl_stops  — venue_id = Venue.id (nullable for manual entries)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Parent crawl table
CREATE TABLE IF NOT EXISTS public.ukpubs_crawls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    -- 0-based index of the stop the user is currently at
    current_stop_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ukpubs_crawls_name_not_blank CHECK (char_length(trim(name)) > 0),
    CONSTRAINT ukpubs_crawls_current_stop_nonneg CHECK (current_stop_index >= 0)
);

CREATE INDEX IF NOT EXISTS ukpubs_crawls_user_id_idx
    ON public.ukpubs_crawls (user_id);

CREATE INDEX IF NOT EXISTS ukpubs_crawls_user_updated_idx
    ON public.ukpubs_crawls (user_id, updated_at DESC);

-- 2) Stops table
-- venue_id is intentionally NOT a DB foreign key so this still works if the
-- Venue table name/schema differs; the app still stores Venue.id here.
CREATE TABLE IF NOT EXISTS public.ukpubs_crawl_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_id UUID NOT NULL,
    venue_id INTEGER NULL,
    venue_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ukpubs_crawl_stops_name_not_blank CHECK (char_length(trim(venue_name)) > 0),
    CONSTRAINT ukpubs_crawl_stops_sort_nonneg CHECK (sort_order >= 0)
);

-- Add crawl FK only if missing (safe to re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ukpubs_crawl_stops_crawl_id_fkey'
    ) THEN
        ALTER TABLE public.ukpubs_crawl_stops
            ADD CONSTRAINT ukpubs_crawl_stops_crawl_id_fkey
            FOREIGN KEY (crawl_id)
            REFERENCES public.ukpubs_crawls (id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ukpubs_crawl_stops_crawl_id_idx
    ON public.ukpubs_crawl_stops (crawl_id, sort_order);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_stops_venue_id_idx
    ON public.ukpubs_crawl_stops (venue_id);

-- 3) updated_at trigger on crawls
CREATE OR REPLACE FUNCTION public.ukpubs_crawls_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ukpubs_crawls_updated_at ON public.ukpubs_crawls;
CREATE TRIGGER ukpubs_crawls_updated_at
    BEFORE UPDATE ON public.ukpubs_crawls
    FOR EACH ROW
    EXECUTE PROCEDURE public.ukpubs_crawls_set_updated_at();

-- 4) Touch parent crawl.updated_at when stops change
CREATE OR REPLACE FUNCTION public.ukpubs_crawl_stops_touch_parent()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ukpubs_crawls
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.crawl_id, OLD.crawl_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ukpubs_crawl_stops_touch_parent ON public.ukpubs_crawl_stops;
CREATE TRIGGER ukpubs_crawl_stops_touch_parent
    AFTER INSERT OR UPDATE OR DELETE ON public.ukpubs_crawl_stops
    FOR EACH ROW
    EXECUTE PROCEDURE public.ukpubs_crawl_stops_touch_parent();
