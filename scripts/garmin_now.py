#!/usr/bin/env python3
"""On-demand "what's my HR right now" from Garmin Connect.

Garmin has no realtime push for consumer accounts: the freshest reading available
is the last intraday sample the *watch has synced to the cloud*. This pulls that
latest sample on demand (the twice-daily garmin_sync.py only stores day aggregates).

    python3 scripts/garmin_now.py            # human-readable
    python3 scripts/garmin_now.py --json     # {"bpm":..,"at":..,"age_s":..,"stale":bool}

Reuses the ~1-year token saved by `garmin_sync.py --login`. If a sample is older
than --max-age seconds (default 600), it's flagged stale — your watch hasn't synced
recently, so open the Garmin Connect app on your phone to push fresh data.
"""

import json
import os
import sys
from datetime import date, datetime

try:
    from garminconnect import Garmin
except ImportError:
    sys.exit("Missing deps. Run: pip3 install garminconnect")

TOKENSTORE = os.path.expanduser("~/.garminconnect")


def latest_hr():
    g = Garmin()
    g.login(TOKENSTORE)  # loads + auto-refreshes the saved token
    hr = g.get_heart_rates(date.today().isoformat()) or {}
    vals = [v for v in (hr.get("heartRateValues") or []) if v and v[1] is not None]
    if not vals:
        return None, hr
    ts_ms, bpm = vals[-1]
    return {
        "bpm": int(bpm),
        "at": datetime.fromtimestamp(ts_ms / 1000),
        "resting": hr.get("restingHeartRate"),
        "min": hr.get("minHeartRate"),
        "max": hr.get("maxHeartRate"),
    }, hr


def main():
    args = sys.argv[1:]
    as_json = "--json" in args
    max_age = int(args[args.index("--max-age") + 1]) if "--max-age" in args else 600

    sample, _ = latest_hr()
    if sample is None:
        msg = "No HR samples synced for today yet — open Garmin Connect on your phone to sync."
        print(json.dumps({"bpm": None, "stale": True, "reason": msg}) if as_json else msg)
        sys.exit(0 if as_json else 1)

    age_s = (datetime.now() - sample["at"]).total_seconds()
    stale = age_s > max_age

    if as_json:
        print(json.dumps({
            "bpm": sample["bpm"],
            "at": sample["at"].isoformat(),
            "age_s": int(age_s),
            "stale": stale,
            "resting": sample["resting"],
            "min": sample["min"],
            "max": sample["max"],
        }))
    else:
        flag = "  ⚠ stale (sync your watch)" if stale else ""
        print(f"{sample['bpm']} bpm  ·  {sample['at']:%H:%M:%S} ({age_s/60:.0f} min ago){flag}")
        print(f"resting {sample['resting']}  ·  today {sample['min']}–{sample['max']} bpm")


if __name__ == "__main__":
    main()
