---
name: exercise-coach
description: Generate an interactive HTML exercise-form guide — a scrubbable movement figure, muscles worked, step-by-step instructions, form cues, common mistakes, and a real tutorial video — rendered with the visualize show_widget tool and personalized to Joud's cut-coach data. Use when the user asks how to do an exercise/lift/movement, says "teach me how to do X", wants exercise coaching, or invokes /exercise-coach.
---

# Exercise coach

Produce a polished, interactive HTML guide for a single exercise, rendered inline via the `mcp__visualize__show_widget` tool. Every guide has: a scrubbable side-view movement figure, the muscles worked, numbered how-to steps, form cues, common mistakes, and a verified tutorial-video link.

## Workflow

1. **Find a real video.** Use `WebSearch` for a reputable tutorial (Jeff Nippard, Squat University, Renaissance Periodization, Athlean-X, etc.). Use the actual `youtube.com/watch?v=...` URL from results — NEVER fabricate a video ID. If no solid result, link a YouTube search URL instead and say so. YouTube iframes are blocked by the widget CSP, so always use a styled link card (`<a href>`), never an embed.

2. **Personalize from cut-coach data.** This skill is for Joud, who is cutting. Pull context before generating:
   - Static profile + targets: read `src/lib/targets.ts` (or recall [[joud-profile-and-targets]] — cutting, 1800 kcal, 180g protein/day).
   - Live data via the project REST helper — `python3 scripts/db.py get weights --order created_at.desc --limit 14`, and similarly `set_logs`/`workout_sessions`/`exercises` to see if he already trains this lift. (The Supabase MCP can no longer reach project `itmbuuwwqdxqgmjrkwdw` — it moved to the "Joud" org; use `scripts/db.py`, which hits the same DB over REST. See [[coach-pull-live-data]] and the root `CLAUDE.md`.)
   - Use it to tailor ONE short personalized note in the guide: suggested rep range for a cut (hypertrophy/strength-maintenance bias), where the lift fits his week, or a recovery caveat if Garmin shows poor sleep/HRV. Keep it to one card — don't bury the form instruction.

3. **Build the figure.** Author a custom scrubbable side-view SVG for THIS movement using a joint-chain model driven by a range slider. Full technique, math, and per-movement geometry in [FIGURES.md](FIGURES.md). The figure is the centerpiece — build it every time, don't reuse RDL geometry blindly.

4. **Render the widget.** Call `mcp__visualize__read_me` (modules `["interactive"]`) once per session if not already loaded, then `show_widget`. Follow the layout in [TEMPLATE.md](TEMPLATE.md). Put explanatory prose in your chat response, not inside the widget.

5. **Caption in chat.** Below the widget, write the single most important coaching point in plain text, plus the video source as a markdown link.

## Rules

- One exercise per guide. If asked for several, generate them one at a time (or ask which first).
- All widget design rules from `read_me` apply: sentence case, two font weights, CSS variables for theming, no fabricated icons, dark-mode safe.
- Colors: hamstrings/posterior = teal, glutes = purple, back/erectors = amber, quads = blue, chest/push = coral. Keep the "form cues" card teal-green and "common mistakes" card red.
- Never invent anatomy, cues, or rep science. If unsure about a movement, say so and lean on the verified video.
