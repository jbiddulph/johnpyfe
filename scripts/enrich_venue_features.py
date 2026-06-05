#!/usr/bin/env python3
"""
Batch-update public."Venue".features and description from Google Places (New) API.

Requires:
  pip install -r scripts/requirements-enrich.txt

Environment (.env in project root):
  DATABASE_URL or DIRECT_URL  — use DIRECT_URL (port 5432) for long batch runs
  GOOGLE_PLACES_API_KEY       — Places API (New) enabled in Google Cloud

Each venue uses two API calls: Text Search (find place) then Place Details (amenities).
Only blank `features` and/or `description` columns are written; existing values are kept.
Amenity fields (dog friendly, outdoor seating, etc.) need Enterprise + Atmosphere SKU on your key.

Examples:
  # Preview Brighton pubs (no DB writes — default)
  python scripts/enrich_venue_features.py --town Brighton --limit 10

  # Update Brighton pubs (skip dry run)
  python scripts/enrich_venue_features.py --town Brighton --skip-dry-run
  python scripts/enrich_venue_features.py --town Brighton --apply   # same as --skip-dry-run / -y

  # All venues missing features (careful: ~51k rows = API cost + time)
  python scripts/enrich_venue_features.py -y --limit 100

  # Single venue
  python scripts/enrich_venue_features.py --id 22054 -y
"""

from __future__ import annotations

import argparse
import os
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
# Text Search only supports a subset of fields; amenity flags need Place Details.
SEARCH_FIELD_MASK = "places.name,places.displayName,places.formattedAddress,places.types"
DETAILS_FIELD_MASK = ",".join(
    [
        "displayName",
        "formattedAddress",
        "types",
        "outdoorSeating",
        "servesVegetarianFood",
        "servesBeer",
        "servesWine",
        "servesBreakfast",
        "servesLunch",
        "servesDinner",
        "servesBrunch",
        "goodForWatchingSports",
        "liveMusic",
        "allowsDogs",
        "accessibilityOptions",
        "editorialSummary",
        "reviewSummary",
    ]
)

MAX_FEATURES_LEN = 5000
MAX_DESCRIPTION_LEN = 5000


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Enrich Venue.features and description from Google Places")
    p.add_argument("--town", help="Filter by town (case-insensitive), e.g. Brighton")
    p.add_argument("--county", help="Filter by county (case-insensitive)")
    p.add_argument("--id", type=int, help="Single venue id")
    p.add_argument("--limit", type=int, default=50, help="Max venues to process (default 50)")
    p.add_argument(
        "--apply",
        "--skip-dry-run",
        "-y",
        action="store_true",
        dest="apply",
        help="Write updates to the database (skip dry run)",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview only, no DB writes (default unless --apply / --skip-dry-run / -y)",
    )
    p.add_argument("--include-filled", action="store_true", help="Re-process venues that already have features or description")
    p.add_argument("--delay", type=float, default=0.25, help="Seconds between API calls (default 0.25)")
    return p.parse_args()


def db_url() -> str:
    url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    if not url:
        print("Set DIRECT_URL or DATABASE_URL in .env", file=sys.stderr)
        sys.exit(1)
    return url


