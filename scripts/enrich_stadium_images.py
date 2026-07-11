#!/usr/bin/env python3
"""
Fetch and cache Google Places photos for Premier League stadium hub cards.

Also supports UK seaside town photos (--seaside-towns) for homepage cards.

Requires:
  pip install -r scripts/requirements-enrich.txt

Environment (.env in project root):
  DATABASE_URL or DIRECT_URL
  GOOGLE_PLACES_API_KEY

Run the stadium_images (and town_images) migration first.

Examples:
  python scripts/enrich_stadium_images.py
  python scripts/enrich_stadium_images.py --limit 5
  python scripts/enrich_stadium_images.py --seaside-towns
  python scripts/enrich_stadium_images.py --seaside-towns --limit 10
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

PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
SEARCH_FIELD_MASK = "places.name,places.displayName,places.formattedAddress,places.types"
DETAILS_FIELD_MASK = "displayName,photos"
MAX_PHOTO_URL_LEN = 2000

# Keys match server/utils/seaside-towns.ts (display names for Places search).
SEASIDE_TOWNS: list[tuple[str, str]] = [
    ("brighton", "Brighton"),
    ("worthing", "Worthing"),
    ("bournemouth", "Bournemouth"),
    ("portsmouth", "Portsmouth"),
    ("southampton", "Southampton"),
    ("eastbourne", "Eastbourne"),
    ("hastings", "Hastings"),
    ("margate", "Margate"),
    ("dover", "Dover"),
    ("southend-on-sea", "Southend-on-Sea"),
    ("clacton", "Clacton-on-Sea"),
    ("great-yarmouth", "Great Yarmouth"),
    ("lowestoft", "Lowestoft"),
    ("southwold", "Southwold"),
    ("felixstowe", "Felixstowe"),
    ("blackpool", "Blackpool"),
    ("southport", "Southport"),
    ("morecambe", "Morecambe"),
    ("scarborough", "Scarborough"),
    ("whitby", "Whitby"),
    ("bridlington", "Bridlington"),
    ("cleethorpes", "Cleethorpes"),
    ("skegness", "Skegness"),
    ("torquay", "Torquay"),
    ("plymouth", "Plymouth"),
    ("weymouth", "Weymouth"),
    ("swanage", "Swanage"),
    ("bognor-regis", "Bognor Regis"),
    ("littlehampton", "Littlehampton"),
    ("newquay", "Newquay"),
    ("penzance", "Penzance"),
    ("falmouth", "Falmouth"),
    ("tenby", "Tenby"),
    ("swansea", "Swansea"),
    ("llandudno", "Llandudno"),
    ("aberystwyth", "Aberystwyth"),
    ("weston-super-mare", "Weston-super-Mare"),
    ("minehead", "Minehead"),
    ("ilfracombe", "Ilfracombe"),
    ("salcombe", "Salcombe"),
    ("dartmouth", "Dartmouth"),
    ("exmouth", "Exmouth"),
    ("tynemouth", "Tynemouth"),
    ("south-shields", "South Shields"),
    ("sunderland", "Sunderland"),
    ("redcar", "Redcar"),
]


def clean(value: object) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def slugify(value: str) -> str:
    s = value.strip().lower()
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


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


def stadium_search_query(club: str, stadium_name: str) -> str:
    return f"{stadium_name} {club} football stadium UK"


def seaside_search_query(display_name: str) -> str:
    return f"{display_name} seaside UK"


def upsert_image(cur, table: str, slug: str, photo_url: str, attribution: str | None) -> None:
    now = datetime.now(timezone.utc)
    cur.execute(
        f"""
        INSERT INTO {table} (slug, photo_url, attribution, updated_at)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
          photo_url = EXCLUDED.photo_url,
          attribution = EXCLUDED.attribution,
          updated_at = EXCLUDED.updated_at
        """,
        (slug, photo_url, attribution, now),
    )


def fetch_stadiums(cur) -> list[dict]:
    cur.execute(
        """
        SELECT id, club, stadium_name
        FROM stadiums
        ORDER BY club ASC
        """
    )
    return list(cur.fetchall())


def enrich_stadiums(cur, key: str, delay_ms: int, limit: int | None) -> tuple[int, int]:
    stadiums = fetch_stadiums(cur)
    if limit:
        stadiums = stadiums[:limit]

    updated = 0
    skipped = 0
    print(f"Fetching stadium images for {len(stadiums)} clubs…")

    for row in stadiums:
        club = clean(row.get("club")) or ""
        stadium_name = clean(row.get("stadium_name")) or ""
        slug = slugify(club)
        if not slug:
            skipped += 1
            continue

        query = stadium_search_query(club, stadium_name)
        try:
            place = search_place(key, query)
            photo_url = fetch_photo_url(key, place)
            if not photo_url:
                print(f"  No photo: {club} ({query})")
                skipped += 1
            else:
                upsert_image(cur, "stadium_images", slug, photo_url, photo_attribution(place))
                updated += 1
                print(f"  Cached: {club}")
        except Exception as exc:
            skipped += 1
            print(f"  Failed {club}: {exc}", file=sys.stderr)

        time.sleep(delay_ms / 1000)

    return updated, skipped


def enrich_seaside_towns(cur, key: str, delay_ms: int, limit: int | None) -> tuple[int, int]:
    towns = SEASIDE_TOWNS
    if limit:
        towns = towns[:limit]

    updated = 0
    skipped = 0
    print(f"Fetching seaside town images for {len(towns)} towns…")

    for slug, display_name in towns:
        query = seaside_search_query(display_name)
        try:
            place = search_place(key, query)
            photo_url = fetch_photo_url(key, place)
            if not photo_url:
                print(f"  No photo: {display_name} ({query})")
                skipped += 1
            else:
                upsert_image(cur, "town_images", slug, photo_url, photo_attribution(place))
                updated += 1
                print(f"  Cached: {display_name}")
        except Exception as exc:
            skipped += 1
            print(f"  Failed {display_name}: {exc}", file=sys.stderr)

        time.sleep(delay_ms / 1000)

    return updated, skipped


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cache Places photos for stadium and seaside hub cards.")
    parser.add_argument("--limit", type=int, default=None, help="Max rows per category")
    parser.add_argument("--delay", type=int, default=250, help="Delay between API calls (ms)")
    parser.add_argument(
        "--seaside-towns",
        action="store_true",
        help="Also fetch seaside town photos into town_images",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    key = api_key()

    conn = psycopg2.connect(db_url())
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            stadium_updated, stadium_skipped = enrich_stadiums(cur, key, args.delay, args.limit)
            conn.commit()
            print(
                f"Stadiums done. Updated {stadium_updated}, skipped {stadium_skipped}."
            )

            if args.seaside_towns:
                town_updated, town_skipped = enrich_seaside_towns(cur, key, args.delay, args.limit)
                conn.commit()
                print(f"Seaside towns done. Updated {town_updated}, skipped {town_skipped}.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
