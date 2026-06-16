#!/usr/bin/env python3
"""Push a cut-coach program day into Garmin Connect as a structured strength workout.

Reads a day from the app's program (program_days + exercises in Supabase), builds
Garmin's strength-workout JSON, uploads it, and (optionally) schedules it for a date.
After your watch's next sync it shows up under Workouts and guides you set-by-set.

    python3 scripts/push_workout.py lower-a               # upload "Lower A"
    python3 scripts/push_workout.py lower-a --date today  # upload + schedule for today
    python3 scripts/push_workout.py upper-b --date 2026-06-18
    python3 scripts/push_workout.py --list                # show day keys
    python3 scripts/push_workout.py lower-a --replace     # delete same-named first

Reuses the saved Garmin token (scripts/garmin_sync.py --login) and the Supabase
keys in .env.local. Reps target = top of the program's rep range (e.g. "5-8" -> 8).

Exercise mapping (EX_MAP): name -> (garmin_category, garmin_exercise_name | None).
Categories are Garmin's broad movement buckets; the exercise name is the specific
variant. When a specific name isn't known, we send category-only — Garmin accepts
that and the watch shows the movement category. Confirmed names came from a workout
hand-built in Garmin Connect and read back via the API.
"""

import json
import os
import sys
from datetime import date
from pathlib import Path

import requests

try:
    from garminconnect import Garmin
except ImportError:
    sys.exit("Missing deps. Run: pip3 install garminconnect requests")

ROOT = Path(__file__).resolve().parent.parent
TOKENSTORE = os.path.expanduser("~/.garminconnect")


# --- env (same loader as garmin_sync.py) -----------------------------------
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
    env.update({k: v for k, v in os.environ.items() if k.startswith(("SUPABASE_", "NEXT_PUBLIC_"))})
    return env


ENV = load_env()
SB_URL = ENV.get("NEXT_PUBLIC_SUPABASE_URL")
SB_KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY")
if not SB_URL or not SB_KEY:
    sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")


# --- exercise -> Garmin (category, exerciseName|None) ------------------------
# None name == category-only (always accepted; watch shows the movement category).
EX_MAP = {
    # Lower A (names confirmed via round-trip)
    "Back Squat": ("SQUAT", "BARBELL_BACK_SQUAT"),
    "Romanian Deadlift": ("DEADLIFT", "ROMANIAN_DEADLIFT"),
    "Leg Press": ("SQUAT", "LEG_PRESS"),
    "Seated Leg Curl": ("LEG_CURL", "LEG_CURL"),
    "Standing Calf Raise": ("CALF_RAISE", "STANDING_CALF_RAISE"),
    "Hanging Leg Raise": ("LEG_RAISE", "HANGING_LEG_RAISE"),
    # Upper A
    "Barbell Bench Press": ("BENCH_PRESS", "BARBELL_BENCH_PRESS"),
    "Barbell Row": ("ROW", "BARBELL_ROW"),
    "Seated DB Shoulder Press": ("SHOULDER_PRESS", "SEATED_DUMBBELL_SHOULDER_PRESS"),
    "Lat Pulldown": ("PULL_UP", None),
    "Incline DB Press": ("BENCH_PRESS", "INCLINE_DUMBBELL_BENCH_PRESS"),
    "Cable Face Pull": ("ROW", None),
    "Triceps Pushdown": ("TRICEPS_EXTENSION", None),
    "Barbell Curl": ("CURL", "BARBELL_BICEPS_CURL"),
    # Upper B
    "Incline Barbell Press": ("BENCH_PRESS", "BARBELL_INCLINE_BENCH_PRESS"),
    "Weighted Pull-up": ("PULL_UP", "WEIGHTED_PULL_UP"),
    "Overhead Press": ("SHOULDER_PRESS", "OVERHEAD_BARBELL_PRESS"),
    "Chest-Supported Row": ("ROW", None),
    "Cable Fly": ("FLYE", None),
    "Lateral Raise": ("LATERAL_RAISE", "DUMBBELL_LATERAL_RAISE"),
    "Hammer Curl": ("CURL", "HAMMER_CURL"),
    "Overhead Triceps Extension": ("TRICEPS_EXTENSION", None),
    # Lower B
    "Deadlift": ("DEADLIFT", "BARBELL_DEADLIFT"),
    "Bulgarian Split Squat": ("SQUAT", None),
    "Leg Extension": ("LEG_CURL", None),
    "Lying Leg Curl": ("LEG_CURL", "LYING_LEG_CURL"),
    "Seated Calf Raise": ("CALF_RAISE", "SEATED_CALF_RAISE"),
    "Cable Crunch": ("CRUNCH", "CABLE_CRUNCH"),
}

STRENGTH = {"sportTypeId": 5, "sportTypeKey": "strength_training", "displayOrder": 5}
KG = {"unitId": 8, "unitKey": "kilogram", "factor": 1000.0}


