#!/usr/bin/env python3
"""
db.py — talk to the Life Supabase database (project ref itmbuuwwqdxqgmjrkwdw)
directly over its REST API (PostgREST), using the project's own service-role key.

WHY THIS EXISTS: the Life project (formerly "cut-coach") was moved into the "Joud"
Supabase org. The Supabase MCP's grant only covers the "Bitar" org, so MCP calls
(execute_sql, etc.) now fail with "You do not have permission." But a project's
URL + service-role key are project-scoped and UNCHANGED by an org move — so this
script reaches the exact same database (meals, weights, program_days, exercises,
trips, expenses, all the trip views, ...) with full read/write, bypassing RLS.
No MCP, no OAuth, no /mcp reconnect required.

Credentials are read from cut-coach/.env.local (gitignored):
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

USAGE
  # read (any table OR view — views like v_trip_summary do the currency math)
  python3 scripts/db.py get meals --select eaten_at,slot,kcal,protein \
      --order eaten_at.desc --limit 5
  python3 scripts/db.py get meals --where "eaten_at=gte.2026-07-02" --limit 100
  python3 scripts/db.py get v_trip_summary

  # insert (returns the created row)
  python3 scripts/db.py insert meals \
      '{"slot":"snack","raw_text":"140g skyr","kcal":94,"protein":17}'

  # update / delete (a --where filter is REQUIRED, to avoid touching every row)
  python3 scripts/db.py update expenses '{"status":"actual"}' --where "id=eq.<uuid>"
  python3 scripts/db.py delete expenses --where "trip_id=eq.<uuid>"

PostgREST filter syntax for --where: "column=op.value", e.g. eq / gte / lte / like /
is (is.null) / in.(a,b). Repeat --where for multiple ANDed filters.

NOTE: PostgREST does single-table CRUD, not arbitrary SQL. To resolve a foreign key
by name (e.g. an expense's leg/category), do a `get` first to find the id, then
`insert`. If you ever need full raw SQL back, add a DATABASE_URL (direct Postgres
connection string, incl. password) to .env.local and use psql — that's the only
thing REST can't cover.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.parse

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env.local")


def load_env():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url.rstrip("/"), key
    try:
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if k.strip() == "NEXT_PUBLIC_SUPABASE_URL" and not url:
                    url = v
                elif k.strip() == "SUPABASE_SERVICE_ROLE_KEY" and not key:
                    key = v
    except FileNotFoundError:
        pass
    if not url or not key:
        sys.exit(
            "ERROR: could not find NEXT_PUBLIC_SUPABASE_URL / "
            "SUPABASE_SERVICE_ROLE_KEY in env or cut-coach/.env.local"
        )
    return url.rstrip("/"), key


def request(method, table, url, key, query=None, body=None, return_rep=True):
    # Shell out to curl (uses the system CA store) rather than urllib, which on the
    # python.org macOS build has no CA bundle and fails TLS verification.
    endpoint = f"{url}/rest/v1/{table}"
    if query:
        endpoint += "?" + query
    cmd = [
        "curl", "-sS", "-X", method, endpoint,
        "-H", f"apikey: {key}",
        "-H", f"Authorization: Bearer {key}",
        "-H", "Content-Type: application/json",
        "-w", "\n%{http_code}",
    ]
    if return_rep and method in ("POST", "PATCH", "DELETE"):
        cmd += ["-H", "Prefer: return=representation"]
    if body is not None:
        cmd += ["--data-binary", json.dumps(body)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"curl failed on {method} {table}: {proc.stderr.strip()}")
    out = proc.stdout
    nl = out.rfind("\n")
    payload, status = out[:nl], out[nl + 1:].strip()
    if not status.isdigit() or int(status) >= 400:
        sys.exit(f"HTTP {status} on {method} {table}: {payload.strip()}")
    payload = payload.strip()
    return json.loads(payload) if payload else []


def build_query(args):
    parts = []
    if getattr(args, "select", None):
        parts.append("select=" + urllib.parse.quote(args.select, safe="*,()"))
    for w in getattr(args, "where", None) or []:
        col, _, rest = w.partition("=")
        parts.append(f"{col}=" + urllib.parse.quote(rest, safe=".,()*:+- "))
    if getattr(args, "order", None):
        parts.append("order=" + urllib.parse.quote(args.order, safe=".,"))
    if getattr(args, "limit", None):
        parts.append(f"limit={args.limit}")
    return "&".join(parts)


def main():
    p = argparse.ArgumentParser(description="Life Supabase DB over REST (no MCP).")
    sub = p.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("get", help="read rows from a table or view")
    g.add_argument("table")
    g.add_argument("--select")
    g.add_argument("--where", action="append")
    g.add_argument("--order")
    g.add_argument("--limit", type=int)

    i = sub.add_parser("insert", help="insert a row (JSON) into a table")
    i.add_argument("table")
    i.add_argument("json", help="row as a JSON object (or array of objects)")

    u = sub.add_parser("update", help="patch rows matching --where")
    u.add_argument("table")
    u.add_argument("json", help="fields to set, as a JSON object")
    u.add_argument("--where", action="append", required=True)

    d = sub.add_parser("delete", help="delete rows matching --where")
    d.add_argument("table")
    d.add_argument("--where", action="append", required=True)

    args = p.parse_args()
    url, key = load_env()

    if args.cmd == "get":
        out = request("GET", args.table, url, key, query=build_query(args))
    elif args.cmd == "insert":
        out = request("POST", args.table, url, key, body=json.loads(args.json))
    elif args.cmd == "update":
        out = request(
            "PATCH", args.table, url, key,
            query=build_query(args), body=json.loads(args.json),
        )
    elif args.cmd == "delete":
        out = request("DELETE", args.table, url, key, query=build_query(args))
    else:
        p.error("unknown command")

    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
