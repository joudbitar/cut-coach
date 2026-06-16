// Small, tasteful number-formatting helpers for dashboard primitives.
// Keep these dependency-free and deterministic (no locale surprises).

/** 1-decimal weight, e.g. 82.4 */
export function fmtWeight(v: number): string {
  return v.toFixed(1);
}

/** Integer with thousands separators, e.g. 2,140 — for kcal / steps. */
export function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("en-US");
}

/** Signed delta with optional unit, e.g. +1.2, -340. */
export function fmtDelta(v: number, opts?: { decimals?: number; unit?: string }): string {
  const decimals = opts?.decimals ?? 0;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  const mag = Math.abs(v).toFixed(decimals);
  const unit = opts?.unit ? opts.unit : "";
  return `${sign}${mag}${unit}`;
}

/** Deterministic, DOM-id-safe slug derived from a label — for SVG <defs> ids. */
export function slugId(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "chart";
}
