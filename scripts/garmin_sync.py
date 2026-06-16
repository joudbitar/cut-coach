#!/usr/bin/env python3
"""Pull Garmin Connect data into the cut-coach Supabase project.

One-time setup (interactive, handles MFA + saves a ~1-year token):
    pip3 install garminconnect requests
    # add GARMIN_EMAIL / GARMIN_PASSWORD to .env.local
    python3 scripts/garmin_sync.py --login

Daily run (no creds needed once the token is saved; this is what cron calls):
    python3 scripts/garmin_sync.py            # syncs the last 3 days
    python3 scripts/garmin_sync.py --days 14  # backfill

Writes:
    garmin_daily       one row per day (recovery + expenditure)
    garmin_activities  one row per workout
"""

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import requests

try:
    from garminconnect import (
        Garmin,
        GarminConnectAuthenticationError,
        GarminConnectConnectionError,
    )
except ImportError:
    sys.exit("Missing deps. Run: pip3 install garminconnect requests")

ROOT = Path(__file__).resolve().parent.parent
TOKENSTORE = os.path.expanduser("~/.garminconnect")


# --- env --------------------------------------------------------------------
def load_env():
    env = {}
    try:
        for line in (ROOT / ".env.local").read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    env.update({k: v for k, v in os.environ.items() if k.startswith(("GARMIN_", "SUPABASE_", "NEXT_PUBLIC_"))})
    return env


ENV = load_env()
SB_URL = ENV.get("NEXT_PUBLIC_SUPABASE_URL")
SB_KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY")
if not SB_URL or not SB_KEY:
    sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")


# --- garmin auth ------------------------------------------------------------
def connect(interactive=False):
    """Resume from saved token; fall back to credential login (with MFA) if asked."""
    try:
        g = Garmin()
        g.login(TOKENSTORE)  # loads + auto-refreshes saved tokens
        return g
    except (FileNotFoundError, GarminConnectAuthenticationError, GarminConnectConnectionError) as e:
        if not interactive:
            sys.exit(f"No valid Garmin token ({e}).\nRun once interactively: python3 scripts/garmin_sync.py --login")
    # Interactive credential login (one-time; handles MFA, then persists the token).
    email = ENV.get("GARMIN_EMAIL") or input("Garmin email: ")
    password = ENV.get("GARMIN_PASSWORD") or input("Garmin password: ")
    g = Garmin(email=email, password=password, return_on_mfa=True)
    res1, res2 = g.login(TOKENSTORE)
    if res1 == "needs_mfa":
        g.resume_login(res2, input("MFA code: ").strip())
    g.client.dump(TOKENSTORE)  # 0.3.x persistence (no garth)
    print(f"✓ token saved to {TOKENSTORE}")
    return g


# --- helpers ----------------------------------------------------------------
def pick(d, *keys):
    """First non-null value among keys in a (possibly nested-safe) dict."""
    if not isinstance(d, dict):
        return None
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return None


def safe(fn, *a):
    try:
        return fn(*a)
    except Exception as e:  # one bad endpoint shouldn't sink the whole day
        print(f"  ! {getattr(fn, '__name__', 'call')}: {e}", file=sys.stderr)
        return None


def as_int(v):
    """Garmin returns many counters as floats (kcal, hrv, stress). int columns reject those."""
    if v is None:
        return None
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return None


# --- extraction -------------------------------------------------------------
def daily_row(g, cdate):
    iso = cdate.isoformat()
    stats = safe(g.get_stats, iso) or {}
    sleep = safe(g.get_sleep_data, iso) or {}
    hrv = safe(g.get_hrv_data, iso) or {}

    dto = sleep.get("dailySleepDTO") or {}
    sleep_score = None
    scores = dto.get("sleepScores") or {}
    if isinstance(scores, dict):
        sleep_score = pick(scores.get("overall") or {}, "value")
    hrv_summary = (hrv or {}).get("hrvSummary") or {}

    row = {
        "day": iso,
        "resting_hr": as_int(pick(stats, "restingHeartRate")),
        "avg_hr": as_int(pick(stats, "averageHeartRate")),
        "max_hr": as_int(pick(stats, "maxHeartRate")),
        "hrv_ms": as_int(pick(hrv_summary, "lastNightAvg", "weeklyAvg")),
        "body_battery_high": as_int(pick(stats, "bodyBatteryHighestValue")),
        "body_battery_low": as_int(pick(stats, "bodyBatteryLowestValue")),
        "stress_avg": as_int(pick(stats, "averageStressLevel")),
        "sleep_score": as_int(sleep_score),
        "sleep_seconds": as_int(pick(dto, "sleepTimeSeconds")),
        "steps": as_int(pick(stats, "totalSteps")),
        "floors": as_int(pick(stats, "floorsAscended")),
        "active_kcal": as_int(pick(stats, "activeKilocalories")),
        "total_kcal": as_int(pick(stats, "totalKilocalories")),
        "bmr_kcal": as_int(pick(stats, "bmrKilocalories")),
    }
    return row


def activity_rows(g, start, end):
    acts = safe(g.get_activities_by_date, start.isoformat(), end.isoformat()) or []
    rows = []
    for a in acts:
        rows.append({
            "id": str(pick(a, "activityId")),
            "started_at": pick(a, "startTimeGMT", "startTimeLocal"),
            "type": pick(a.get("activityType") or {}, "typeKey"),
            "name": pick(a, "activityName"),
            "duration_s": as_int(pick(a, "duration")),
            "distance_m": pick(a, "distance"),
            "avg_hr": as_int(pick(a, "averageHR")),
            "max_hr": as_int(pick(a, "maxHR")),
            "kcal": as_int(pick(a, "calories")),
        })
    return [r for r in rows if r["id"] and r["id"] != "None"]


# --- supabase upsert --------------------------------------------------------
def upsert(table, rows, on_conflict):
    if not rows:
        return
    r = requests.post(
        f"{SB_URL}/rest/v1/{table}",
        params={"on_conflict": on_conflict},
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        data=json.dumps(rows),
        timeout=30,
    )
    if not r.ok:
        sys.exit(f"Supabase {table} upsert failed ({r.status_code}): {r.text}\nrow sample: {json.dumps(rows[0])}")


# --- main -------------------------------------------------------------------
def main():
    args = sys.argv[1:]
    if "--login" in args:
        connect(interactive=True)
        return
    days = int(args[args.index("--days") + 1]) if "--days" in args else 3

    g = connect()
    today = date.today()
    daily = [daily_row(g, today - timedelta(days=i)) for i in range(days)]
    upsert("garmin_daily", daily, "day")
    acts = activity_rows(g, today - timedelta(days=days), today)
    upsert("garmin_activities", acts, "id")
    print(f"✓ synced {len(daily)} day(s), {len(acts)} activity(ies) through {today}")


if __name__ == "__main__":
    main()
