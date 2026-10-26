import type { Question } from "./types";

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Remember what this browser has already been asked, so the next test starts with fresh questions */
export function loadSeen(key: string): Set<string | number> {
  try {
    if (typeof window === "undefined") return new Set();
    return new Set(JSON.parse(window.localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}
export function saveSeen(s: Set<string | number>, key: string, keep: number): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(Array.from(s).slice(-keep)));
  } catch {
    /* storage can be blocked: the test still works without it */
  }
}

export function mk(t: string, q: string, a: string, wrong: string[]): Question {
  return { t, q, a, opts: shuffle([a, ...wrong]) };
}

/* Take 3 distinct wrong options (never equal to the correct one), drawing from each pool in order */
export function wrongFrom(correct: string, ...pools: string[][]): string[] {
  const seen = new Set([correct.toLowerCase()]);
  const res: string[] = [];
  for (const pool of pools) {
    for (const p of shuffle(pool)) {
      const k = p.toLowerCase();
      if (!p || seen.has(k)) continue;
      seen.add(k);
      res.push(p);
      if (res.length === 3) return res;
    }
  }
  return res;
}

export const CAP = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
