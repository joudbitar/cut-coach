# Widget layout

The guide is one `show_widget` HTML call. Use this structure (the RDL guide is the reference implementation). Adapt copy, colors, and figure to the exercise. Keep prose out — it goes in the chat response.

## Sections, top to bottom

1. **`sr-only` h2** — one-sentence summary for screen readers.
2. **Header row** — `<h1>` exercise name (22px/500) + a one-line muted tagline.
3. **Muscle badges** — small pills, one per worked muscle, colored by the muscle→ramp map in SKILL.md (text uses the 800/900 stop of that ramp).
4. **Two-column grid** (`repeat(auto-fit,minmax(260px,1fr))`):
   - Left card (`background-secondary`): the scrubbable `<svg>` figure + range slider with "Top"/"Stretch" (or movement-appropriate) end labels + a live cue `<p>`.
   - Right column: a white "How to do it" card with a numbered `<ol>` (5 short steps), then the **video link card** (`<a href>` with a play-icon circle, title, "youtube.com · external-link").
5. **Two-column grid** — teal-green "Form cues" card (`#E1F5EE` bg, `#04342C` text, `ti-check`) and red "Common mistakes" card (`#FCEBEB` bg, `#501313` text, `ti-x`), 4 bullets each.
6. **Personalized note** — one slim card tying the lift to Joud's cut (rep range / weekly placement / recovery caveat). Use `background-info` or a neutral surface; label it clearly as coaching, e.g. "For your cut".

## Conventions

- Outer wrapper: `<div style="padding:1rem 0;">`. No fixed positioning, no `display:none` sections, no tabs/carousels.
- Cards: `border-radius: var(--border-radius-lg)`, white cards get `0.5px solid var(--color-border-tertiary)`.
- The slider drives a single `frame(t)` JS function (see FIGURES.md), wired on `input`, called once with `frame(0)` at the end. Script goes last.
- Loading messages: 2–3, ~5 words, describing the movement being set up.

## Video link card snippet

```html
<a href="https://www.youtube.com/watch?v=VIDEO_ID" style="text-decoration:none;display:flex;align-items:center;gap:12px;background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:12px 14px;">
  <span style="flex:none;width:38px;height:38px;border-radius:50%;background:#FCEBEB;display:flex;align-items:center;justify-content:center;color:#A32D2D;"><i class="ti ti-player-play" style="font-size:20px;" aria-hidden="true"></i></span>
  <span>
    <span style="display:block;font-size:13px;font-weight:500;color:var(--color-text-primary);">Watch: TITLE</span>
    <span style="display:block;font-size:12px;color:var(--color-text-secondary);">youtube.com <i class="ti ti-external-link" style="font-size:12px;" aria-hidden="true"></i></span>
  </span>
</a>
```
