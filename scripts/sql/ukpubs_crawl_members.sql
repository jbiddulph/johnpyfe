-- UK Pubs: pub crawl profiles, members (invites), and notifications
-- Safe to re-run. Fixes partial creates where ukpubs_profiles existed without username.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.ukpubs_crawls
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- ---------------------------------------------------------------------------
-- Profiles (create skeleton, then add columns — avoids IF NOT EXISTS skipping
-- a broken older table shape)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ukpubs_profiles (
    user_id TEXT PRIMARY KEY
);

ALTER TABLE public.ukpubs_profiles
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Defaults for any existing empty rows
UPDATE public.ukpubs_profiles
SET
    username = COALESCE(
        NULLIF(username, ''),
        'user_' || substr(replace(user_id, '-', ''), 1, 12)
    ),
    display_name = COALESCE(NULLIF(display_name, ''), 'User'),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE username IS NULL
   OR display_name IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.ukpubs_profiles
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN display_name SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE public.ukpubs_profiles
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE public.ukpubs_profiles
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE public.ukpubs_profiles
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Constraints (add only if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_profiles_username_len'
    ) THEN
        ALTER TABLE public.ukpubs_profiles
            ADD CONSTRAINT ukpubs_profiles_username_len
            CHECK (char_length(username) >= 3 AND char_length(username) <= 32);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_profiles_username_format'
    ) THEN
        ALTER TABLE public.ukpubs_profiles
            ADD CONSTRAINT ukpubs_profiles_username_format
            CHECK (username ~ '^[a-z0-9_]+$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ukpubs_profiles_display_not_blank'
    ) THEN
        ALTER TABLE public.ukpubs_profiles
            ADD CONSTRAINT ukpubs_profiles_display_not_blank
            CHECK (char_length(trim(display_name)) > 0);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ukpubs_profiles_username_uidx
    ON public.ukpubs_profiles (username);

CREATE INDEX IF NOT EXISTS ukpubs_profiles_username_idx
    ON public.ukpubs_profiles (username);

-- ---------------------------------------------------------------------------
-- Crawl members (invites)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
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
