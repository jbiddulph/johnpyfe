#!/usr/bin/env python3
"""
Import upcoming events for venues from Skiddle or Eventbrite.

Requires:
  pip install -r scripts/requirements-enrich.txt

Environment (.env):
  DIRECT_URL or DATABASE_URL
  ENRICH_EVENTS_USER_ID       — optional; defaults to ADMIN_EMAIL or 'venue-import'

Skiddle (town-wide UK events — default source):
  SKIDDLE_API_KEY             — https://www.skiddle.com/api/join.php

Eventbrite (events from YOUR Eventbrite organization(s) only):
  EVENTBRITE_PRIVATE_TOKEN    — Account Settings → API Keys → Private token (Bearer)
  EVENTBRITE_ORGANIZATION_ID  — optional; else uses all orgs on your account
  Application_Key / OAuth_Client_Secret — OAuth app credentials only; not used for API calls

Note: Eventbrite removed public event search in 2019. Application Key + Client Secret
cannot list random pub events. Use Skiddle for town-wide imports, or Eventbrite for
events you (or your org) publish on Eventbrite.

Examples:
  python scripts/enrich_venue_events.py --town Brighton --limit 50
  python scripts/enrich_venue_events.py --source eventbrite --list-orgs
  python scripts/enrich_venue_events.py --source eventbrite --town Brighton --limit 100 -y
  python scripts/enrich_venue_events.py --source skiddle --town Brighton --limit 200 -y
"""

from __future__ import annotations

import argparse
import math
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dataclasses import dataclass

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

SKIDDLE_SEARCH_URL = "https://www.skiddle.com/api/v1/events/search/"
EVENTBRITE_API = "https://www.eventbriteapi.com/v3"

# Skiddle eventcode -> Category.id in this project
CATEGORY_BY_EVENTCODE = {
    "COMEDY": 1,
    "THEATRE": 2,
    "LIVE": 3,
    "CLUB": 3,
    "BARPUB": 3,
    "FEST": 4,
}
DEFAULT_CATEGORY_ID = 3

TOWN_CITY_ALIASES = {
    "brighton": ["brighton", "brighton & hove", "brighton and hove"],
    "hove": ["brighton", "brighton & hove", "brighton and hove"],
}

# Eventbrite category_id (rough) -> local Category.id
EVENTBRITE_CATEGORY_MAP = {
    "101": 3,  # Music
    "103": 2,  # Film & Media
    "105": 4,  # Festivals
    "108": 1,  # Sports -> use festival slot or live - use 3
    "110": 1,  # Food & Drink
    "113": 1,  # Community
    "115": 1,  # Comedy
}


@dataclass
class ImportedEvent:
    title: str
    start: datetime
    description: str
    website: str
    cost: str
    photo: str
    category_id: int
    venue_name: str
    venue_lat: float | None
    venue_lng: float | None
    source: str


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Import venue events from Skiddle or Eventbrite")
    p.add_argument(
        "--source",
        choices=("skiddle", "eventbrite"),
        default="skiddle",
        help="Event data source (default skiddle for town-wide UK listings)",
    )
    p.add_argument(
        "--list-orgs",
        action="store_true",
        help="List Eventbrite organizations for your token and exit",
    )
    p.add_argument(
        "--organization-id",
        help="Eventbrite organization id (default: all orgs on your account)",
    )
    p.add_argument("--town", help="Match events to live venues in this town (case-insensitive)")
    p.add_argument("--county", help="Optional county filter for venues")
    p.add_argument("--id", type=int, help="Only match events to this venue id")
    p.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Max new events to import this run (default 50)",
    )
    p.add_argument(
        "--radius",
        type=float,
        default=3.0,
        help="Skiddle search radius in miles from town centre (default 3)",
    )
    p.add_argument(
        "--venue-radius",
        type=float,
        default=0.35,
        help="Max miles from venue coords to assign an event (default 0.35)",
    )
    p.add_argument(
        "--apply",
        "--skip-dry-run",
        "-y",
        action="store_true",
        dest="apply",
        help="Write events to the database (skip dry run)",
    )
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--delay", type=float, default=0.3, help="Seconds between API pages")
    return p.parse_args()


