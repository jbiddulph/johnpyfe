#!/usr/bin/env python3
"""
Fetch and cache Google Places photos for all UK town hub pages.

Towns are loaded from the City table plus distinct live Venue.town values
(filtered with the same plausibility rules as listTownSlugs()).

Requires:
  pip install -r scripts/requirements-enrich.txt

Environment (.env in project root):
  DATABASE_URL or DIRECT_URL
  GOOGLE_PLACES_API_KEY

Run scripts/sql/town_images.sql or prisma migrate deploy first.

Examples:
  python scripts/enrich_town_images.py
  python scripts/enrich_town_images.py --limit 20
  python scripts/enrich_town_images.py --skip-existing
  python scripts/enrich_town_images.py --force --limit 5
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
SEARCH_FIELD_MASK = "places.name,places.displayName,places.formattedAddress,places.types"
DETAILS_FIELD_MASK = "displayName,photos"
MAX_PHOTO_URL_LEN = 2000


def clean(value: object) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def slugify(value: str) -> str:
    s = value.strip().lower().replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def is_plausible_town_name(value: object) -> bool:
    s = clean(value)
    if not s:
        return False
    if re.match(r"^\d", s):
        return False
    if len(s) > 40:
        return False
    if re.search(r"[,.]", s):
        return False
    lower = s.lower()
    if re.search(
        r"\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|way|place|pl|hill|terrace|crescent|close)\b",
        lower,
    ):
        return False
    words = s.split()
    if not words or len(words) > 4:
        return False
    return True


def db_url() -> str:
    url = os.environ.get("DIRECT_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("Set DATABASE_URL or DIRECT_URL in .env", file=sys.stderr)
        sys.exit(1)
    return url


def api_key() -> str:
    key = os.environ.get("GOOGLE_PLACES_API_KEY") or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        print("Set GOOGLE_PLACES_API_KEY in .env", file=sys.stderr)
        sys.exit(1)
    return key


def place_details(key: str, place_name: str) -> dict | None:
    resp = requests.get(
        f"https://places.googleapis.com/v1/{place_name}",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": DETAILS_FIELD_MASK,
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Place Details {resp.status_code}: {resp.text[:200]}")
    return resp.json()


def search_place(key: str, query: str) -> dict | None:
    resp = requests.post(
        PLACES_SEARCH_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": SEARCH_FIELD_MASK,
        },
        json={"textQuery": query, "regionCode": "GB", "maxResultCount": 1},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Places Search {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    places = data.get("places") or []
    if not places:
        return None
    place_name = places[0].get("name")
    if not place_name:
        return None
    return place_details(key, place_name)


def photo_attribution(place: dict | None) -> str | None:
    if not place:
        return None
    photos = place.get("photos") or []
    if not photos:
        return None
    attrs = photos[0].get("authorAttributions") or []
    if not attrs:
        return None
    return clean(attrs[0].get("displayName"))


def fetch_photo_url(key: str, place: dict | None) -> str | None:
    if not place:
        return None
    photos = place.get("photos") or []
    if not photos:
        return None
    photo_name = photos[0].get("name")
    if not photo_name:
        return None

    resp = requests.get(
        f"https://places.googleapis.com/v1/{photo_name}/media",
        headers={"X-Goog-Api-Key": key},
        params={"maxHeightPx": 800, "maxWidthPx": 1200},
        allow_redirects=False,
        timeout=30,
    )
    if resp.status_code in (301, 302, 303, 307, 308):
        url = clean(resp.headers.get("Location"))
    else:
        return None

    if not url or not url.startswith(("http://", "https://")):
        return None
    if "key=" in url.lower():
        raise RuntimeError("Refusing to store photo URL containing API key")
    if len(url) > MAX_PHOTO_URL_LEN:
        url = url[:MAX_PHOTO_URL_LEN]
    return url


def town_search_query(display_name: str) -> str:
    return f"{display_name} UK town"


def upsert_image(cur, slug: str, photo_url: str, attribution: str | None) -> None:
    now = datetime.now(timezone.utc)
    cur.execute(
        """
        INSERT INTO town_images (slug, photo_url, attribution, updated_at)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
          photo_url = EXCLUDED.photo_url,
          attribution = EXCLUDED.attribution,
          updated_at = EXCLUDED.updated_at
        """,
        (slug, photo_url, attribution, now),
    )


def load_towns(cur) -> list[tuple[str, str]]:
    """Return (slug, display_name) sorted by slug — mirrors listTownSlugs()."""
    by_slug: dict[str, str] = {}

    cur.execute('SELECT slug, name FROM "City" ORDER BY name ASC')
    for row in cur.fetchall():
        slug = clean(row.get("slug"))
        name = clean(row.get("name"))
        if slug and name:
            by_slug[slug] = name

    cur.execute(
        """
        SELECT town
        FROM "Venue"
        WHERE is_live = '1' AND town IS NOT NULL AND trim(town) <> ''
        GROUP BY town
        ORDER BY town ASC
        """
    )
    for row in cur.fetchall():
        name = clean(row.get("town"))
        if not name or not is_plausible_town_name(name):
            continue
        slug = slugify(name)
        if not slug or slug in by_slug:
            continue
        by_slug[slug] = name

    return sorted(by_slug.items(), key=lambda item: item[0])


def load_cached_slugs(cur) -> set[str]:
    cur.execute("SELECT slug FROM town_images")
    rows = cur.fetchall()
    slugs: set[str] = set()
    for row in rows:
        value = row["slug"] if isinstance(row, dict) else row[0]
        slug = clean(value)
        if slug:
            slugs.add(slug)
    return slugs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cache Places photos for UK town hub pages.")
    parser.add_argument("--limit", type=int, default=None, help="Max towns to process")
    parser.add_argument("--delay", type=int, default=250, help="Delay between API calls (ms)")
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        default=True,
        help="Skip towns already in town_images (default)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-fetch even when a cached image exists",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    key = api_key()
    skip_existing = args.skip_existing and not args.force

    conn = psycopg2.connect(db_url())
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            towns = load_towns(cur)
            cached = load_cached_slugs(cur) if skip_existing else set()

            pending = [(slug, name) for slug, name in towns if slug not in cached]
            if args.limit:
                pending = pending[: args.limit]

            print(f"Hub towns in database: {len(towns)}")
            print(f"Already cached: {len(cached)}")
            print(f"To process: {len(pending)}")

            updated = 0
            skipped = 0
            failed = 0

            for index, (slug, display_name) in enumerate(pending, start=1):
                query = town_search_query(display_name)
                try:
                    place = search_place(key, query)
                    photo_url = fetch_photo_url(key, place)
                    if not photo_url:
                        skipped += 1
                        print(f"[{index}/{len(pending)}] No photo: {display_name} ({slug})")
                    else:
                        upsert_image(cur, slug, photo_url, photo_attribution(place))
                        conn.commit()
                        updated += 1
                        print(f"[{index}/{len(pending)}] Cached: {display_name} ({slug})")
                except Exception as exc:
                    conn.rollback()
                    failed += 1
                    print(f"[{index}/{len(pending)}] Failed {display_name}: {exc}", file=sys.stderr)

                if index % 25 == 0:
                    print(f"Progress: {index}/{len(pending)} — updated {updated}, skipped {skipped}, failed {failed}")

                time.sleep(args.delay / 1000)

            print(f"Done. Updated {updated}, no photo {skipped}, failed {failed}, total processed {len(pending)}.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