# --- supabase ---------------------------------------------------------------
def sb_get(path, params):
    r = requests.get(
        f"{SB_URL}/rest/v1/{path}",
        params=params,
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"},
        timeout=30,
    )
    if not r.ok:
        sys.exit(f"Supabase GET {path} failed ({r.status_code}): {r.text}")
    return r.json()


def get_day(key):
    days = sb_get("program_days", {"key": f"eq.{key}", "select": "id,key,name"})
    if not days:
        keys = [d["key"] for d in sb_get("program_days", {"select": "key", "order": "ord"})]
        sys.exit(f"No program day '{key}'. Available: {', '.join(keys)}")
    day = days[0]
    exs = sb_get("exercises", {
        "day_id": f"eq.{day['id']}",
        "select": "name,muscle,target_sets,target_reps,ord",
        "order": "ord",
    })
    return day, exs


def top_reps(target_reps):
    """'5-8' -> 8, '10' -> 10, junk -> 10."""
    try:
        return int(str(target_reps).split("-")[-1].strip())
    except (ValueError, AttributeError):
        return 10


# --- workout JSON -----------------------------------------------------------
def exercise_step(order, name, reps):
    cat, ex_name = EX_MAP.get(name, (None, None))
    return {
        "type": "ExecutableStepDTO",
        "stepOrder": order,
        "stepType": {"stepTypeId": 3, "stepTypeKey": "interval", "displayOrder": 3},
        "endCondition": {"conditionTypeId": 10, "conditionTypeKey": "reps", "displayOrder": 10, "displayable": True},
        "endConditionValue": float(reps),
        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target", "displayOrder": 1},
        "category": cat,
        "exerciseName": ex_name,
        "weightValue": 0.0,
        "weightUnit": KG,
        "description": None if cat else name,  # keep the label if we couldn't categorize
    }


def rest_step(order):
    return {
        "type": "ExecutableStepDTO",
        "stepOrder": order,
        "stepType": {"stepTypeId": 5, "stepTypeKey": "rest", "displayOrder": 5},
        "endCondition": {"conditionTypeId": 1, "conditionTypeKey": "lap.button", "displayOrder": 1, "displayable": True},
        "endConditionValue": 0.0,
        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target", "displayOrder": 1},
        "category": None,
        "weightValue": -1.0,
        "weightUnit": KG,
    }


def build_workout(name, exercises):
    steps = []
    order = 1
    for ex in exercises:
        sets = int(ex.get("target_sets") or 3)
        reps = top_reps(ex.get("target_reps"))
        group = {
            "type": "RepeatGroupDTO",
            "stepOrder": order,
            "stepType": {"stepTypeId": 6, "stepTypeKey": "repeat", "displayOrder": 6},
            "numberOfIterations": sets,
            "smartRepeat": False,
            "endCondition": {"conditionTypeId": 7, "conditionTypeKey": "iterations", "displayOrder": 7, "displayable": False},
            "endConditionValue": float(sets),
            "workoutSteps": [exercise_step(order + 1, ex["name"], reps), rest_step(order + 2)],
        }
        steps.append(group)
        order += 3
    return {
        "workoutName": name,
        "sportType": STRENGTH,
        "workoutSegments": [{
            "segmentOrder": 1,
            "sportType": STRENGTH,
            "workoutSteps": steps,
        }],
    }


# --- main -------------------------------------------------------------------
def main():
    args = sys.argv[1:]
    g = Garmin()
    g.login(TOKENSTORE)

    if "--list" in args or not args:
        for d in sb_get("program_days", {"select": "key,name,ord", "order": "ord"}):
            print(f"  {d['key']:10} {d['name']}")
        if not args:
            print("\nUsage: push_workout.py <day-key> [--date today|YYYY-MM-DD] [--replace]")
        return

    key = args[0]
    day, exs = get_day(key)
    if not exs:
        sys.exit(f"Day '{key}' has no exercises.")
    name = day["name"]

    if "--replace" in args:
        for w in (g.get_workouts(0, 100) or []):
            if w.get("workoutName") == name:
                g.delete_workout(w["workoutId"])
                print(f"  deleted existing '{name}' ({w['workoutId']})")

    workout = build_workout(name, exs)
    res = g.upload_workout(workout)
    wid = res.get("workoutId") if isinstance(res, dict) else None
    print(f"✓ uploaded '{name}' ({len(exs)} exercises)  workoutId={wid}")
    # report mapping quality
    fuzzy = [e["name"] for e in exs if EX_MAP.get(e["name"], (None, None))[1] is None]
    if fuzzy:
        print(f"  (category-only, no exact Garmin name: {', '.join(fuzzy)})")

    if "--date" in args and wid:
        d = args[args.index("--date") + 1]
        d = date.today().isoformat() if d == "today" else d
        g.schedule_workout(wid, d)
        print(f"✓ scheduled for {d}")
    elif wid:
        print("  (not scheduled — add --date today to put it on your calendar)")


if __name__ == "__main__":
    main()
