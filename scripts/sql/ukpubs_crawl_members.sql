-- UK Pubs: pub crawl profiles, members (invites), and notifications
-- Run manually in Supabase SQL editor after ukpubs_crawls / ukpubs_crawl_stops exist.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Mark crawls as completed (owner can complete; used by dashboard sections)
ALTER TABLE public.ukpubs_crawls
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- Public searchable identity for invites (not Auth Admin search)
CREATE TABLE IF NOT EXISTS public.ukpubs_profiles (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ukpubs_profiles_username_len CHECK (
        char_length(username) >= 3 AND char_length(username) <= 32
    ),
    CONSTRAINT ukpubs_profiles_username_format CHECK (
        username ~ '^[a-z0-9_]+$'
    ),
    CONSTRAINT ukpubs_profiles_display_not_blank CHECK (
        char_length(trim(display_name)) > 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ukpubs_profiles_username_uidx
    ON public.ukpubs_profiles (username);

CREATE INDEX IF NOT EXISTS ukpubs_profiles_username_trgm_idx
    ON public.ukpubs_profiles (username);

-- Users invited onto / joined on a crawl (owner remains ukpubs_crawls.user_id)
CREATE TABLE IF NOT EXISTS public.ukpubs_crawl_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_id UUID NOT NULL REFERENCES public.ukpubs_crawls (id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ NULL,

    CONSTRAINT ukpubs_crawl_members_status_check
        CHECK (status IN ('pending', 'accepted', 'declined')),
    CONSTRAINT ukpubs_crawl_members_not_self_owner_note CHECK (char_length(user_id) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ukpubs_crawl_members_crawl_user_uidx
    ON public.ukpubs_crawl_members (crawl_id, user_id);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_members_user_status_idx
    ON public.ukpubs_crawl_members (user_id, status);

CREATE INDEX IF NOT EXISTS ukpubs_crawl_members_crawl_status_idx
    ON public.ukpubs_crawl_members (crawl_id, status);

-- Simple in-app notifications (invite received / invite accepted)
CREATE TABLE IF NOT EXISTS public.ukpubs_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NULL,
    link TEXT NULL,
    crawl_id UUID NULL REFERENCES public.ukpubs_crawls (id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ukpubs_notifications_user_created_idx
    ON public.ukpubs_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ukpubs_notifications_user_unread_idx
    ON public.ukpubs_notifications (user_id)
    WHERE read_at IS NULL;
