import { adjustmentGuidance } from "@/lib/trend";

// The app's one sentence of advice on the primary screen, slope-driven.
// The full per-card guidance still lives in CutProgressCard below the fold.
export default function CoachLine({
  slope,
  weekIndex,
}: {
  slope: number | null;
  weekIndex: number;
}) {
  const { tone, text } = adjustmentGuidance(slope, weekIndex);
  const cls = tone === "good" ? "coach-good" : tone === "warn" ? "coach-warn" : "";
  return <p className={`coach ${cls}`}>{text}</p>;
}