def db_url() -> str:
    url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    if not url:
        print("Set DIRECT_URL or DATABASE_URL in .env", file=sys.stderr)
        sys.exit(1)
    return url


def skiddle_api_key() -> str:
    key = os.getenv("SKIDDLE_API_KEY") or os.getenv("SKIDDLE_API_KEY_PRIVATE")
    if not key:
        print(
            "Set SKIDDLE_API_KEY in .env\n"
            "Apply for a free key: https://www.skiddle.com/api/join.php\n"
            "Or use: --source eventbrite with EVENTBRITE_PRIVATE_TOKEN",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def eventbrite_token() -> str:
    """Bearer token for Eventbrite API (Private OAuth Token — not Application Key)."""
    for name in (
        "EVENTBRITE_PRIVATE_TOKEN",
        "EVENTBRITE_OAUTH_TOKEN",
        "EVENTBRITE_TOKEN",
    ):
        val = os.getenv(name)
        if val and val.strip():
            return val.strip()

    print(
        "Eventbrite API needs your Private OAuth Token (Bearer), not Application Key + Client Secret.\n\n"
        "Get it: Eventbrite → Account Settings → Developer Links → API Keys\n"
        "  → Show API key, client secret and tokens → copy Private token\n\n"
        "Add to .env:\n"
        "  EVENTBRITE_PRIVATE_TOKEN=your_private_token\n\n"
        "Application_Key and OAuth_Client_Secret are for OAuth apps only.\n"
        "Public event search was removed in 2019 — this imports events from YOUR org(s).",
        file=sys.stderr,
    )
    sys.exit(1)


def import_user_id() -> str:
    return (
        os.getenv("ENRICH_EVENTS_USER_ID")
        or os.getenv("ADMIN_EMAIL")
        or os.getenv("USER_NAME")
        or "venue-import"
    )


def parse_coord(value: object) -> float | None:
    if value is None:
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n) or n == 0:
        return None
    return n


def normalize_name(value: object) -> str:
    s = str(value or "").lower()
    return re.sub(r"[^a-z0-9]", "", s)


def names_match(a: object, b: object) -> bool:
    na, nb = normalize_name(a), normalize_name(b)
    if len(na) < 3 or len(nb) < 3:
        return False
    return na in nb or nb in na


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.7613
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def town_centroid(venues: list[dict]) -> tuple[float, float] | None:
    coords = [
        (parse_coord(v.get("latitude")), parse_coord(v.get("longitude")))
        for v in venues
    ]
    coords = [(lat, lng) for lat, lng in coords if lat is not None and lng is not None]
    if not coords:
        return None
    lat = sum(c[0] for c in coords) / len(coords)
    lng = sum(c[1] for c in coords) / len(coords)
    return lat, lng


