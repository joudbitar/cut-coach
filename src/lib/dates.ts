// Owner-local date helpers. Defaults to Asia/Beirut; override with APP_TZ.
export const APP_TZ = process.env.APP_TZ || "Asia/Beirut";

// YYYY-MM-DD for a given instant in the owner's timezone.
export function localDateStr(d: Date = new Date(), tz: string = APP_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function prettyDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function prettyTime(iso: string, tz: string = APP_TZ): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) /
      86400000
  );
}