def google_api_key() -> str:
    key = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv(
        "NUXT_PUBLIC_GOOGLE_MAPS_KEY"
    )
    if not key:
        print(
            "Set GOOGLE_PLACES_API_KEY in .env (Places API New must be enabled).\n"
            "Google Cloud → APIs & Services → Enable 'Places API (New)'.",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def clean(value: object) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.upper() == "NULL":
        return None
    return s


def build_search_query(venue: dict) -> str:
    parts = [
        clean(venue.get("venuename")),
        clean(venue.get("address")),
        clean(venue.get("town")),
        clean(venue.get("postcode")),
        "UK pub",
    ]
    return ", ".join(p for p in parts if p)


def localised_text(value: object) -> str | None:
    if isinstance(value, dict):
        return clean(value.get("text"))
    return clean(value)


def build_description(place: dict | None) -> str | None:
    if not place:
        return None

    editorial = localised_text(place.get("editorialSummary"))
    if editorial:
        text = editorial
    else:
        review_summary = place.get("reviewSummary") or {}
        review_text = localised_text(review_summary.get("text"))
        if review_text:
            text = review_text
        else:
            text = build_fallback_description(place)
            if not text:
                return None

    if len(text) > MAX_DESCRIPTION_LEN:
        text = text[: MAX_DESCRIPTION_LEN - 3] + "..."
    return text


def build_fallback_description(place: dict) -> str | None:
    name = localised_text(place.get("displayName"))
    address = clean(place.get("formattedAddress"))
    types = [str(t) for t in (place.get("types") or [])]

    kind = "pub"
    if any("night_club" in t for t in types):
        kind = "nightclub and bar"
    elif any("restaurant" in t for t in types):
        kind = "restaurant and pub"
    elif any("bar" in t for t in types):
        kind = "bar and pub"

    if name and address:
        sentence = f"{name} is a {kind} at {address}."
    elif name:
        sentence = f"{name} is a {kind}."
    else:
        return None

    amenities: list[str] = []
    if place.get("outdoorSeating"):
        amenities.append("outdoor seating")
    if place.get("allowsDogs"):
        amenities.append("dog-friendly")
    if place.get("goodForWatchingSports"):
        amenities.append("sports TV")
    if place.get("liveMusic"):
        amenities.append("live music")
    if any(place.get(k) for k in ("servesBreakfast", "servesLunch", "servesDinner", "servesBrunch")):
        amenities.append("food served")

    if amenities:
        sentence += f" Amenities include {', '.join(amenities)}."
    return sentence


def build_features(place: dict | None) -> str:
    if not place:
        return "• Pub (no online match — verify amenities locally)"

    bullets: list[str] = []

    if place.get("outdoorSeating"):
        bullets.append("Beer garden / outdoor seating")

    if place.get("allowsDogs"):
        bullets.append("Dog friendly")

    accessibility = place.get("accessibilityOptions") or {}
    if isinstance(accessibility, dict) and accessibility.get("wheelchairAccessibleEntrance"):
        bullets.append("Wheelchair accessible entrance")

    serves_food = any(
        place.get(k)
        for k in ("servesBreakfast", "servesLunch", "servesDinner", "servesBrunch")
    )
    if serves_food:
        bullets.append("Food served")

    if place.get("servesVegetarianFood"):
        bullets.append("Vegetarian options")

    if place.get("goodForWatchingSports"):
        bullets.append("Sports bar / sports TV")

    if place.get("liveMusic"):
        bullets.append("Live music")

    if place.get("servesBeer") or any("bar" in str(t) for t in (place.get("types") or [])):
        bullets.append("Bar / pub")

    if place.get("servesWine"):
        bullets.append("Wine served")

    if not bullets:
        bullets.append("Pub (limited online amenity data — verify locally)")

    text = "\n".join(f"• {b}" for b in bullets)
    if len(text) > MAX_FEATURES_LEN:
        text = text[: MAX_FEATURES_LEN - 3] + "..."
    return text


def place_details(api_key: str, place_name: str) -> dict | None:
    """GET places/{id} — field mask has no places. prefix."""
    if not place_name:
        return None
    url = f"https://places.googleapis.com/v1/{place_name}"
    resp = requests.get(
        url,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": DETAILS_FIELD_MASK,
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Place Details {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def search_place(api_key: str, query: str) -> dict | None:
    resp = requests.post(
        PLACES_SEARCH_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": SEARCH_FIELD_MASK,
        },
        json={"textQuery": query, "regionCode": "GB", "maxResultCount": 1},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Places Search {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    places = data.get("places") or []
    if not places:
        return None

    hit = places[0]
    place_name = hit.get("name")
    if not place_name:
        return hit

    details = place_details(api_key, place_name)
    return details or hit


def build_where(args: argparse.Namespace) -> tuple[list[str], list[object]]:
    clauses = ["is_live = '1'"]
    params: list[object] = []

    if not args.include_filled:
        clauses.append(
            "((features IS NULL OR features = '') OR (description IS NULL OR description = ''))"
        )

    if args.id:
        clauses.append("id = %s")
        params.append(args.id)
    if args.town:
        clauses.append("town ILIKE %s")
        params.append(args.town)
    if args.county:
        clauses.append("county ILIKE %s")
        params.append(args.county)

    return clauses, params


def count_matching_venues(conn, args: argparse.Namespace) -> int:
    clauses, params = build_where(args)
    sql = f'SELECT COUNT(*) FROM "Venue" WHERE {" AND ".join(clauses)}'
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return int(row[0]) if row else 0


def fetch_venues(conn, args: argparse.Namespace) -> list[dict]:
    clauses, params = build_where(args)
    params.append(args.limit)

    sql = f"""
        SELECT id, venuename, address, town, county, postcode, website, features, description
        FROM "Venue"
        WHERE {" AND ".join(clauses)}
        ORDER BY id ASC
        LIMIT %s
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


def is_blank(value: object) -> bool:
    if value is None:
        return True
    return str(value).strip() == ""


def update_venue(
    conn, venue: dict, features: str, description: str | None, apply: bool
) -> bool:
    """Update only blank features/description columns. Returns True if a write occurred."""
    updates: list[str] = []
    params: list[object] = []

    if is_blank(venue.get("features")) and features:
        updates.append("features = %s")
        params.append(features)

    if is_blank(venue.get("description")) and description:
        updates.append("description = %s")
        params.append(description)

    if not updates:
        return False

    if not apply:
        return True

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    updates.append("updated_at = %s")
    params.extend([now, venue["id"]])

    with conn.cursor() as cur:
        cur.execute(
            f'UPDATE "Venue" SET {", ".join(updates)} WHERE id = %s',
            params,
        )
    return True


def main() -> None:
    args = parse_args()
    if args.dry_run and args.apply:
        print("Use either --dry-run or --apply/--skip-dry-run/-y, not both.", file=sys.stderr)
        sys.exit(2)
    api_key = google_api_key()
    mode = "APPLY" if args.apply else "DRY RUN"

    conn = psycopg2.connect(db_url())
    conn.autocommit = False

    try:
        venues = fetch_venues(conn, args)
        total_matching = count_matching_venues(conn, args)
        filters = []
        if args.town:
            filters.append(f"town={args.town}")
        if args.county:
            filters.append(f"county={args.county}")
        if args.id:
            filters.append(f"id={args.id}")
        filter_label = f" ({', '.join(filters)})" if filters else ""
        print(f"{mode}{filter_label}")
        print(
            f"  {total_matching} venue(s) still need features or description; "
            f"processing {len(venues)} this run (limit={args.limit})"
        )
        if total_matching > len(venues):
            print("  Re-run the same command to process the rest.")

        updated = 0
        skipped = 0
        errors = 0

        for i, venue in enumerate(venues, start=1):
            label = f"#{venue['id']} {venue['venuename']} ({venue.get('town') or '?'})"
            query = build_search_query(venue)
            try:
                place = search_place(api_key, query)
                features = build_features(place)
                description = build_description(place)
                matched = (place or {}).get("displayName", {}).get("text", "?")
                print(f"\n[{i}/{len(venues)}] {label}")
                print(f"  Query: {query}")
                print(f"  Match: {matched}")
                print(f"  Features:\n{features}")
                if description:
                    preview = description if len(description) <= 240 else description[:237] + "..."
                    print(f"  Description: {preview}")
                else:
                    print("  Description: (none)")

                will_update_features = is_blank(venue.get("features")) and bool(features)
                will_update_description = is_blank(venue.get("description")) and bool(description)
                if will_update_features or will_update_description:
                    cols = []
                    if will_update_features:
                        cols.append("features")
                    if will_update_description:
                        cols.append("description")
                    print(f"  Will update: {', '.join(cols)}")
                else:
                    print("  Will update: (nothing — both columns already filled)")

                saved = update_venue(conn, venue, features, description, args.apply)
                if args.apply:
                    if saved:
                        conn.commit()
                        updated += 1
                        print("  → saved")
                    else:
                        skipped += 1
                        print("  → skipped (no blank columns to fill)")
                else:
                    print("  → dry run (use --skip-dry-run, --apply, or -y to save)")

            except Exception as exc:
                errors += 1
                conn.rollback()
                print(f"\n[{i}/{len(venues)}] ERR {label}: {exc}", file=sys.stderr)

            if i < len(venues) and args.delay > 0:
                time.sleep(args.delay)

        print(f"\nDone. saved={updated}, errors={errors}, skipped={skipped}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
