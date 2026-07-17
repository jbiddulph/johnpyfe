-- UK Pubs: repair broken ukpubs_profiles + create members/notifications
-- Use this if you hit: column "username" / "user_id" does not exist
-- Safe when profiles table is empty / unused (app recreates usernames on next visit).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.ukpubs_crawls
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- Drop broken/partial profiles table and recreate cleanly
DROP TABLE IF EXISTS public.ukpubs_profiles CASCADE;

CREATE TABLE public.ukpubs_profiles (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ukpubs_profiles_username_len
        CHECK (char_length(username) >= 3 AND char_length(username) <= 32),
    CONSTRAINT ukpubs_profiles_username_format
        CHECK (username ~ '^[a-z0-9_]+$'),
    CONSTRAINT ukpubs_profiles_display_not_blank
        CHECK (char_length(trim(display_name)) > 0)
);

CREATE UNIQUE INDEX ukpubs_profiles_username_uidx
    ON public.ukpubs_profiles (username);

CREATE INDEX ukpubs_profiles_username_idx
    ON public.ukpubs_profiles (username);

-- Members (invites)
CREATE TABLE IF NOT EXISTS public.ukpubs_crawl_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_crawl_members_crawl_id_fkey'
    ) THEN
        ALTER TABLE public.ukpubs_crawl_members
            ADD CONSTRAINT ukpubs_crawl_members_crawl_id_fkey
            FOREIGN KEY (crawl_id) REFERENCES public.ukpubs_crawls (id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_crawl_members_status_check'
    ) THEN
        ALTER TABLE public.ukpubs_crawl_members
            ADD CONSTRAINT ukpubs_crawl_members_status_check
            CHECK (status IN ('pending', 'accepted', 'declined'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ukpubs_crawl_members_crawl_user_uidx
    ON public.ukpubs_crawl_members (crawl_id, user_id);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_members_user_status_idx
    ON public.ukpubs_crawl_members (user_id, status);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_members_crawl_status_idx
    ON public.ukpubs_crawl_members (crawl_id, status);

-- Notifications
CREATE TABLE IF NOT EXISTS public.ukpubs_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NULL,
    link TEXT NULL,
    crawl_id UUID NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_notifications_crawl_id_fkey'
    ) THEN
        ALTER TABLE public.ukpubs_notifications
            ADD CONSTRAINT ukpubs_notifications_crawl_id_fkey
            FOREIGN KEY (crawl_id) REFERENCES public.ukpubs_crawls (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ukpubs_notifications_user_created_idx
    ON public.ukpubs_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ukpubs_notifications_user_unread_idx
    ON public.ukpubs_notifications (user_id)
    WHERE read_at IS NULL;
