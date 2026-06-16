// Energy-balance helpers shared by EnergyBalanceCard (below fold) and the
// WeekGlance summary tile, so both read expenditure the same way.

import type { DayRow } from "./data";

// Mean of the non-null entries, or null if none.
export function avgNonNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((s, v) => s + v, 0) / present.length;
}

// Best estimate of daily expenditure: prefer Garmin's total, else BMR + active.
export function expenditure(d: DayRow): number | null {
  if (d.totalKcal != null) return d.totalKcal;
  if (d.bmrKcal != null && d.activeKcal != null) return d.bmrKcal + d.activeKcal;
  return null;
}
