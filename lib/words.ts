import WBDATA from "../data/words.json";
import type { NoteLine, Question } from "./types";
import { loadSeen, mk, saveSeen, shuffle } from "./util";

/* t: [[topic name, count], ...]   r: [[topic index, English, Hindi], ...] */
const WB = WBDATA as { t: [string, number][]; r: [number, string, string][] };

const SEEN_W = "evt_seen_w1";
export const WORD_GROUPS: Record<string, number[] | null> = {
  wall: null,
  wbasic: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  wpeople: [9, 10, 11, 12],
  wverbs: [13, 14, 15, 33, 34, 35],
  whome: [16, 17, 18, 19, 20, 21, 22],
  wworld: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 36],
};

interface W { id: number; t: number; en: string; hi: string; dup?: boolean }
const WPOOL: W[] = WB.r.map((r, i) => ({ id: i, t: r[0], en: r[1], hi: r[2] }));
(() => {
  const s = new Set<string>();
  WPOOL.forEach((w) => { const k = w.en.toLowerCase(); if (s.has(k)) w.dup = true; else s.add(k); });
})();

function wTopic(i: number): string { return WB.t[i][0].replace(/ \(.*\)$/, ""); }
function hiTokens(h: string): string[] { return h.replace(/\(.*?\)/g, " ").split(/[\s/,]+/).filter((x) => x.length > 1); }
function hiClash(a: W, b: W): boolean {
  const A = hiTokens(a.hi), B = hiTokens(b.hi);
  if (A.some((x) => B.indexOf(x) >= 0)) return true;
  const na = a.hi.replace(/\(.*?\)/g, "").trim(), nb = b.hi.replace(/\(.*?\)/g, "").trim();
  return na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0;
}
function wWithin(c: W, x: W): boolean {
  return Math.abs(c.en.split(" ").length - x.en.split(" ").length) <= 1;
}

function wordDistractors(c: W, field: "en" | "hi"): W[] {
  const chosen: W[] = [], keys = new Set([c[field].toLowerCase()]);
  const stages: ((x: W) => boolean)[] = [(x) => x.t === c.t, (x) => Math.abs(x.t - c.t) <= 2, () => true];
  for (const st of stages) {
    for (const x of shuffle(WPOOL.filter((y) => y.id !== c.id && !y.dup && st(y) && wWithin(c, y)))) {
      if (chosen.length === 3) break;
      const k = x[field].toLowerCase();
      if (keys.has(k) || hiClash(c, x)) continue;
      keys.add(k);
      chosen.push(x);
    }
    if (chosen.length === 3) break;
  }
  return chosen;
}
function wNotes(c: W): NoteLine[] {
  return [{ label: "Word", text: c.en }, { label: "Hindi", text: c.hi }, { label: "Topic", text: wTopic(c.t) }];
}
function wFinish(q: Question, c: W): Question { q.wide = false; q.note = wNotes(c); return q; }

function qWordMeaning(c: W): Question | null {
  const w = wordDistractors(c, "hi");
  if (w.length < 3) return null;
  return wFinish(mk("Word meaning", "What is the Hindi meaning of “" + c.en + "”?", c.hi, w.map((x) => x.hi)), c);
}
function qWordReverse(c: W): Question | null {
  const w = wordDistractors(c, "en");
  if (w.length < 3) return null;
  return wFinish(mk("Hindi to English word", "Which English word means “" + c.hi + "”?", c.en, w.map((x) => x.en)), c);
}

/* spelling: wrong spellings are made from common mistakes */
function misspell(w: string): string[] {
  const out = new Set<string>(), L = w.length, V = "aeiou";
  for (let i = 1; i < L - 2; i++) out.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
  for (let i = 1; i < L - 1; i++) {
    if (w[i] === w[i + 1]) out.add(w.slice(0, i) + w.slice(i + 1));
    else if (V.indexOf(w[i]) < 0 && V.indexOf(w[i + 1]) >= 0 && V.indexOf(w[i - 1]) >= 0) out.add(w.slice(0, i + 1) + w[i] + w.slice(i + 1));
  }
  const swap: Record<string, string> = { a: "e", e: "a", i: "e", o: "u", u: "o" };
  for (let i = 1; i < L - 1; i++) if (V.indexOf(w[i]) >= 0) out.add(w.slice(0, i) + swap[w[i]] + w.slice(i + 1));
  if (/ie/.test(w)) out.add(w.replace("ie", "ei"));
  else if (/ei/.test(w)) out.add(w.replace("ei", "ie"));
  if (L > 5) out.add(w.slice(0, L - 2) + w[L - 1]);
  out.delete(w);
  return Array.from(out);
}
const ALLW = new Set(WPOOL.map((w) => w.en.toLowerCase()));
function qWordSpell(c: W): Question | null {
  const bad = shuffle(misspell(c.en.toLowerCase()).filter((x) => !ALLW.has(x))).slice(0, 3);
  if (bad.length < 3) return null;
  return wFinish(mk("Spelling", "Choose the correct spelling of “" + c.hi + "”.", c.en.toLowerCase(), bad), c);
}