def fetch_venues(conn, args: argparse.Namespace) -> list[dict]:
    clauses = ["is_live = '1'"]
    params: list[object] = []

    if args.id:
        clauses.append("id = %s")
        params.append(args.id)
    if args.town:
        clauses.append("town ILIKE %s")
        params.append(args.town)
    if args.county:
        clauses.append("county ILIKE %s")
        params.append(args.county)

    sql = f"""
        SELECT id, venuename, town, county, latitude, longitude
        FROM "Venue"
        WHERE {" AND ".join(clauses)}
        ORDER BY id ASC
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        rows = list(cur.fetchall())

    return [r for r in rows if parse_coord(r.get("latitude")) is not None]


def resolve_city_id(conn, town: str | None) -> int | None:
    if not town:
        return None
    town_clean = town.strip()
    aliases = TOWN_CITY_ALIASES.get(town_clean.lower(), [town_clean])

    with conn.cursor() as cur:
        for alias in aliases:
            cur.execute(
                """
                SELECT id FROM "City"
                WHERE name ILIKE %s OR slug ILIKE %s
                ORDER BY id ASC
                LIMIT 1
                """,
                (alias, alias.replace(" & ", "-and-").replace(" ", "-")),
            )
            row = cur.fetchone()
            if row:
                return int(row[0])

        cur.execute(
            """
            SELECT id FROM "City"
            WHERE name ILIKE %s
            ORDER BY id ASC
            LIMIT 1
            """,
            (f"%{town_clean}%",),
        )
        row = cur.fetchone()
        return int(row[0]) if row else None


def category_id_for_skiddle(event: dict) -> int:
    code = str(event.get("eventcode") or "").upper()
    return CATEGORY_BY_EVENTCODE.get(code, DEFAULT_CATEGORY_ID)


def category_id_for_eventbrite(event: dict) -> int:
    cat = str(event.get("category_id") or "")
    if cat in EVENTBRITE_CATEGORY_MAP:
        mapped = EVENTBRITE_CATEGORY_MAP[cat]
        if cat == "115":
            return 1  # Comedy
        if cat == "105":
            return 4  # Festival
        if cat == "103":
            return 2  # Film
        return mapped
    sub = str(event.get("subcategory_id") or "")
    if sub.startswith("115"):
        return 1
    return DEFAULT_CATEGORY_ID


def parse_datetime_text(text: str) -> datetime | None:
    text = text.strip()
    try:
        if "T" in text:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        else:
            dt = datetime.strptime(text[:10], "%Y-%m-%d")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def parse_time_hm(text: object) -> tuple[int, int] | None:
    if text in (None, ""):
        return None
    raw = str(text).strip()
    if ":" not in raw:
        return None
    try:
        hour_str, minute_str = raw.split(":", 1)[:2]
        hour = int(hour_str)
        minute = int(minute_str[:2])
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except ValueError:
        return None
    return None


def skiddle_event_date(event: dict) -> datetime | None:
    """Calendar date for a Skiddle event (date component only)."""
    for key in ("date", "startdate"):
        raw = event.get(key)
        if not raw:
            continue
        text = str(raw).strip()
        try:
            date_part = text.split("T")[0][:10]
            return datetime.strptime(date_part, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def parse_skiddle_startdate_wallclock(text: str) -> datetime | None:
    """
    Parse Skiddle startdate without timezone conversion.

    Skiddle labels times with +00:00 but the clock time is UK local (e.g. 19:00 doors = 19:00).
    """
    text = text.strip()
    if "T" not in text:
        return None
    core = text.split("+")[0].split("Z")[0]
    if "." in core:
        core = core.split(".")[0]
    try:
        return datetime.strptime(core, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def parse_skiddle_start(event: dict) -> datetime | None:
    """
    Resolve event start from Skiddle search/detail payload.

    1. startdate with a non-midnight time (wall clock)
    2. openingtimes.doorsopen on the event date when startdate is midnight
    3. startdate at midnight (e.g. genuine all-day / anytime tickets)
    """
    startdate = event.get("startdate")
    if startdate:
        dt = parse_skiddle_startdate_wallclock(str(startdate))
        if dt and (dt.hour != 0 or dt.minute != 0):
            return dt

    event_date = skiddle_event_date(event)
    if not event_date:
        return None

    opening = event.get("openingtimes") or {}
    if isinstance(opening, dict):
        for key in ("doorsopen", "doorsOpen"):
            hm = parse_time_hm(opening.get(key))
            if hm and (hm[0] != 0 or hm[1] != 0):
                return event_date.replace(
                    hour=hm[0], minute=hm[1], second=0, microsecond=0
                )

    if startdate:
        dt = parse_skiddle_startdate_wallclock(str(startdate))
        if dt:
            return dt

    return event_date


def parse_eventbrite_start(event: dict) -> datetime | None:
    start = event.get("start") or {}
    raw = start.get("utc") or start.get("local")
    if not raw:
        return None
    return parse_datetime_text(str(raw))


def localized_text_field(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("text") or value.get("html") or "").strip()
    return str(value or "").strip()


def skiddle_cost(event: dict) -> str:
    pricing = event.get("ticketpricing") or {}
    if isinstance(pricing, dict):
        for key in ("minPrice", "maxPrice", "price"):
            val = pricing.get(key)
            if val not in (None, ""):
                return str(val)
    entry = event.get("entryprice")
    if entry not in (None, ""):
        return str(entry)
    return ""


def eventbrite_cost(event: dict) -> str:
    if event.get("is_free"):
        return "Free"
    ticket = event.get("ticket_availability") or {}
    if isinstance(ticket, dict):
        min_price = ticket.get("minimum_ticket_price") or {}
        if isinstance(min_price, dict) and min_price.get("major_value"):
            currency = min_price.get("currency", "GBP")
            return f"{currency} {min_price.get('major_value')}"
    return ""


def skiddle_photo(event: dict) -> str:
    # Prefer full-size JPEG URLs (search API thumbnails often omit extensions).
    for key in (
        "largeimageurl",
        "xlargeimageurl",
        "imageurl",
        "xlargeimageurlWebP",
        "logo",
    ):
        val = event.get(key)
        if val and str(val).startswith(("http://", "https://")):
            url = str(val)
            if key == "imageurl" and url.endswith("_th.jpg"):
                url = url.replace("_th.jpg", ".jpg")
            return url[:500]
    return ""


def eventbrite_photo(event: dict) -> str:
    logo = event.get("logo") or {}
    if isinstance(logo, dict):
        original = logo.get("original") or logo.get("url") or {}
        if isinstance(original, dict) and original.get("url"):
            return str(original["url"])[:500]
        if isinstance(original, str) and original.startswith("http"):
            return original[:500]
    return ""


def normalize_skiddle(event: dict) -> ImportedEvent | None:
    title = str(event.get("eventname") or event.get("EventName") or "").strip()
    start = parse_skiddle_start(event)
    if not title or not start:
        return None
    venue_info = event.get("venue") or {}
    return ImportedEvent(
        title=title,
        start=start,
        description=str(event.get("description") or event.get("xDescription") or "")[:5000],
        website=str(event.get("link") or event.get("linkurl") or "")[:500],
        cost=skiddle_cost(event),
        photo=skiddle_photo(event),
        category_id=category_id_for_skiddle(event),
        venue_name=str(venue_info.get("name") or ""),
        venue_lat=parse_coord(venue_info.get("latitude")),
        venue_lng=parse_coord(venue_info.get("longitude")),
        source="skiddle",
    )


def normalize_eventbrite(event: dict) -> ImportedEvent | None:
    title = localized_text_field(event.get("name"))
    start = parse_eventbrite_start(event)
    if not title or not start:
        return None
    venue = event.get("venue") or {}
    addr = venue.get("address") or {}
    return ImportedEvent(
        title=title,
        start=start,
        description=localized_text_field(event.get("description"))[:5000],
        website=str(event.get("url") or "")[:500],
        cost=eventbrite_cost(event),
        photo=eventbrite_photo(event),
        category_id=category_id_for_eventbrite(event),
        venue_name=str(venue.get("name") or ""),
        venue_lat=parse_coord(addr.get("latitude")),
        venue_lng=parse_coord(addr.get("longitude")),
        source="eventbrite",
    )


def eventbrite_get(token: str, path: str, params: dict | None = None) -> dict:
    url = f"{EVENTBRITE_API}/{path.lstrip('/')}"
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
        timeout=45,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Eventbrite HTTP {resp.status_code}: {resp.text[:400]}")
    return resp.json()


def eventbrite_paginate(token: str, path: str, params: dict, key: str) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        data = eventbrite_get(token, path, {**params, "page": page})
        items.extend(data.get(key) or [])
        pagination = data.get("pagination") or {}
        if not pagination.get("has_more_items"):
            break
        page = int(pagination.get("page_number") or page) + 1
        time.sleep(0.2)
    return items


def list_eventbrite_orgs(token: str) -> list[dict]:
    return eventbrite_paginate(token, "users/me/organizations/", {}, "organizations")


def fetch_eventbrite_events(token: str, organization_id: str, delay: float) -> list[dict]:
    params = {
        "status": "live",
        "time_filter": "current_future",
        "order_by": "start_asc",
        "expand": "venue",
        "page_size": 50,
    }
    events = eventbrite_paginate(
        token,
        f"organizations/{organization_id}/events/",
        params,
        "events",
    )
    time.sleep(delay)
    return events


def fetch_skiddle_events(
    api_key: str,
    lat: float,
    lng: float,
    radius: float,
    *,
    max_events: int,
    delay: float,
) -> list[ImportedEvent]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    collected: list[dict] = []
    offset = 0
    page_size = min(100, max(20, max_events))

    while len(collected) < max_events:
        params = {
            "api_key": api_key,
            "latitude": lat,
            "longitude": lng,
            "radius": max(1, int(round(radius))),
            "minDate": today,
            "country": "GB",
            "limit": page_size,
            "offset": offset,
            "order": "date",
            "description": 1,
            "getdistance": 1,
            "imagefilter": 1,
        }
        resp = requests.get(SKIDDLE_SEARCH_URL, params=params, timeout=45)
        if resp.status_code != 200:
            raise RuntimeError(f"Skiddle HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        if data.get("error"):
            raise RuntimeError(f"Skiddle error: {data.get('errormessage', data)}")

        batch = data.get("results") or []
        if not batch:
            break
        collected.extend(batch)

        total = int(data.get("totalcount") or 0)
        offset += len(batch)
        if offset >= total:
            break
        time.sleep(delay)

    normalized: list[ImportedEvent] = []
    for raw in collected[: max_events * 3]:
        item = normalize_skiddle(raw)
        if item:
            normalized.append(item)
    return normalized


def fetch_eventbrite_imports(token: str, org_ids: list[str], delay: float) -> list[ImportedEvent]:
    normalized: list[ImportedEvent] = []
    seen: set[str] = set()
    for org_id in org_ids:
        for raw in fetch_eventbrite_events(token, org_id, delay):
            item = normalize_eventbrite(raw)
            if not item:
                continue
            key = f"{org_id}:{item.title}:{item.start.isoformat()}"
            if key in seen:
                continue
            seen.add(key)
            normalized.append(item)
    return normalized


def match_imported_to_venue(event: ImportedEvent, venues: list[dict], max_miles: float) -> dict | None:
    ev_lat, ev_lng = event.venue_lat, event.venue_lng
    ev_name = event.venue_name

    best: dict | None = None
    best_score = -1.0

    for venue in venues:
        v_lat = parse_coord(venue.get("latitude"))
        v_lng = parse_coord(venue.get("longitude"))
        if v_lat is None or v_lng is None:
            continue

        if ev_lat is not None and ev_lng is not None:
            dist = haversine_miles(v_lat, v_lng, ev_lat, ev_lng)
        else:
            dist = 999.0

        if dist > max_miles:
            continue

        name_ok = names_match(ev_name, venue.get("venuename"))
        score = (1.0 if name_ok else 0.4) - dist
        if score > best_score:
            best_score = score
            best = venue

    if best is None and ev_name:
        for venue in venues:
            if names_match(ev_name, venue.get("venuename")):
                return venue
    return best


def event_exists(conn, listing_id: int, title: str, start: datetime) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM "Event"
            WHERE "listingId" = %s
              AND event_title = %s
              AND event_start = %s
            LIMIT 1
            """,
            (listing_id, title, start.replace(tzinfo=None)),
        )
        return cur.fetchone() is not None


