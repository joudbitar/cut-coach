import { fmtInt } from "@/lib/format";

type Macro = { value: number; target: number };

// One shared three-segment strip: fat / carbs / fiber. Each segment's WIDTH
// reflects its share of the total macro-gram budget; each segment is its own
// faint colored track that FILLS toward its target. Replaces three stacked
// full-width bars with a single 8px instrument.
export default function MacroStrip({
  fat,
  carb,
  fiber,
}: {
  fat: Macro;
  carb: Macro;
  fiber: Macro;
}) {
  const segs = [
    { key: "Fat", m: fat, color: "var(--accent)" },
    { key: "Carbs", m: carb, color: "var(--accent-2)" },
    { key: "Fiber", m: fiber, color: "var(--good)" },
  ];

  return (
    <div>
      <div className="strip">
        {segs.map((s) => {
          const pct = s.m.target > 0 ? Math.min(s.m.value / s.m.target, 1) : 0;
          return (
            <span
              key={s.key}
              style={{
                flexGrow: Math.max(s.m.target, 1),
                background: `color-mix(in srgb, ${s.color} 16%, var(--bg-elev))`,
              }}
            >
              <span style={{ width: `${pct * 100}%`, background: s.color }} />
            </span>
          );
        })}
      </div>
      <div className="cap" style={{ marginTop: 7 }}>
        Fat {fmtInt(fat.value)}/{fmtInt(fat.target)} · Carbs {fmtInt(carb.value)}/
        {fmtInt(carb.target)} · Fiber {fmtInt(fiber.value)}/{fmtInt(fiber.target)}
      </div>
    </div>
  );
}
