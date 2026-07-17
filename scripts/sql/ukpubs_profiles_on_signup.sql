-- UK Pubs: create ukpubs_profiles row when a new auth user signs up
-- Run in Supabase SQL editor (requires access to auth.users).
-- Safe to re-run: replaces the function and recreates the trigger.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ukpubs_handle_new_auth_user()
RETURNS trigger
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
  display := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'name'), ''),
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
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
      VALUES (NEW.id::text, candidate, display)
      ON CONFLICT (user_id) DO NOTHING;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        -- username taken; try next suffix
        NULL;
    END;
  END LOOP;

  -- Final fallback if every candidate collided
  IF NOT EXISTS (
    SELECT 1 FROM public.ukpubs_profiles WHERE user_id = NEW.id::text
  ) THEN
    candidate := 'user_' || left(replace(NEW.id::text, '-', ''), 12);
    INSERT INTO public.ukpubs_profiles (user_id, username, display_name)
    VALUES (NEW.id::text, candidate, display)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ukpubs_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_ukpubs_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.ukpubs_handle_new_auth_user();
