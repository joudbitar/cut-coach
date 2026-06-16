// Weekly training-volume bucketing shared by TrainingCard (below fold) and the
// WeekGlance summary tile.

import type { SessionVolume } from "./data";

export type Week = {
  monday: string; // YYYY-MM-DD of the Monday anchoring the week
  tonnageKg: number;
  setCount: number;
  avgRpe: number | null;
};

// Deterministic Monday-of-week for a YYYY-MM-DD date string. No Date.now —
// the reference is the date itself. Computed in UTC to avoid DST/locale drift.
export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

// Group sessions into weekly buckets keyed by the Monday of each session's
// week, then return them ascending by week.
export function toWeeks(sessions: SessionVolume[]): Week[] {
  const buckets = new Map<string, { tonnageKg: number; setCount: number; rpeSum: number; rpeN: number }>();
  for (const s of sessions) {
    const key = mondayOf(s.date);
    let b = buckets.get(key);
    if (!b) {
      b = { tonnageKg: 0, setCount: 0, rpeSum: 0, rpeN: 0 };
      buckets.set(key, b);
    }
    b.tonnageKg += s.totalVolumeKg;
    b.setCount += s.setCount;
    if (s.avgRpe != null) {
      b.rpeSum += s.avgRpe;
      b.rpeN += 1;
    }
  }
  return Array.from(buckets.entries())
    .map(([monday, b]) => ({
      monday,
      tonnageKg: b.tonnageKg,
      setCount: b.setCount,
      avgRpe: b.rpeN ? b.rpeSum / b.rpeN : null,
    }))
    .sort((a, b) => a.monday.localeCompare(b.monday));
}
