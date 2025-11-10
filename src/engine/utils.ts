// Utility functions for the engine

import type { FactValue, ClusterRule, Candidate } from "./types";

const UNKNOWN_SENTINEL = "__UNKNOWN__";

export function normalizeValue(v: unknown): FactValue {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "__unknown__" || s === "unknown" || s === "?" || s === "n/a" || s === "na") {
      return UNKNOWN_SENTINEL;
    }
    return v as string;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  return UNKNOWN_SENTINEL;
}

export function isUnknown(value: FactValue): boolean {
  const nv = normalizeValue(value);
  return nv === UNKNOWN_SENTINEL;
}

export function evidenceSymbol(
  indicatesMap: Record<string, FactValue[]>,
  factId: string,
  answer: FactValue
): "+" | "-" | "·" | "?" {
  if (isUnknown(answer)) {
    return "?";
  }
  const allowed = indicatesMap[factId];
  if (!Array.isArray(allowed)) {
    return "·";
  }
  const normAnswer = normalizeValue(answer);
  const normAllowed = allowed.map(normalizeValue);
  if (normAllowed.includes(normAnswer)) {
    return "+";
  }
  return "-";
}

export function probabilityToColor(p: number, maxP: number): string {
  if (maxP <= 0) return "rgb(239, 68, 68)"; // red fallback
  const ratio = p / maxP;
  // Green (high) -> Yellow (mid) -> Red (low)
  if (ratio >= 0.7) {
    // Green: rgb(34, 197, 94) to rgb(234, 179, 8)
    const t = (ratio - 0.7) / 0.3;
    const r = Math.round(34 + (234 - 34) * t);
    const g = Math.round(197 + (179 - 197) * t);
    const b = Math.round(94 + (8 - 94) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (ratio >= 0.3) {
    // Yellow: rgb(234, 179, 8) to rgb(239, 68, 68)
    const t = (ratio - 0.3) / 0.4;
    const r = Math.round(234 + (239 - 234) * t);
    const g = Math.round(179 + (68 - 179) * t);
    const b = Math.round(8 + (68 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Red: rgb(239, 68, 68)
    return "rgb(239, 68, 68)";
  }
}

/**
 * Compute flat segment colors for a descending-sorted probability list based on two elbows.
 * Rules:
 * - Find two largest relative drops d_i = (v_i - v_{i+1}) / max(v_i, eps)
 * - Top segment [0..i1] is GREEN only if first drop >= 0.3, else YELLOW
 * - Middle segment [i1+1..i2] is YELLOW
 * - Bottom segment [i2+1..end] is RED
 * - If fewer than 3 candidates, fall back to ratio-based coloring via probabilityToColor
 */
export function computeElbowColors(sortedProbs: number[]): string[] {
  const n = sortedProbs.length;
  const GREEN = "rgb(34, 197, 94)"; // #22C55E
  const YELLOW = "rgb(234, 179, 8)"; // #EAB308
  const RED = "rgb(239, 68, 68)"; // #EF4444

  // Thresholds
  const FIRST_ELBOW_STRONG = 0.3;  // Green only if d1 >= 30%
  const SECOND_ELBOW_MIN = 0.2;    // Count an elbow only if d >= 20% (tunable)

  // Default: all red (no elbows)
  const colors = new Array<string>(n).fill(RED);
  if (n <= 1) {
    return colors;
  }

  // Compute relative drops d_i = (v_i - v_{i+1}) / max(v_i, eps)
  const eps = 1e-9;
  const drops: Array<{ d: number; i: number }> = [];
  for (let i = 0; i < n - 1; i++) {
    const vi = sortedProbs[i];
    const vnext = sortedProbs[i + 1];
    const denom = Math.max(vi, eps);
    const d = Math.max(0, (vi - vnext) / denom);
    drops.push({ d, i });
  }

  // Identify top two elbows by drop magnitude
  drops.sort((a, b) => (b.d - a.d) || (a.i - b.i));
  const topTwo = drops.slice(0, 2).sort((a, b) => a.i - b.i);
  const i1 = topTwo[0]?.i;
  const d1 = topTwo[0]?.d ?? 0;
  const i2 = topTwo[1]?.i;
  const d2 = topTwo[1]?.d ?? 0;

  const hasFirstElbow = d1 >= SECOND_ELBOW_MIN; // at least a weak elbow
  const hasSecondElbow = d2 >= SECOND_ELBOW_MIN && typeof i2 === "number";
  const firstIsStrong = d1 >= FIRST_ELBOW_STRONG;

  // Coloring rules:
  // - No elbows above SECOND_ELBOW_MIN => all RED
  // - One weak elbow (hasFirstElbow && !firstIsStrong && !hasSecondElbow) => TOP YELLOW, rest RED
  // - Strong first elbow only (firstIsStrong && !hasSecondElbow) => TOP GREEN, rest RED
  // - Two elbows (hasSecondElbow) =>
  //     * TOP GREEN if firstIsStrong else YELLOW
  //     * MIDDLE YELLOW
  //     * BOTTOM RED
  if (!hasFirstElbow) {
    return colors; // all RED
  }

  if (!firstIsStrong && !hasSecondElbow) {
    // Single weak elbow: Yellow then Red
    for (let j = 0; j <= (i1 as number); j++) colors[j] = YELLOW;
    return colors;
  }

  if (firstIsStrong && !hasSecondElbow) {
    // Strong first elbow only: Green then Red
    for (let j = 0; j <= (i1 as number); j++) colors[j] = GREEN;
    return colors;
  }

  // Two elbows
  const idx1 = i1 as number;
  const idx2 = i2 as number;
  for (let j = 0; j <= idx1; j++) colors[j] = firstIsStrong ? GREEN : YELLOW;
  for (let j = idx1 + 1; j <= idx2 && j < n; j++) colors[j] = YELLOW;
  // remainder stays RED
  return colors;
}

export function computeEntropy(probs: number[]): number {
  let entropy = 0;
  for (const p of probs) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}