def insert_event(
    conn,
    *,
    title: str,
    description: str,
    cost: str,
    start: datetime,
    photo: str,
    website: str,
    user_id: str,
    listing_id: int,
    city_id: int,
    category_id: int,
    apply: bool,
) -> bool:
    if not apply:
        return True
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "Event" (
                event_title, description, cost, duration, event_start,
                photo, website, created_at, user_id, "listingId", "cityId", "categoryId"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                title[:200],
                (description or "")[:5000],
                (cost or "")[:100],
                "",
                start.replace(tzinfo=None),
                (photo or "")[:500],
                (website or "")[:500],
                now,
                user_id[:200],
                listing_id,
                city_id,
                category_id,
            ),
        )
    return True


def main() -> None:
    args = parse_args()
    if args.dry_run and args.apply:
        print("Use either --dry-run or -y, not both.", file=sys.stderr)
        sys.exit(2)

    if args.list_orgs:
        token = eventbrite_token()
        orgs = list_eventbrite_orgs(token)
        if not orgs:
            print("No Eventbrite organizations found for this token.")
            return
        print("Eventbrite organizations:")
        for org in orgs:
            print(f"  id={org.get('id')}  name={org.get('name')}")
        print("\nUse: --source eventbrite --organization-id ID --town Brighton -y")
        return

    if not args.town and not args.id:
        print("Provide --town Brighton (or --id VENUE_ID).", file=sys.stderr)
        sys.exit(2)

    user_id = import_user_id()
    mode = "APPLY" if args.apply else "DRY RUN"

    conn = psycopg2.connect(db_url())
    conn.autocommit = False

    try:
        venues = fetch_venues(conn, args)
        if not venues:
            print("No live venues with coordinates found for that filter.", file=sys.stderr)
            sys.exit(1)

        city_id = resolve_city_id(conn, args.town or venues[0].get("town"))
        if city_id is None:
            print(
                f"No matching row in City for town={args.town!r}. "
                "Add the town to the City table first.",
                file=sys.stderr,
            )
            sys.exit(1)

        if args.source == "skiddle":
            api_key = skiddle_api_key()
            centroid = town_centroid(venues)
            if not centroid:
                print("Could not compute town centroid.", file=sys.stderr)
                sys.exit(1)
            lat, lng = centroid
            print(f"{mode} | source=skiddle | venues={len(venues)} | search @ {lat:.4f},{lng:.4f}")
            candidates = fetch_skiddle_events(
                api_key,
                lat,
                lng,
                args.radius,
                max_events=max(args.limit * 5, 100),
                delay=args.delay,
            )
        else:
            token = eventbrite_token()
            if args.organization_id:
                org_ids = [str(args.organization_id)]
            elif os.getenv("EVENTBRITE_ORGANIZATION_ID"):
                org_ids = [os.getenv("EVENTBRITE_ORGANIZATION_ID", "")]
            else:
                org_ids = [str(o.get("id")) for o in list_eventbrite_orgs(token) if o.get("id")]
            if not org_ids:
                print("No Eventbrite organization id found. Run --list-orgs or set EVENTBRITE_ORGANIZATION_ID.", file=sys.stderr)
                sys.exit(1)
            print(f"{mode} | source=eventbrite | venues={len(venues)} | orgs={', '.join(org_ids)}")
            candidates = fetch_eventbrite_imports(token, org_ids, args.delay)

        print(f"  cityId={city_id} user_id={user_id!r} max_new_events={args.limit}")
        print(f"  {len(candidates)} upcoming event(s) to evaluate")

        imported = 0
        skipped = 0
        unmatched = 0
        errors = 0
        now = datetime.now(timezone.utc)

        for event in candidates:
            if imported >= args.limit:
                break
            if event.start < now:
                skipped += 1
                continue

            venue = match_imported_to_venue(event, venues, args.venue_radius)
            if not venue:
                unmatched += 1
                continue

            listing_id = int(venue["id"])
            if event_exists(conn, listing_id, event.title, event.start):
                skipped += 1
                continue

            print(f"\n+ {event.title}")
            print(f"  When: {event.start.isoformat()} | Venue: {venue['venuename']} (id {listing_id})")
            print(f"  {event.source} venue: {event.venue_name or '?'} | Category id: {event.category_id}")

            try:
                if insert_event(
                    conn,
                    title=event.title,
                    description=event.description,
                    cost=event.cost,
                    start=event.start,
                    photo=event.photo,
                    website=event.website,
                    user_id=user_id,
                    listing_id=listing_id,
                    city_id=city_id,
                    category_id=event.category_id,
                    apply=args.apply,
                ):
                    if args.apply:
                        conn.commit()
                        imported += 1
                        print("  → saved")
                    else:
                        imported += 1
                        print("  → dry run (use -y to save)")
            except Exception as exc:
                errors += 1
                conn.rollback()
                print(f"  ERR: {exc}", file=sys.stderr)

        print(
            f"\nDone. new={imported}, skipped={skipped}, unmatched={unmatched}, errors={errors}"
        )
        if not args.apply and imported:
            print("Re-run with -y to write events to the database.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
