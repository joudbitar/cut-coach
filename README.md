# Cut Coach

A single-user, PWA-installable mobile web app for running an aggressive-but-smart
cut: **Nutrition**, **Progress**, and **Training**. Next.js (App Router) + Supabase.

- **Today** — free-text meal logging (macros stay *pending* until enriched), kcal +
  protein rings, remaining macros, snack budget.
- **Log** — meal history by day + a *pending enrichment* view.
- **Progress** — morning weight with a 7-day rolling-average trend + week-over-week
  slope and control-loop guidance; waist/neck → Navy BF%; weekly progress photos.
- **Train** — seeded 4-day Upper/Lower retention split; start a session, log
  sets (weight/reps/RPE), per-exercise overload cues, workout history.

Locked behind a single **PIN**.

## Env

`.env.local` (already wired into Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, full DB access behind the PIN
APP_PIN_HASH=...                # sha256 of the PIN
SESSION_SECRET=...              # signs the session cookie
APP_TZ=Asia/Beirut              # owner-local day boundaries (optional)
```

Change the PIN: `node -e "console.log(require('crypto').createHash('sha256').update('NEWPIN').digest('hex'))"`
then update `APP_PIN_HASH` locally and in Vercel.

## Run locally

```
npm install
npm run dev
```

## Enrich macros (in Claude Code)

There is no in-app LLM tonight, so meals save raw text with macros `null`
("pending"). To fill them, open this project in Claude Code and:

1. **List pending meals:** `node scripts/list-pending.mjs` -> prints JSON of
   `{id, date, slot, text}` for every meal missing macros.
2. **Ask the AI to estimate** kcal / protein / fat / carb / fiber for each `text`.
3. **Write them back**, either one at a time:
   `node scripts/enrich.mjs <id> <kcal> <protein> <fat> <carb> <fiber>`
   or in bulk: `echo '[{"id":"...","kcal":330,"protein":52,"fat":9,"carb":6,"fiber":2}]' | node scripts/enrich.mjs --json`
4. Reload the app — the entries leave the *pending* view and the rings update.

(The schema keeps macro columns nullable so an in-app AI estimate can be switched
on later by adding an LLM key — no migration needed.)
