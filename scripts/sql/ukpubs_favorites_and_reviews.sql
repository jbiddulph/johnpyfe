-- UK Pubs: favourite pubs and five-star reviews
-- =============================================================================
-- Run this in the Supabase SQL editor (full script in one go), or:
--   psql $DATABASE_URL -f scripts/sql/ukpubs_favorites_and_reviews.sql
--
-- Tables (prefixed ukpubs_):
--   ukpubs_favorites — one favourite per user + venue (user_id = Auth UUID)
--   ukpubs_reviews   — one 1–5 star review + comment per user + venue
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Favourites
CREATE TABLE IF NOT EXISTS public.ukpubs_favorites (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    venue_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ukpubs_favorites_user_id_venue_id_key
    ON public.ukpubs_favorites (user_id, venue_id);

CREATE INDEX IF NOT EXISTS ukpubs_favorites_user_id_created_at_idx
    ON public.ukpubs_favorites (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ukpubs_favorites_venue_id_idx
    ON public.ukpubs_favorites (venue_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_favorites_venue_id_fkey'
    ) THEN
        ALTER TABLE public.ukpubs_favorites
            ADD CONSTRAINT ukpubs_favorites_venue_id_fkey
            FOREIGN KEY (venue_id) REFERENCES public."Venue" (id)
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 2) Reviews
CREATE TABLE IF NOT EXISTS public.ukpubs_reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    venue_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ukpubs_reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- Rating check may be missing on older copies of the table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_reviews_rating_check'
    ) THEN
        ALTER TABLE public.ukpubs_reviews
            ADD CONSTRAINT ukpubs_reviews_rating_check
            CHECK (rating >= 1 AND rating <= 5);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ukpubs_reviews_user_id_venue_id_key
    ON public.ukpubs_reviews (user_id, venue_id);

CREATE INDEX IF NOT EXISTS ukpubs_reviews_venue_id_created_at_idx
    ON public.ukpubs_reviews (venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ukpubs_reviews_user_id_idx
    ON public.ukpubs_reviews (user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_reviews_venue_id_fkey'
    ) THEN
        ALTER TABLE public.ukpubs_reviews
            ADD CONSTRAINT ukpubs_reviews_venue_id_fkey
            FOREIGN KEY (venue_id) REFERENCES public."Venue" (id)
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.ukpubs_reviews_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ukpubs_reviews_updated_at ON public.ukpubs_reviews;
CREATE TRIGGER ukpubs_reviews_updated_at
    BEFORE UPDATE ON public.ukpubs_reviews
    FOR EACH ROW
    EXECUTE PROCEDURE public.ukpubs_reviews_set_updated_at();

-- 4) RLS — Prisma (table owner) still bypasses these policies
ALTER TABLE public.ukpubs_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ukpubs_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ukpubs_favorites_select_own ON public.ukpubs_favorites;
CREATE POLICY ukpubs_favorites_select_own ON public.ukpubs_favorites
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS ukpubs_favorites_insert_own ON public.ukpubs_favorites;
CREATE POLICY ukpubs_favorites_insert_own ON public.ukpubs_favorites
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS ukpubs_favorites_delete_own ON public.ukpubs_favorites;
CREATE POLICY ukpubs_favorites_delete_own ON public.ukpubs_favorites
    FOR DELETE TO authenticated
    USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS ukpubs_reviews_select_all ON public.ukpubs_reviews;
CREATE POLICY ukpubs_reviews_select_all ON public.ukpubs_reviews
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS ukpubs_reviews_insert_own ON public.ukpubs_reviews;
CREATE POLICY ukpubs_reviews_insert_own ON public.ukpubs_reviews
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS ukpubs_reviews_update_own ON public.ukpubs_reviews;
CREATE POLICY ukpubs_reviews_update_own ON public.ukpubs_reviews
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS ukpubs_reviews_delete_own ON public.ukpubs_reviews;
CREATE POLICY ukpubs_reviews_delete_own ON public.ukpubs_reviews
    FOR DELETE TO authenticated
    USING (user_id = auth.uid()::text);

GRANT SELECT, INSERT, DELETE ON public.ukpubs_favorites TO authenticated;
GRANT SELECT ON public.ukpubs_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ukpubs_reviews TO authenticated;
