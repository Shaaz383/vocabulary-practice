import SBDATA from "../data/sentences.json";
import type { NoteLine, Question } from "./types";
import { loadSeen, mk, saveSeen, shuffle } from "./util";

/* t: [[part, topic name], ...]   r: [[topic index, English, Hindi], ...] */
const SB = SBDATA as { t: [number, string][]; r: [number, string, string][] };

const SEEN_S = "evt_seen_s2";
const PART_NAMES = ["Easy", "Medium", "Hard", "Real-life situations", "Grammar patterns", "More situations", "More grammar patterns"];
export const SENT_LEVELS: Record<string, number[] | null> = {
  all: null, easy: [0], medium: [1], hard: [2], real: [3, 5], grammar: [4, 6],
};
const GRAMMAR_PARTS = new Set([4, 6]);
const SENT_TOTAL = 30;

function topicLabel(i: number): string {
  return SB.t[i][1].split(" ").map((w, k) => (w === "Rwa" ? "RWA" : k === 0 ? w : w.toLowerCase())).join(" ");
}

/* Topics that describe a real place or situation (used for "Where would you use this sentence?") */
const NOT_SITUATION = new Set([1, 6, 10, 11, 14, 15, 18, 19, 23, 24, 25, 27, 28, 34, 36, 37]);
const SITUATIONAL = new Set(SB.t.map((_t, i) => i).filter((i) => !NOT_SITUATION.has(i) && !GRAMMAR_PARTS.has(SB.t[i][0])));
/* Topics that overlap in meaning are grouped; a wrong option is never taken from the same group as the right one */
const CLUSTERS = [
  [0, 1, 15, 19, 26, 16, 28, 43, 47], [2, 3, 44, 42, 68], [4, 21, 59, 60], [5, 22, 33, 40, 50, 66, 45],
  [7, 58, 59, 65, 64, 20, 21, 41, 69, 39], [12, 49, 61, 62, 64], [13, 38, 65], [17, 29, 30, 31, 35, 39, 67, 63],
  [16, 25, 40], [18, 27, 32, 33, 31], [48, 22, 20, 49], [46, 47], [2, 9], [8, 61], [41, 69, 63, 67],
];
const CONFLICT: Record<number, Set<number>> = {};
CLUSTERS.forEach((c) => c.forEach((a) => {
  CONFLICT[a] = CONFLICT[a] || new Set<number>();
  c.forEach((b) => CONFLICT[a].add(b));
}));

interface SPoolItem { id: number; t: number; p: number; en: string; hi: string; w: number; dup?: boolean }
const SPOOL: SPoolItem[] = SB.r.map((r, i) => ({ id: i, t: r[0], p: SB.t[r[0]][0], en: r[1], hi: r[2], w: r[1].split(" ").length }));
(() => {
  const seen = new Set<string>();
  SPOOL.forEach((c) => { const k = c.en.toLowerCase(); if (seen.has(k)) c.dup = true; else seen.add(k); });
})();

