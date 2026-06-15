// Weight trend math. The 7-day rolling average is the source of truth.

export type WeightPoint = { date: string; weight: number };

export type TrendPoint = WeightPoint & { avg: number | null };

// Returns each point with a trailing 7-calendar-day rolling average.
export function withRollingAvg(points: WeightPoint[]): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const cutoff = new Date(p.date);
    cutoff.setDate(cutoff.getDate() - 6);
    const window = sorted.filter(
      (q, j) => j <= i && new Date(q.date) >= cutoff
    );
    const avg =
      window.length > 0
        ? window.reduce((s, q) => s + q.weight, 0) / window.length
        : null;
    return { ...p, avg: avg == null ? null : Math.round(avg * 100) / 100 };
  });
}

// Week-over-week slope in kg/week, comparing the latest rolling avg to the one
// ~7 days earlier. Negative = losing weight.
export function weeklySlope(points: WeightPoint[]): number | null {
  const tp = withRollingAvg(points).filter((p) => p.avg != null);
  if (tp.length < 2) return null;
  const last = tp[tp.length - 1];
  const lastDate = new Date(last.date);
  const target = new Date(lastDate);
  target.setDate(target.getDate() - 7);
  // find the rolling-avg point closest to 7 days before last
  let prev = tp[0];
  let best = Infinity;
  for (const p of tp) {
    const diff = Math.abs(new Date(p.date).getTime() - target.getTime());
    if (diff < best) {
      best = diff;
      prev = p;
    }
  }
  const days = (lastDate.getTime() - new Date(prev.date).getTime()) / 86400000;
  if (days <= 0) return null;
  const perWeek = ((last.avg! - prev.avg!) / days) * 7;
  return Math.round(perWeek * 100) / 100;
}

// Control-loop guidance copy based on the weekly slope (loss is negative).
export function adjustmentGuidance(
  slopeKgPerWeek: number | null,
  weekIndex: number
): { tone: "info" | "good" | "warn"; text: string } {
  if (slopeKgPerWeek == null) {
    return {
      tone: "info",
      text: "Log a few more morning weigh-ins to establish your 7-day trend.",
    };
  }
  if (weekIndex <= 1) {
    return {
      tone: "info",
      text: "Week 1: early drop is mostly water/debloat (creatine + glycogen). Ignore the spike — wait for the trend to settle.",
    };
  }
  const loss = -slopeKgPerWeek; // positive = losing
  if (loss >= 0.8 && loss <= 1.0) {
    return { tone: "good", text: `On target (~${loss.toFixed(1)} kg/wk). Hold everything steady.` };
  }
  if (loss < 0.8) {
    return {
      tone: "warn",
      text: `Slow (~${loss.toFixed(1)} kg/wk). Add steps / Zone-2 cardio before cutting food. Food floor is 1700 kcal.`,
    };
  }
  if (loss > 1.2) {
    return {
      tone: "warn",
      text: `Fast (~${loss.toFixed(1)} kg/wk). Add 100-150 kcal back to protect muscle.`,
    };
  }
  return { tone: "good", text: `Reasonable pace (~${loss.toFixed(1)} kg/wk). Hold.` };
}
