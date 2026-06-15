// US Navy body-fat estimate (male). All inputs in cm.
// BF% = 495 / (1.0324 - 0.19077*log10(waist-neck) + 0.15456*log10(height)) - 450
export function navyBodyFatMale(waistCm: number, neckCm: number, heightCm: number): number | null {
  if (waistCm <= neckCm || heightCm <= 0) return null;
  const bf =
    495 /
      (1.0324 -
        0.19077 * Math.log10(waistCm - neckCm) +
        0.15456 * Math.log10(heightCm)) -
    450;
  if (!isFinite(bf)) return null;
  return Math.round(bf * 10) / 10;
}
