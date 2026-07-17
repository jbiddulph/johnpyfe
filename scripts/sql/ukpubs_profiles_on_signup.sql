-- UK Pubs: create ukpubs_profiles for new AND existing auth users
-- Run in Supabase SQL editor (requires access to auth.users).
-- Safe to re-run: replaces the function/trigger and backfills missing rows only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ukpubs_ensure_profile_for_auth_user(
  p_user_id uuid,
  p_email text,
  p_raw_user_meta_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display text;
  base_username text;
  candidate text;
  i int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ukpubs_profiles WHERE user_id = p_user_id::text
  ) THEN
    RETURN;
  END IF;

  display := coalesce(
    nullif(trim(p_raw_user_meta_data->>'name'), ''),
    nullif(trim(p_raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
    'User'
  );

  base_username := lower(regexp_replace(display, '[^a-z0-9_]+', '_', 'g'));
  base_username := regexp_replace(base_username, '_+', '_', 'g');
  base_username := trim(both '_' from base_username);
  base_username := left(base_username, 24);

  IF base_username IS NULL OR char_length(base_username) < 3 THEN
    base_username := 'user';
  END IF;

  FOR i IN 0..24 LOOP
    IF i = 0 THEN
      candidate := base_username;
    ELSE
      candidate := left(base_username, 20) || (i + 1)::text;
    END IF;

    BEGIN
      INSERT INTO public.ukpubs_profiles (user_id, username, display_name)
      VALUES (p_user_id::text, candidate, display);
      RETURN;
    EXCEPTION
      WHEN unique_violation THEN
        -- username taken; try next suffix
        NULL;
    END;
  END LOOP;

  candidate := 'user_' || left(replace(p_user_id::text, '-', ''), 12);
  INSERT INTO public.ukpubs_profiles (user_id, username, display_name)
  VALUES (p_user_id::text, candidate, display)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.ukpubs_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ukpubs_ensure_profile_for_auth_user(
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ukpubs_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_ukpubs_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.ukpubs_handle_new_auth_user();

-- Backfill existing auth users who signed up before this trigger existed
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.ukpubs_profiles p ON p.user_id = u.id::text
    WHERE p.user_id IS NULL
  LOOP
    PERFORM public.ukpubs_ensure_profile_for_auth_user(
      r.id,
      r.email,
      r.raw_user_meta_data
    );
  END LOOP;
END;
$$;
