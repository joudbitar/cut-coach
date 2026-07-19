# Cut Coach

A personal cut tracker that does its macro math on your own Claude, not a paid API.

Plenty of people already paste meals into Claude to count calories, because it's the fastest way to do it. What Claude doesn't have is a UI that remembers your goals, or anywhere to keep the history. The apps that wrap that loop for you all call the Claude API, which costs money per meal. Cut Coach queues each meal for the Claude Max subscription I already pay for, renders it in a UI that knows my targets, and over time grew Garmin, steps, training, and health on top.

It's a single-user app, locked behind one PIN. The whole profile is mine.

<!-- screenshot: Today + Progress screens with real data. capture with: npm run dev, log in, seed a few days of meals/weights, then grab the phone-width Today and Progress views -->

## How it works

Four screens, one PIN.

Today is where food goes. You log a meal as free text and it saves right away with the macros left pending. Once Claude fills the numbers in, the kcal and protein rings and the remaining-macros strip update. Protein and fat are floors, carbs are a ceiling not a target, and there's a small snack budget on top of the day.

Progress works off the weight trend. Each morning's weigh-in rolls into a 7-day average with a week-over-week slope, and the coach line compares that slope to the target loss rate and tells me to hold, eat more, or tighten. Waist and neck give a US Navy body-fat estimate; weekly photos stack up next to it.

Train runs a seeded 4-day upper/lower split. Start a session, log each set with weight, reps, and RPE, get a per-exercise overload cue, keep the history. The same day can push to a Garmin watch so it guides the session set by set, since Garmin can't log strength work after the fact.

Health is a Garmin sync running in the background. It pulls daily expenditure, steps, and BMR, so the deficit math is sized on what I actually burned that day.

## The macro loop

No meal calls an LLM at request time. It saves as raw text with the macro columns null, showing as pending in the app. A Claude session picks up the pending rows, researches the real per-serving numbers, and writes them back:

```
node scripts/list-pending.mjs          # {id, date, slot, text} for every pending meal
# Claude estimates kcal / protein / fat / carb / fiber per text, then:
node scripts/enrich.mjs <id> <kcal> <protein> <fat> <carb> <fiber>
```

The macro columns stay nullable on purpose, so an in-app LLM key could take over the same job later with no migration.

## Run it locally

```
npm install
npm run dev
```

Needs a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, full DB access behind the PIN
APP_PIN_HASH=...                # sha256 of the PIN
SESSION_SECRET=...              # signs the session cookie
APP_TZ=Asia/Beirut              # local day boundaries (optional)
```

Set the PIN hash with:

```
node -e "console.log(require('crypto').createHash('sha256').update('YOURPIN').digest('hex'))"
```

## How it's built

Next.js 16 (App Router) and React 19, a Supabase Postgres behind it, Tailwind 4, deployed on Vercel and installable as a PWA. A few choices worth calling out:

- The macro math runs on my Claude Max subscription instead of the metered API. That's the reason the app exists, and it's why meals save first and get their numbers second.
- TDEE comes from an 11-day Garmin average of what I actually burned, not a BMR equation. The deficit is sized against a real number.
- The cut is treated as a control loop. The 7-day rolling average and its slope drive the guidance, so one bad day of water weight doesn't move the plan.
- Auth is a single PIN and a signed cookie. Single user means no accounts table and no per-row ownership, one opaque session token issued on every correct PIN.

## What it doesn't do

- Not multi-user. No signup, no accounts. My height, weight, TDEE, and targets are hard-coded in `src/lib/targets.ts`; forking it means editing that file to be your own.
- No automatic macro counting. Meals sit pending until I run a Claude session against them, so the numbers lag the eating. That's the tradeoff for not paying per meal.
- Not a general fitness app. It assumes an aggressive cut and one specific training split, not a flexible plan you configure.

## License

Personal project, no license. Ask if you want to use a piece of it.