/* similarity between two sentences, so a wrong option is never a near copy of the right one */
function norm(s: string): string { return s.replace(/[\s।?!.,'"“”\-()]/g, "").toLowerCase(); }
function bigr(s: string): Map<string, number> {
  const t = norm(s), m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) { const g = t.substr(i, 2); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}
function dice(a: string, b: string): number {
  const A = bigr(a), B = bigr(b);
  let inter = 0, sa = 0, sb = 0;
  A.forEach((v, k) => { sa += v; const o = B.get(k); if (o !== undefined) inter += Math.min(v, o); });
  B.forEach((v) => { sb += v; });
  return sa + sb ? (2 * inter) / (sa + sb) : 0;
}
function lenOK(c: SPoolItem, x: SPoolItem): boolean {
  return x.w >= Math.max(2, Math.floor(c.w * 0.6) - 1) && x.w <= Math.ceil(c.w * 1.5) + 2;
}

function pickDistractors(c: SPoolItem, field: "en" | "hi"): SPoolItem[] {
  const other = field === "hi" ? "en" : "hi";
  const chosen: SPoolItem[] = [], keys = new Set([norm(c[field])]);
  const stages: ((x: SPoolItem) => boolean)[] = [(x) => x.p === c.p && x.t !== c.t, (x) => x.t !== c.t, () => true];
  for (const stage of stages) {
    const cands = shuffle(SPOOL.filter((x) => x.id !== c.id && !x.dup && stage(x) && lenOK(c, x)));
    for (const x of cands) {
      if (chosen.length === 3) break;
      const k = norm(x[field]);
      if (keys.has(k)) continue;
      if (dice(c[field], x[field]) > 0.45 || dice(c[other], x[other]) > 0.5) continue;
      keys.add(k);
      chosen.push(x);
    }
    if (chosen.length === 3) break;
  }
  return chosen;
}

function notesFor(c: SPoolItem): NoteLine[] {
  const grammar = GRAMMAR_PARTS.has(c.p);
  const where = grammar ? "Grammar practice: " + topicLabel(c.t) : topicLabel(c.t) + " (" + PART_NAMES[c.p] + ")";
  return [
    { label: "English", text: c.en },
    { label: "Hindi", text: c.hi },
    { label: grammar ? "Practised in" : "Where to use it", text: where },
  ];
}
function finishQ(q: Question, c: SPoolItem, wide: boolean): Question {
  q.wide = wide;
  q.note = notesFor(c);
  return q;
}

/* 1. English sentence -> Hindi meaning */
function qMeaning(c: SPoolItem): Question | null {
  const w = pickDistractors(c, "hi");
  if (w.length < 3) return null;
  return finishQ(mk("Sentence meaning", "What does “" + c.en + "” mean?", c.hi, w.map((x) => x.hi)), c, true);
}
/* 2. Hindi sentence -> English sentence */
function qReverse(c: SPoolItem): Question | null {
  const w = pickDistractors(c, "en");
  if (w.length < 3) return null;
  return finishQ(mk("Hindi to English sentence", "Which English sentence means “" + c.hi + "”?", c.en, w.map((x) => x.en)), c, true);
}
/* 3. Where would you use it? */
function qWhere(c: SPoolItem): Question | null {
  const bad = CONFLICT[c.t] || new Set<number>();
  const cands = shuffle(Array.from(SITUATIONAL).filter((i) => i !== c.t && !bad.has(i)));
  if (cands.length < 3) return null;
  const q = mk("Where to use it", "Where would you use this sentence?\n“" + c.en + "”\n(" + c.hi + ")", topicLabel(c.t), cands.slice(0, 3).map(topicLabel));
  return finishQ(q, c, false);
}

/* 4. Complete the sentence (the Hindi meaning is shown as the clue) */
const STOP = new Set(("about above after again against all also always among and another any are around because been before being below between both but came can come could does doing down during each even every from further have having here how into its itself just keep know less like made make many might more most much must need never next not now off once only other our out over own same shall should since some still such take than that the their them then there these they this those through too under until upon very want was were what when where which while who whom will with within without would yes you your yourself yours please thank thanks sorry okay today tomorrow yesterday tonight morning evening night week month year time").split(" "));
function shapeOf(w: string): string {
  if (/ing$/.test(w)) return "ing";
  if (/ed$/.test(w)) return "ed";
  if (/ly$/.test(w)) return "ly";
  if (/(tion|sion|ment|ness|ity)s?$/.test(w)) return "n";
  if (/[^s]s$/.test(w)) return "s";
  return "x";
}
function blankChoices(en: string): { i: number; w: string; tail: string }[] {
  const toks = en.split(" "), lc = toks.map((t) => t.replace(/[^A-Za-z]/g, "").toLowerCase());
  const out: { i: number; w: string; tail: string }[] = [];
  toks.forEach((tk, i) => {
    if (i === 0) return;
    const m = tk.match(/^([a-z]+)([.,?!;:]*)$/);
    if (!m || m[1].length < 4 || STOP.has(m[1])) return;
    if (lc.filter((x) => x === m[1]).length !== 1) return;
    out.push({ i, w: m[1], tail: m[2] });
  });
  return out;
}
const WORDS: { t: Record<number, Set<string>>; p: Record<number, Set<string>>; all: Set<string> } = { t: {}, p: {}, all: new Set() };
SPOOL.forEach((c) => {
  const set = (WORDS.t[c.t] = WORDS.t[c.t] || new Set<string>());
  const pset = (WORDS.p[c.p] = WORDS.p[c.p] || new Set<string>());
  c.en.split(" ").forEach((tk, i) => {
    if (i === 0) return;
    const m = tk.match(/^([a-z]+)[.,?!;:]*$/);
    if (m && m[1].length >= 4 && !STOP.has(m[1])) { set.add(m[1]); pset.add(m[1]); WORDS.all.add(m[1]); }
  });
});
function qBlank(c: SPoolItem): Question | null {
  const opts = blankChoices(c.en);
  if (!opts.length) return null;
  const o = opts[Math.floor(Math.random() * opts.length)];
  const inSentence = new Set(c.en.toLowerCase().replace(/[^a-z ]/g, "").split(" "));
  const sh = shapeOf(o.w), chosen: string[] = [];
  for (const pool of [WORDS.t[c.t], WORDS.p[c.p], WORDS.all]) {
    for (const w of shuffle(Array.from(pool))) {
      if (chosen.length === 3) break;
      if (w === o.w || inSentence.has(w) || shapeOf(w) !== sh || Math.abs(w.length - o.w.length) > 3) continue;
      if (w.slice(0, 4) === o.w.slice(0, 4) || chosen.some((x) => x.slice(0, 4) === w.slice(0, 4))) continue;
      chosen.push(w);
    }
    if (chosen.length === 3) break;
  }
  if (chosen.length < 3) return null;
  const toks = c.en.split(" ");
  toks[o.i] = "______" + o.tail;
  return finishQ(mk("Complete the sentence", "Fill in the missing word:\n“" + toks.join(" ") + "”\n(" + c.hi + ")", o.w, chosen), c, false);
}

type SType = "meaning" | "reverse" | "where" | "blank";
const ELIGIBLE: Record<SType, (c: SPoolItem) => boolean> = {
  meaning: (c) => c.w >= 2 && c.w <= 16,
  reverse: (c) => c.w >= 2 && c.w <= 16,
  where: (c) => SITUATIONAL.has(c.t) && c.w >= 4 && c.w <= 16,
  blank: (c) => c.w >= 4 && c.w <= 16,
};
const MAKERS: Record<SType, (c: SPoolItem) => Question | null> = { meaning: qMeaning, reverse: qReverse, where: qWhere, blank: qBlank };

export function buildSentenceQuiz(levelKey: string): Question[] {
  const parts = SENT_LEVELS[levelKey] || null;
  const seen = loadSeen(SEEN_S), newSeen = new Set<number>(), used = new Set<number>(), out: Question[] = [];
  const pool = SPOOL.filter((c) => !c.dup && (!parts || parts.indexOf(c.p) >= 0));
  const quota: Partial<Record<SType, number>> = pool.some((c) => SITUATIONAL.has(c.t))
    ? { where: 8, blank: 6, meaning: 10, reverse: 6 }
    : { blank: 10, meaning: 12, reverse: 8 };
  function take(type: SType, n: number): number {
    const scored = pool.filter(ELIGIBLE[type]).map((c) => ({ c, sc: (seen.has(c.id) ? 10 : 0) + Math.random() })).sort((a, b) => a.sc - b.sc);
    let made = 0;
    for (const { c } of scored) {
      if (made >= n) break;
      if (used.has(c.id)) continue;
      const q = MAKERS[type](c);
      if (!q) continue;
      used.add(c.id); newSeen.add(c.id); out.push(q); made++;
    }
    return made;
  }
  let short = 0;
  (Object.keys(quota) as SType[]).forEach((t) => { const n = quota[t] || 0; short += n - take(t, n); });
  (["meaning", "reverse"] as SType[]).forEach((t) => { if (short > 0) short -= take(t, short); });
  saveSeen(new Set([...Array.from(seen), ...Array.from(newSeen)]), SEEN_S, 1500);
  return shuffle(out).slice(0, SENT_TOTAL);
}
