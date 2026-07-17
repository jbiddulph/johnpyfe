-- UK Pubs: per-crawl chat messages (creator + accepted members only)
-- Run in Supabase SQL editor after ukpubs_crawls / ukpubs_crawl_members exist.
-- Safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ukpubs_crawl_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ukpubs_crawl_messages_body_not_blank
        CHECK (char_length(trim(body)) > 0),
    CONSTRAINT ukpubs_crawl_messages_body_len
        CHECK (char_length(body) <= 2000)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_crawl_messages_crawl_id_fkey'
    ) THEN
        ALTER TABLE public.ukpubs_crawl_messages
            ADD CONSTRAINT ukpubs_crawl_messages_crawl_id_fkey
            FOREIGN KEY (crawl_id) REFERENCES public.ukpubs_crawls (id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ukpubs_crawl_messages_crawl_created_idx
    ON public.ukpubs_crawl_messages (crawl_id, created_at ASC);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_messages_user_idx
    ON public.ukpubs_crawl_messages (user_id);

-- Optional: enable Supabase Realtime postgres changes on this table
-- (the app uses Realtime broadcast for live chat; this helps if you add DB listeners later)
DO $$
BEGIN
    ALTER TABLE public.ukpubs_crawl_messages REPLICA IDENTITY FULL;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'ukpubs_crawl_messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ukpubs_crawl_messages;
        END IF;
    END IF;
END $$;
