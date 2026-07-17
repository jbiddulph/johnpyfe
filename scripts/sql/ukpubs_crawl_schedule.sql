-- UK Pubs: crawl start time + notes for invitees
-- =============================================================================
-- Run in the Supabase SQL editor after ukpubs_pub_crawls.sql.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================================

ALTER TABLE public.ukpubs_crawls
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NULL;

ALTER TABLE public.ukpubs_crawls
    ADD COLUMN IF NOT EXISTS invitee_notes TEXT NULL;

COMMENT ON COLUMN public.ukpubs_crawls.starts_at IS
    'When the pub crawl is planned to start (shown to invitees).';

COMMENT ON COLUMN public.ukpubs_crawls.invitee_notes IS
    'Optional notes for invitees (dress code, meet-up tip, etc.).';
