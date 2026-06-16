# Building the scrubbable movement figure

A side-view stick figure driven by a single `<input type="range">` (0 → 1). On each `input` event, recompute every joint coordinate from the slider value `t` and update the SVG. This produces a smooth "scrub through the rep" animation and is fully dark-mode safe.

## The joint-chain model

Anchor one fixed point (usually the ankle for standing lifts, or the bench/floor for lying lifts) and build the body outward as a chain of fixed-length segments. Only the *angles* and a few offsets change with `t`.

```
ankle (fixed) → knee → hip → shoulder → head
                                shoulder → hands/bar
```

Segment lengths that read well in a ~300×280 viewBox:
`shin 58, thigh 58, torso 74, headOff 22 (shoulder→head center), arm 56`. Stroke width 7–9, `stroke-linecap="round"`. Head is a `<circle r="13">`. A barbell in side view is a `<circle r="11" fill="none" stroke>`; a dumbbell is two small filled circles; bodyweight = no bar.

Color the working segment with the muscle's ramp hex (e.g. torso `#534AB7` purple for a hinge) and the rest with `var(--color-text-primary)` / `#888780` so the eye goes to what's working.

## Worked example — Romanian deadlift (hip hinge)

```js
var A={x:120,y:252}, shin=58, thigh=58, torso=74, headOff=22, arm=56;
function frame(t){                       // t: 0 = standing, 1 = bottom stretch
  var K={x:A.x+8+t*4, y:A.y-shin};                       // knee barely moves (soft)
  var H={x:K.x - t*44, y:K.y - thigh + t*8};             // hips travel BACK + slightly down
  var th=t*72*Math.PI/180;                               // torso angle from vertical
  var S={x:H.x+Math.sin(th)*torso, y:H.y-Math.cos(th)*torso};   // shoulder
  var Hd={x:S.x+Math.sin(th)*headOff, y:S.y-Math.cos(th)*headOff}; // head center
  var Ba={x:S.x, y:S.y+arm};                             // hands hang straight down (gravity)
  // setLine(legShin,A,K); setLine(legThigh,K,H); setLine(torso,H,S);
  // head.cx=Hd.x ...; bar.cx=Ba.x, bar.cy=Ba.y;
}
```

The defining trait of a hinge: hips go *back* (`H.x` decreases), torso angle grows, knees barely bend. The arms always hang vertically from the shoulder (the bar tracks straight down the legs).

## Adapting to other movements

Reuse the chain; change which joints move and the angle relationships.

- **Back/front squat** — knees travel forward AND hips drop nearly straight down; torso stays more upright (front squat ≈ vertical, back squat leans ~25°). Bar on shoulders/back, not in hanging hands: place bar at the shoulder point, not `S.y+arm`. `t`: 0 = standing, 1 = bottom (hip crease below knee). Color quads `#185FA5` blue.
- **Conventional deadlift** — like RDL but knees bend much more and hips start lower; bar reaches the floor at `t=1`. Hips and knees extend together on the way up.
- **Bench press / overhead press** — anchor the shoulder/torso (lying or standing upright). Only the elbow/hand chain moves: hands travel along a vertical (press) or slight arc (bench). `t`: 0 = lockout, 1 = bar at chest. Color chest `#D85A30` coral or shoulders `#534AB7`.
- **Bicep curl / row** — anchor shoulder; forearm rotates about the elbow. Single moving segment.
- **Hip thrust / glute bridge** — anchor shoulders on a bench and feet on floor; the hips rise/fall (vertical) as the torso angle changes. Color glutes `#534AB7` purple.

When a movement has a clear "stretched" and "contracted" end, map `t=0` to the resting/locked-out position and `t=1` to the working/stretched position so the cue text reads naturally.

## Cue text

Tie a short coaching cue to `t` ranges and update a `<p>` as the user scrubs (≈4 phases: setup → initiation → mid-range → end position). Keep each under ~10 words. Always include the safety cue at the deep end (e.g. "never round the spine to go lower").

## Geometry sanity checks

- Nothing should cross the floor line or fold through another segment at any `t`.
- Test `t=0`, `t=0.5`, `t=1` mentally before rendering.
- Round any displayed number; SVG coords don't need rounding but keep them sane.
- Call `frame(0)` once at script end to draw the initial pose.