/* group: "Which one of these is a fruit?"  Topics that overlap are never mixed in the wrong options. */
const WCAT: Record<number, string> = {
  8: "colour", 9: "family member", 11: "part of the body", 12: "feeling or emotion", 17: "fruit", 18: "vegetable",
  19: "piece of clothing", 23: "animal", 25: "vehicle or way to travel", 26: "place in a city or town", 27: "school item",
  29: "technology word", 32: "sport or hobby", 22: "kitchen item", 5: "day of the week", 6: "month", 3: "number",
  7: "season or weather word",
};
const WCONF = [[16, 17, 18, 22], [19, 12], [20, 21, 22, 26], [27, 28, 29], [9, 10], [3, 4, 5, 6], [7, 24], [25, 26], [30, 28], [31, 11, 12], [32, 12]];
function wBad(t: number): Set<number> {
  const s = new Set<number>([t]);
  WCONF.forEach((g) => { if (g.indexOf(t) >= 0) g.forEach((x) => s.add(x)); });
  return s;
}
function qWordCategory(c: W): Question | null {
  const cat = WCAT[c.t];
  if (!cat || /\s/.test(c.en)) return null;
  const bad = wBad(c.t);
  const cands = shuffle(WPOOL.filter((x) => !x.dup && !bad.has(x.t) && WCAT[x.t] && !/\s/.test(x.en)));
  const out: string[] = [], used = new Set<number>([c.t]);
  for (const x of cands) {
    if (out.length === 3) break;
    if (used.has(x.t)) continue;
    used.add(x.t);
    out.push(x.en);
  }
  if (out.length < 3) return null;
  const art = /^[aeiou]/.test(cat) ? "an " : "a ";
  return wFinish(mk("Word group", "Which one of these is " + art + cat + "?", c.en, out), c);
}

type WType = "meaning" | "reverse" | "spell" | "group";
const WELIG: Record<WType, (c: W) => boolean> = {
  meaning: () => true,
  reverse: () => true,
  spell: (c) => /^[a-z]{5,}$/.test(c.en),
  group: (c) => !!WCAT[c.t] && !/\s/.test(c.en),
};
const WMAKE: Record<WType, (c: W) => Question | null> = { meaning: qWordMeaning, reverse: qWordReverse, spell: qWordSpell, group: qWordCategory };

export function buildWordQuiz(levelKey: string): Question[] {
  const topics = WORD_GROUPS[levelKey] || null;
  const seen = loadSeen(SEEN_W), newSeen = new Set<number>(), used = new Set<number>(), out: Question[] = [];
  const pool = WPOOL.filter((c) => !c.dup && (!topics || topics.indexOf(c.t) >= 0));
  const quota: Partial<Record<WType, number>> = pool.some(WELIG.group)
    ? { meaning: 10, reverse: 9, spell: 4, group: 7 }
    : { meaning: 14, reverse: 12, spell: 4 };
  function take(type: WType, n: number): number {
    const sc = pool.filter(WELIG[type]).map((c) => ({ c, s: (seen.has(c.id) ? 10 : 0) + Math.random() })).sort((a, b) => a.s - b.s);
    let made = 0;
    for (const { c } of sc) {
      if (made >= n) break;
      if (used.has(c.id)) continue;
      const q = WMAKE[type](c);
      if (!q) continue;
      used.add(c.id); newSeen.add(c.id); out.push(q); made++;
    }
    return made;
  }
  let short = 0;
  (Object.keys(quota) as WType[]).forEach((t) => { const n = quota[t] || 0; short += n - take(t, n); });
  (["meaning", "reverse"] as WType[]).forEach((t) => { if (short > 0) short -= take(t, short); });
  saveSeen(seen, newSeen, SEEN_W, 1500);
  return shuffle(out).slice(0, 30);
}
