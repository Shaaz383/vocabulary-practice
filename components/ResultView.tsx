"use client";
import { useEffect, useMemo, useState } from "react";
import { SCORE_LEN, TIME_LIMIT, TIPS, gradeFor } from "@/lib/config";
import type { Mode } from "@/lib/types";
import { VERB_BY } from "@/lib/verbs";
import type { QuizResult } from "./QuizView";
import { VerbCard } from "./VerbCard";

interface Props { result: QuizResult; total: number; mode: Mode; name: string; onRetry: () => void }

export default function ResultView({ result, total, mode, name, onRetry }: Props) {
  const { answers, score, bestStreak } = result;
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(0);
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toLocaleString());
    window.scrollTo({ top: 0 });
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(r);
  }, []);

  /* count the score up */
  useEffect(() => {
    if (score === 0) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(score); return; }
    let raf = 0;
    const start = performance.now(), dur = 900;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const d = useMemo(() => {
    const pct = Math.round((score / total) * 100);
    const wrong = answers.filter((a) => a.status === "wrong").length;
    const skip = answers.filter((a) => a.status === "skipped").length;
    const topics: Record<string, { c: number; n: number }> = {};
    answers.forEach((a) => {
      const t = (topics[a.t] = topics[a.t] || { c: 0, n: 0 });
      t.n++;
      if (a.status === "correct") t.c++;
    });
    const names = Object.keys(topics);
    const pctOf = (k: string) => topics[k].c / topics[k].n;
    const sorted = names.slice().sort((a, b) => pctOf(b) - pctOf(a));
    const bestT = sorted[0], worst = sorted[sorted.length - 1];
    const used = answers.filter((a) => a.status !== "skipped").map((a) => a.used);
    const avg = used.length ? Math.round(used.reduce((x, y) => x + y, 0) / used.length) : TIME_LIMIT;
    const items: [string, string, string][] = [];
    items.push(["★", "Strongest topic", pctOf(bestT) === 1 ? bestT + ": full marks. Well done!" : bestT + ": " + topics[bestT].c + " of " + topics[bestT].n + " correct."]);
    if (pctOf(worst) < 1) items.push(["!", "Focus on: " + worst, TIPS[worst] || "Revise this topic in your book."]);
    items.push(["⏱", "Your speed", avg <= 10 ? "You answered in about " + avg + " seconds on average. Very quick!" : avg <= 20 ? "You answered in about " + avg + " seconds on average. Good pace." : "You took about " + avg + " seconds per question. Daily practice will make you faster."]);
    items.push(["↗", "Best streak", bestStreak + " correct answer" + (bestStreak === 1 ? "" : "s") + " in a row."]);
    if (skip > 0) items.push(["◔", "Time up on " + skip, "If you are not sure, choose your best guess. There is no negative marking."]);
    const bad = answers.filter((a) => a.status !== "correct");
    const vks = Array.from(new Set(bad.map((a) => a.vk).filter((x): x is string => !!x)));
    const notes: { en: string; hi: string; extra: string }[] = [];
    const seenN = new Set<string>();
    bad.forEach((a) => {
      if (!a.note || seenN.has(a.note[0].text) || notes.length >= 12) return;
      seenN.add(a.note[0].text);
      notes.push({ en: a.note[0].text, hi: a.note[1].text, extra: a.note[2].label + ": " + a.note[2].text });
    });
    return { pct, wrong, skip, topics, names, items, bad, vks, notes, g: gradeFor(pct) };
  }, [answers, score, total, bestStreak]);

  const studyTitle = d.notes.length ? (mode === "word" ? "Words to revise" : "Sentences to revise") : "Verbs to revise";

  return (
    <section className="view stack">
      <div className="card summary">
        <div className="scorering">
          <svg viewBox="0 0 148 148" aria-hidden="true">
            <circle className="track" cx="74" cy="74" r="66" />
            <circle className="prog" cx="74" cy="74" r="66"
              style={{ strokeDasharray: SCORE_LEN, strokeDashoffset: ready ? SCORE_LEN * (1 - score / total) : SCORE_LEN }} />
          </svg>
          <div className="mid"><b>{shown}</b><span>out of <span>{total}</span></span></div>
        </div>
        <div>
          <p className="who">{name}</p>
          <h2><span>{d.pct}%</span> <span className={"grade " + d.g.cls}>{d.g.name}</span></h2>
          <p className="msg">{d.g.msg}</p>
          <div className="btnrow"><button className="btn" type="button" onClick={onRetry}>Take a new test</button></div>
        </div>
      </div>

      <div className="stats">
        <div className="stat g"><b>{score}</b><span>Correct</span></div>
        <div className="stat r"><b>{d.wrong}</b><span>Wrong</span></div>
        <div className="stat m"><b>{d.skip}</b><span>Time up</span></div>
      </div>

      <div className="card">
        <h3 className="sec-title">Marks by topic</h3>
        <div className="bars">
          {d.names.map((k) => {
            const t = d.topics[k], p = Math.round((t.c / t.n) * 100);
            return (
              <div className="brow" key={k}>
                <div className="top"><span>{k}</span><span>{t.c + " / " + t.n + " marks"}</span></div>
                <div className="tr"><i style={{ width: ready ? p + "%" : "0%" }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="sec-title">Your coaching report</h3>
        <ul className="insights">
          {d.items.map(([ic, lab, tx], i) => (
            <li key={i}><div className="ic">{ic}</div><div><span className="lab">{lab}</span><span className="tx">{tx}</span></div></li>
          ))}
        </ul>
      </div>

      {d.vks.length > 0 || d.notes.length > 0 ? (
        <div className="card">
          <h3 className="sec-title">{studyTitle}</h3>
          <div className="study">
            {d.notes.map((n) => (
              <div className="vcard" key={n.en}>
                <div>{n.en}</div><div className="hi">{n.hi}</div><div className="hi">{n.extra}</div>
              </div>
            ))}
            {d.vks.slice(0, 12).map((k) => (VERB_BY[k] ? <VerbCard key={k} verb={VERB_BY[k]} /> : null))}
          </div>
        </div>
      ) : null}

      <div className="card">
        <h3 className="sec-title">Mistakes to review</h3>
        <div>
          {d.bad.length === 0 ? <div className="rev">No mistakes. Perfect score!</div> : null}
          {d.bad.map((a) => (
            <div className="rev" key={a.n}>
              <div><span className="n">{"Q" + a.n + ". "}</span>{a.q}</div>
              <div className="yours">{a.picked === null ? "Your answer: not answered (time up)" : "Your answer: " + a.picked}</div>
              <div className="right">{"Correct answer: " + a.a}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="foot">{date ? "Test taken on " + date : ""}</p>
    </section>
  );
}
