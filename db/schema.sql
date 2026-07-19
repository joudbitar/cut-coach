-- Cut Coach schema. Run this once against a fresh Supabase project
-- (SQL editor, or `psql < db/schema.sql`) to create every table the app reads
-- and writes, plus the photos storage bucket and a default training program.
--
-- The app talks to Postgres with the service-role key from the server only,
-- behind the PIN gate, so RLS is left on with no policies: anon and authenticated
-- roles get nothing, the service role bypasses RLS. Don't expose the anon key to
-- these tables.

create extension if not exists pgcrypto;

-- ── Nutrition ────────────────────────────────────────────────────────────────
create table if not exists meals (
  id        uuid primary key default gen_random_uuid(),
  eaten_at  timestamptz not null default now(),
  slot      text not null default 'snack',   -- breakfast | lunch | dinner | snack
  raw_text  text not null,
  kcal      numeric,   -- null until a Claude session fills the macros in
  protein   numeric,
  fat       numeric,
  carb      numeric,
  fiber     numeric
);
create index if not exists meals_eaten_at_idx on meals (eaten_at);

-- ── Progress ─────────────────────────────────────────────────────────────────
create table if not exists weights (
  id           uuid primary key default gen_random_uuid(),
  measured_on  date not null unique,   -- one weigh-in per day, upserted
  weight_kg    numeric not null
);

create table if not exists measurements (
  id           uuid primary key default gen_random_uuid(),
  measured_on  date not null,
  waist_cm     numeric not null,
  neck_cm      numeric not null,
  bf_pct       numeric   -- US Navy estimate, computed on insert
);

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  taken_on      date not null,
  storage_path  text not null   -- path inside the `photos` storage bucket
);

-- ── Training ─────────────────────────────────────────────────────────────────
create table if not exists program_days (
  id    uuid primary key default gen_random_uuid(),
  key   text not null unique,   -- stable id, e.g. upper-a
  name  text not null,
  ord   int not null default 0
);

create table if not exists exercises (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references program_days (id) on delete cascade,
  name          text not null,
  muscle        text not null,
  target_sets   int not null default 3,
  target_reps   text not null default '8-12',
  ord           int not null default 0
);
create index if not exists exercises_day_id_idx on exercises (day_id);

create table if not exists workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid references program_days (id) on delete set null,
  day_key      text,
  day_name     text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create table if not exists set_logs (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references workout_sessions (id) on delete cascade,
  exercise_id    uuid,
  exercise_name  text,
  set_number     int,
  weight_kg      numeric,
  reps           int,
  rpe            numeric,
  created_at     timestamptz not null default now()
);
create index if not exists set_logs_session_idx on set_logs (session_id);
create index if not exists set_logs_exercise_idx on set_logs (exercise_id);

-- ── Health (optional Garmin sync) ────────────────────────────────────────────
-- Populated by scripts/garmin_sync.py. The app degrades to nulls without it and
-- falls back to the computed TDEE in src/lib/targets.ts.
create table if not exists garmin_daily (
  day                 date primary key,
  resting_hr          numeric,
  max_hr              numeric,
  hrv_ms              numeric,
  body_battery_high   numeric,
  body_battery_low    numeric,
  stress_avg          numeric,
  sleep_score         numeric,
  sleep_seconds       numeric,
  steps               numeric,
  floors              numeric,
  active_kcal         numeric,
  total_kcal          numeric,
  bmr_kcal            numeric
);

create table if not exists garmin_activities (
  id           text primary key,
  started_at   timestamptz not null,
  type         text,
  name         text,
  duration_s   numeric,
  distance_m   numeric,
  avg_hr       numeric,
  max_hr       numeric,
  kcal         numeric
);

-- ── Lock the tables down (service role bypasses this) ────────────────────────
alter table meals             enable row level security;
alter table weights           enable row level security;
alter table measurements      enable row level security;
alter table photos            enable row level security;
alter table program_days      enable row level security;
alter table exercises         enable row level security;
alter table workout_sessions  enable row level security;
alter table set_logs          enable row level security;
alter table garmin_daily      enable row level security;
alter table garmin_activities enable row level security;

-- ── Photos storage bucket (private) ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- ── Default training program: 4-day upper/lower split ────────────────────────
-- Edit or replace after setup; the app reads whatever is in these tables.
insert into program_days (key, name, ord) values
  ('upper-a', 'Upper A', 1),
  ('lower-a', 'Lower A', 2),
  ('upper-b', 'Upper B', 3),
  ('lower-b', 'Lower B', 4)
on conflict (key) do nothing;

insert into exercises (day_id, name, muscle, target_sets, target_reps, ord)
select d.id, e.name, e.muscle, e.target_sets, e.target_reps, e.ord
from (values
  ('upper-a', 'Dumbbell Bench Press', 'Chest',      3, '5-8',   1),
  ('upper-a', 'Seated Cable Row',     'Back',        3, '6-8',   2),
  ('upper-a', 'Lat Pulldown',         'Back',        2, '8-12',  3),
  ('upper-a', 'Weighted Dip',         'Chest',       2, '8-12',  4),
  ('upper-a', 'Lateral Raise',        'Shoulders',   3, '12-20', 5),
  ('upper-a', 'Rear Delt Fly',        'Rear Delts',  2, '15-20', 6),
  ('upper-a', 'Barbell Curl',         'Biceps',      2, '8-12',  7),
  ('lower-a', 'Back Squat',           'Quads',       3, '5-8',   1),
  ('lower-a', 'Romanian Deadlift',    'Hamstrings',  3, '8-10',  2),
  ('lower-a', 'Leg Press',            'Quads',       2, '10-12', 3),
  ('lower-a', 'Seated Leg Curl',      'Hamstrings',  2, '10-12', 4),
  ('lower-a', 'Standing Calf Raise',  'Calves',      2, '10-15', 5),
  ('lower-a', 'Hanging Leg Raise',    'Abs',         2, '10-15', 6),
  ('upper-b', 'Incline DB Press',     'Chest',       3, '6-8',   1),
  ('upper-b', 'Pull-up',              'Back',        3, '6-10',  2),
  ('upper-b', 'Overhead Press',       'Shoulders',   2, '6-8',   3),
  ('upper-b', 'Chest-Supported Row',  'Back',        2, '10-12', 4),
  ('upper-b', 'Lateral Raise',        'Shoulders',   3, '12-15', 5),
  ('upper-b', 'Hammer Curl',          'Biceps',      2, '10-12', 6),
  ('upper-b', 'Overhead Triceps Extension', 'Triceps', 2, '10-12', 7),
  ('lower-b', 'Deadlift',             'Hamstrings',  2, '4-6',   1),
  ('lower-b', 'Bulgarian Split Squat','Quads',       3, '8-10',  2),
  ('lower-b', 'Leg Extension',        'Quads',       2, '12-15', 3),
  ('lower-b', 'Lying Leg Curl',       'Hamstrings',  2, '10-12', 4),
  ('lower-b', 'Seated Calf Raise',    'Calves',      2, '12-15', 5),
  ('lower-b', 'Cable Crunch',         'Abs',         3, '12-15', 6)
) as e(day_key, name, muscle, target_sets, target_reps, ord)
join program_days d on d.key = e.day_key
where not exists (
  select 1 from exercises x where x.day_id = d.id and x.name = e.name and x.ord = e.ord
);
