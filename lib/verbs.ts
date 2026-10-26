import { VERB_ROWS, SENT_ROWS, SPELL_ROWS } from "../data/verbRows";
import type { Question, Verb } from "./types";
import { CAP, loadSeen, mk, saveSeen, shuffle, wrongFrom } from "./util";

function regEd(v: string): string {
  if (/e$/.test(v)) return v + "d";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ied";
  return v + "ed";
}

export const VERBS: Verb[] = VERB_ROWS.map((r) => ({
  id: r[0], v1: r[0], v2: r[1], v3: r[2], v4: r[3], v5: r[4], hi: r[5],
  irr: r[1] !== regEd(r[0]) || r[2] !== regEd(r[0]),
}));
export const VERB_BY: Record<string, Verb> = {};
VERBS.forEach((v) => { VERB_BY[v.v1] = v; });

const SEEN_KEY = "evt_seen_v1";

interface Cand { id: string; key?: string; irr?: boolean; [k: string]: unknown }
interface Ctx { seen: Set<string | number>; newSeen: Set<string | number>; used: Set<string> }

function pick<T extends Cand>(cands: T[], n: number, ctx: Ctx, irrBonus?: boolean): T[] {
  const scored = cands
    .map((c) => ({ c, s: (ctx.seen.has(c.id) ? 10 : 0) + Math.random() - (irrBonus && c.irr ? 0.6 : 0) }))
    .sort((a, b) => a.s - b.s);
  const out: T[] = [];
  for (const { c } of scored) {
    if (out.length >= n) break;
    if (c.key && ctx.used.has(c.key)) continue;
    out.push(c);
    if (c.key) ctx.used.add(c.key);
    ctx.newSeen.add(c.id);
  }
  return out;
}

type Form = "v2" | "v3" | "v4" | "v5";

function formQ(v: Verb, form: Form): Question {
  const base = v.v1;
  const filler = [base + "ed", base + "en", base + "s", base + "ing"].map(CAP);
  if (form === "v2") {
    const a = CAP(v.v2);
    return mk("V2 (Past)", "What is the V2 of “" + CAP(base) + "”?", a,
      wrongFrom(a, [regEd(base), v.v3, v.v1, v.v4, v.v5].map(CAP), filler));
  }
  if (form === "v3") {
    const a = CAP(v.v3);
    return mk("V3 (Past Participle)", "What is the V3 of “" + CAP(base) + "”?", a,
      wrongFrom(a, [regEd(base), v.v2, v.v1, v.v4, v.v5].map(CAP), filler));
  }
  if (form === "v4") {
    const a = CAP(v.v4);
    return mk("V4 (-ing form)", "What is the V4 (-ing form) of “" + CAP(base) + "”?", a,
      wrongFrom(a, [base + "ing", v.v2, v.v3, v.v5, v.v1].map(CAP), filler));
  }
  const a = CAP(v.v5);
  return mk("V5 (s/es form)", "What is the V5 (s/es form) of “" + CAP(base) + "”?", a,
    wrongFrom(a, [base + "s", base + "es", v.v2, v.v4, v.v1].map(CAP), filler));
}

function overlaps(a: string, b: string): boolean { return a.includes(b) || b.includes(a); }

function hindiQ(v: Verb): Question {
  const pool = VERBS.filter((o) => o.hi && o !== v && !overlaps(o.hi, v.hi)).map((o) => o.hi);
  return mk("Hindi Meaning", "“" + CAP(v.v1) + "” का हिंदी अर्थ क्या है?", v.hi, wrongFrom(v.hi, pool));
}
function englishQ(v: Verb): Question {
  const pool = VERBS.filter((o) => o.hi && o !== v && !overlaps(o.hi, v.hi)).map((o) => CAP(o.v1));
  return mk("Hindi to English", "“" + v.hi + "” के लिए सही अंग्रेज़ी verb कौन सा है?", CAP(v.v1), wrongFrom(CAP(v.v1), pool));
}
function sentenceQ(row: string[]): Question {
  const v = VERB_BY[row[1]];
  const a = v[row[2]] as string;
  return mk("Fill in the Blank", row[0] + " (" + v.v1 + ")", a, wrongFrom(a, [v.v1, v.v2, v.v3, v.v4, v.v5]));
}
function spellQ(row: [string, string[]]): Question {
  return mk("Spelling", "Choose the correct spelling.", row[0], row[1]);
}
function withVk(q: Question, vk: string): Question { q.vk = vk; return q; }

/* Each test: 30 random questions. Quotas keep the mix balanced; every verb appears at most once. */
const QUOTA = { sent: 5, spell: 3, v2: 4, v3: 4, v4: 3, v5: 3, hi: 5, en: 3 };
export const QUOTA_TOTAL = Object.values(QUOTA).reduce((a, b) => a + b, 0);

export function buildVerbQuiz(): Question[] {
  const ctx: Ctx = { seen: loadSeen(SEEN_KEY), newSeen: new Set(), used: new Set() };
  const out: Question[] = [];

  const sentCands = SENT_ROWS.map((r, i) => ({ id: "SN:" + r[1] + ":" + r[2] + ":" + i, key: r[1], row: r }));
  pick(sentCands, QUOTA.sent, ctx).forEach((c) => out.push(withVk(sentenceQ(c.row), c.row[1])));

  const spCands = SPELL_ROWS.map((r) => ({ id: "SP:" + r[0], key: "sp:" + r[0], row: r }));
  pick(spCands, QUOTA.spell, ctx).forEach((c) => out.push(spellQ(c.row)));

  (["v2", "v3", "v4", "v5"] as Form[]).forEach((f) => {
    const cands = VERBS.map((v) => ({ id: f.toUpperCase() + ":" + v.v1, key: v.v1, irr: v.irr, v }));
    pick(cands, QUOTA[f], ctx, f === "v2" || f === "v3").forEach((c) => out.push(withVk(formQ(c.v, f), c.v.v1)));
  });

  const hiCands = VERBS.filter((v) => v.hi).map((v) => ({ id: "HI:" + v.v1, key: v.v1, v }));
  pick(hiCands, QUOTA.hi, ctx).forEach((c) => out.push(withVk(hindiQ(c.v), c.v.v1)));
  const enCands = VERBS.filter((v) => v.hi).map((v) => ({ id: "EN:" + v.v1, key: v.v1, v }));
  pick(enCands, QUOTA.en, ctx).forEach((c) => out.push(withVk(englishQ(c.v), c.v.v1)));

  saveSeen(ctx.seen, ctx.newSeen, SEEN_KEY, 300);
  return shuffle(out);
}
