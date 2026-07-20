#!/usr/bin/env python3
"""
Replace missing / placeholder / broken Google Place venue photos with Unsplash images.

Does NOT call Google Places. Uses the Unsplash API only.

Requires:
  pip install -r scripts/requirements-enrich.txt

Environment (.env in project root):
  DATABASE_URL or DIRECT_URL
  UNSPLASH_ACCESS_KEY   — Application Access Key (Client-ID)
  # UNSPLASH_SECRET_KEY is only needed for OAuth user flows; not used here.

Targets (default: both):
  - Venue.photo starting with https://lh3.googleusercontent.com/place-photos/
  - Empty / NULL / placeholder photos (awaiting.jpg, standing.jpg, etc.)

Strategy:
  1. Build a small pool of Unsplash pub/bar photos (search + random).
  2. Shuffle-assign pool URLs across matching venues (avoids rate limits).
  3. Hotlink images.unsplash.com URLs (Unsplash API guidelines).

Examples:
  # Preview first 20 venues with broken Google Place CDN photo URLs (Unsplash only — no Google API)
  python scripts/enrich_venue_photos_unsplash.py --broken-cdn --limit 20

  # Apply replacements for broken Google Place CDN URLs (calls Unsplash only)
  python scripts/enrich_venue_photos_unsplash.py --broken-cdn -y

  # Placeholders too (large — use --limit while testing)
  python scripts/enrich_venue_photos_unsplash.py --placeholders --limit 100 -y

  # Everything that needs a photo
  python scripts/enrich_venue_photos_unsplash.py -y
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor, execute_batch

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

UNSPLASH_API = "https://api.unsplash.com"
GOOGLE_PLACE_PREFIX = "https://lh3.googleusercontent.com/place-photos/"
DEFAULT_PHOTO_MARKERS = ("standing.jpg", "awaiting.jpg", "images/venues/awaiting")
MAX_PHOTO_URL_LEN = 2000

SEARCH_QUERIES = [
    "british pub interior",
    "pub bar drinks",
    "friends drinking beer pub",
    "people sitting at pub",
    "cozy bar venue",
    "pub beer garden",
    "friends toasting drinks bar",
    "traditional english pub",
    "craft beer bar",
    "night out pub friends",
]


def db_url() -> str:
    url = os.environ.get("DIRECT_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("Set DATABASE_URL or DIRECT_URL in .env", file=sys.stderr)
        sys.exit(1)
    return url


def access_key() -> str:
    key = (os.environ.get("UNSPLASH_ACCESS_KEY") or "").strip()
    if not key:
        print("Set UNSPLASH_ACCESS_KEY in .env (Unsplash Application Access Key)", file=sys.stderr)
        sys.exit(1)
    return key


def unsplash_headers(key: str) -> dict[str, str]:
    return {
        "Authorization": f"Client-ID {key}",
        "Accept-Version": "v1",
        "User-Agent": "ukpubs-enrich-venue-photos/1.0",
    }


def photo_url_from_result(photo: dict) -> str | None:
    urls = photo.get("urls") or {}
    # Prefer regular (~1080px) for venue cards/heroes
    raw = urls.get("regular") or urls.get("full") or urls.get("small")
    if not raw or not isinstance(raw, str):
        return None
    # Stable, moderately sized JPEG
    if "images.unsplash.com" in raw and "w=" not in raw:
        raw = f"{raw}?w=1080&fit=max&q=80&fm=jpg"
    if len(raw) > MAX_PHOTO_URL_LEN:
        return None
    return raw


def track_download(session: requests.Session, key: str, photo: dict) -> None:
    """Unsplash guideline: hit download_location when using a photo."""
    loc = (photo.get("links") or {}).get("download_location")
    if not loc:
        return
    try:
        session.get(loc, headers=unsplash_headers(key), timeout=20)
    except requests.RequestException as exc:
        print(f"  warn: download track failed: {exc}", file=sys.stderr)


def fetch_search_page(
    session: requests.Session,
    key: str,
    query: str,
    page: int,
    per_page: int = 30,
) -> list[dict]:
    resp = session.get(
        f"{UNSPLASH_API}/search/photos",
        headers=unsplash_headers(key),
        params={
            "query": query,
            "page": page,
            "per_page": per_page,
            "orientation": "landscape",
            "content_filter": "high",
        },
        timeout=30,
    )
    if resp.status_code == 403:
        print("Unsplash API 403 — check UNSPLASH_ACCESS_KEY / app status", file=sys.stderr)
        sys.exit(1)
    if resp.status_code == 429:
        retry = int(resp.headers.get("Retry-After", "60"))
        print(f"Rate limited; sleeping {retry}s…", file=sys.stderr)
        time.sleep(retry)
        return fetch_search_page(session, key, query, page, per_page)
    resp.raise_for_status()
    data = resp.json()
    return list(data.get("results") or [])


def fetch_random_batch(
    session: requests.Session,
    key: str,
    query: str,
    count: int = 30,
) -> list[dict]:
    resp = session.get(
        f"{UNSPLASH_API}/photos/random",
        headers=unsplash_headers(key),
        params={
            "query": query,
            "count": min(count, 30),
            "orientation": "landscape",
            "content_filter": "high",
        },
        timeout=30,
    )
    if resp.status_code == 429:
        retry = int(resp.headers.get("Retry-After", "60"))
        print(f"Rate limited; sleeping {retry}s…", file=sys.stderr)
        time.sleep(retry)
        return fetch_random_batch(session, key, query, count)
    if resp.status_code >= 400:
        print(f"  warn: random failed ({resp.status_code}) for {query!r}", file=sys.stderr)
        return []
    data = resp.json()
    if isinstance(data, dict):
        return [data]
    return list(data or [])


def build_photo_pool(
    session: requests.Session,
    key: str,
    pool_size: int,
    track: bool,
) -> list[str]:
    """Return unique Unsplash image URLs for pubs/bars/friends drinking."""
    by_id: dict[str, dict] = {}

    for query in SEARCH_QUERIES:
        if len(by_id) >= pool_size:
            break
        print(f"  search: {query!r}")
        for page in (1, 2):
            if len(by_id) >= pool_size:
                break
            results = fetch_search_page(session, key, query, page=page, per_page=30)
            for photo in results:
                pid = photo.get("id")
                if not pid or pid in by_id:
                    continue
                if not photo_url_from_result(photo):
                    continue
                by_id[pid] = photo
            time.sleep(0.35)
        # A few random extras per theme
        if len(by_id) < pool_size:
            for photo in fetch_random_batch(session, key, query, count=10):
                pid = photo.get("id")
                if not pid or pid in by_id:
                    continue
                if not photo_url_from_result(photo):
                    continue
                by_id[pid] = photo
            time.sleep(0.35)

    urls: list[str] = []
    for photo in by_id.values():
        url = photo_url_from_result(photo)
        if not url:
            continue
        if track:
            track_download(session, key, photo)
            time.sleep(0.05)
        urls.append(url)
        photographer = ((photo.get("user") or {}).get("name")) or "Unknown"
        print(f"    + {photo.get('id')} — {photographer}")

    if not urls:
        print("No Unsplash photos returned — aborting", file=sys.stderr)
        sys.exit(1)

    random.shuffle(urls)
    print(f"Photo pool size: {len(urls)}")
    return urls


def needs_photo_sql(include_google: bool, include_placeholders: bool) -> str:
    clauses: list[str] = []
    if include_google:
        clauses.append("photo ILIKE %s")
    if include_placeholders:
        clauses.append(
            """(
              photo IS NULL
              OR TRIM(photo) = ''
              OR UPPER(TRIM(photo)) = 'NULL'
              OR photo ILIKE %s
              OR photo ILIKE %s
              OR photo ILIKE %s
            )"""
        )
    if not clauses:
        raise ValueError("Select --broken-cdn and/or --placeholders (or neither for both)")
    return " OR ".join(f"({c})" for c in clauses)


def sql_params(include_google: bool, include_placeholders: bool) -> list[str]:
    params: list[str] = []
    if include_google:
        params.append(f"{GOOGLE_PLACE_PREFIX}%")
    if include_placeholders:
        params.extend(["%awaiting%", "%standing%", "%images/venues/awaiting%"])
    return params


def fetch_target_ids(
    conn,
    include_google: bool,
    include_placeholders: bool,
    limit: int | None,
    live_only: bool,
) -> list[int]:
    where = needs_photo_sql(include_google, include_placeholders)
    live = "AND is_live = '1'" if live_only else ""
    lim = f"LIMIT {int(limit)}" if limit else ""
    sql = f"""
      SELECT id
      FROM "Venue"
      WHERE ({where})
      {live}
      ORDER BY id
      {lim}
    """
    with conn.cursor() as cur:
        cur.execute(sql, sql_params(include_google, include_placeholders))
        return [int(row[0]) for row in cur.fetchall()]


def apply_updates(conn, assignments: list[tuple[str, int]], dry_run: bool) -> int:
    if dry_run:
        for photo, venue_id in assignments[:10]:
            print(f"  dry-run would set venue {venue_id} → {photo[:90]}…")
        if len(assignments) > 10:
            print(f"  … and {len(assignments) - 10} more")
        return 0

    with conn.cursor() as cur:
        execute_batch(
            cur,
            'UPDATE "Venue" SET photo = %s WHERE id = %s',
            assignments,
            page_size=500,
        )
    conn.commit()
    return len(assignments)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Replace venue photos with Unsplash pub/bar images (Unsplash API only — never calls Google)",
    )
    p.add_argument(
        "--broken-cdn",
        "--googleusercontent",
        dest="broken_cdn",
        action="store_true",
        help="Only replace Venue.photo values that start with the broken Google Place CDN prefix (no Google API calls)",
    )
    p.add_argument(
        "--placeholders",
        action="store_true",
        help="Only replace empty / awaiting / standing placeholders",
    )
    p.add_argument("--limit", type=int, default=None, help="Max venues to update")
    p.add_argument("--pool-size", type=int, default=120, help="Unsplash photos to fetch into pool")
    p.add_argument("--all-venues", action="store_true", help="Include non-live venues")
    p.add_argument(
        "-y",
        "--apply",
        "--skip-dry-run",
        dest="apply",
        action="store_true",
        help="Write to the database (default is dry-run)",
    )
    p.add_argument(
        "--no-track-downloads",
        action="store_true",
        help="Skip Unsplash download_location tracking (not recommended)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    include_google = args.broken_cdn or (not args.broken_cdn and not args.placeholders)
    include_placeholders = args.placeholders or (not args.broken_cdn and not args.placeholders)

    key = access_key()
    dry_run = not args.apply
    live_only = not args.all_venues

    print("API: Unsplash only (no Google Cloud / Places calls)")
    print("Mode:", "APPLY" if args.apply else "DRY-RUN")
    print(
        "Targets:",
        "broken-googleusercontent-cdn" if include_google else None,
        "placeholders" if include_placeholders else None,
    )

    session = requests.Session()
    print("Building Unsplash photo pool…")
    pool = build_photo_pool(
        session,
        key,
        pool_size=max(20, args.pool_size),
        track=not args.no_track_downloads,
    )

    conn = psycopg2.connect(db_url())
    try:
        ids = fetch_target_ids(
            conn,
            include_google=include_google,
            include_placeholders=include_placeholders,
            limit=args.limit,
            live_only=live_only,
        )
        print(f"Venues to update: {len(ids)}")
        if not ids:
            return

        assignments = [(pool[i % len(pool)], venue_id) for i, venue_id in enumerate(ids)]
        # Extra shuffle so neighbouring ids don't share sequential pool order
        random.shuffle(assignments)

        updated = apply_updates(conn, assignments, dry_run=dry_run)
        if dry_run:
            print(f"Dry-run complete ({len(assignments)} would update). Re-run with -y to apply.")
        else:
            print(f"Updated {updated} venues.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
