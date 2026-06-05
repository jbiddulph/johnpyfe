-- Example Brighton venue features (manually researched — verify before bulk use)
-- Table: public."Venue"  |  Column: features (varchar 5000)
-- Format: bullet list, one feature per line
--
-- All 284 Brighton pubs need individual research or the generator script:
--   GOOGLE_PLACES_API_KEY=... node scripts/generate-venue-features-sql.mjs --town Brighton --limit 284 --out brighton-all.sql
--
-- Preview rows without features:
-- SELECT id, venuename, postcode FROM "Venue" WHERE is_live = '1' AND town ILIKE 'brighton' AND (features IS NULL OR features = '') ORDER BY venuename;

BEGIN;

-- Battle of Trafalgar, 34 Guildford Road (id 22054) — CAMRA / brighton.dog / pub site
UPDATE "Venue"
SET features = E'• Beer garden\n• Dog friendly\n• Food served\n• Real ale / cask ale (5 hand pumps)\n• Traditional pub',
    updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
WHERE id = 22054
  AND town ILIKE 'brighton';

-- Bulk pattern: add more rows as (id, features) pairs
-- UPDATE "Venue" AS v
-- SET features = x.features,
--     updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
-- FROM (VALUES
--   (22057, E'• …\n• …'),
--   (22058, E'• …\n• …')
-- ) AS x(id, features)
-- WHERE v.id = x.id
--   AND v.town ILIKE 'brighton';

COMMIT;

-- Rollback test batch if needed:
-- UPDATE "Venue" SET features = NULL WHERE town ILIKE 'brighton' AND id IN (22054);
