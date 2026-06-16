// The single pre-chewed answer to "am I on track this week?" — a right-aligned
// header word driven by the weekly weight slope. Honest by construction: with
// fewer than two weigh-ins (or no slope) it reads a neutral "Getting started"
// rather than a false "On track".
export default function Verdict({
  slope,
  weighInCount,
}: {
  slope: number | null;
  weighInCount: number;
}) {
  let word = "Getting started";
  let cls = "verdict-muted";

  if (weighInCount >= 2 && slope != null) {
    const loss = -slope; // positive = losing
    if (loss >= 0.8 && loss <= 1.2) {
      word = "On track";
      cls = "verdict-good";
    } else if (loss < 0.8) {
      word = "Off pace";
      cls = "verdict-warn";
    } else {
      word = "Settling";
      cls = "verdict-warn";
    }
  }

  return <span className={`cap num ${cls}`} style={{ fontWeight: 600 }}>{word}</span>;
}
