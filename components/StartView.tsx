"use client";
import { useEffect, useState } from "react";
import { HERO_TITLE, LEAD, MODES, SENTENCE_LEVELS, WORD_LEVELS } from "@/lib/config";
import type { Mode } from "@/lib/types";
import { VERB_BY } from "@/lib/verbs";
import { Pills } from "./VerbCard";

const DEMO = ["go", "write", "buy", "speak", "sing", "take"].map((k) => VERB_BY[k]);

function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => x + 1), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ticker" aria-hidden="true">
      <Pills verb={DEMO[i % DEMO.length]} />
    </div>
  );
}

interface Props {
  mode: Mode; level: string; name: string;
  onMode: (m: Mode) => void; onLevel: (l: string) => void;
  onName: (n: string) => void; onStart: () => void;
}

export default function StartView({ mode, level, name, onMode, onLevel, onName, onStart }: Props) {
  const [err, setErr] = useState("");
  const levels = mode === "sentence" ? SENTENCE_LEVELS : mode === "word" ? WORD_LEVELS : null;

  function start() {
    if (!name.trim()) { setErr("Please write your name to begin."); return; }
    setErr("");
    onStart();
  }

  return (
    <section className="view stack">
      <div className="card hero">
        <span className="chip"><i />Practice test</span>
        <h2>{HERO_TITLE[mode]}</h2>
        <p className="lead">{LEAD[mode]}</p>
        <div className="modes" role="radiogroup" aria-label="Choose what to be tested on">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id}
              className={"mode" + (mode === m.id ? " on" : "")} onClick={() => onMode(m.id)}>
              <b>{m.title}</b><span>{m.blurb}</span>
            </button>
          ))}
        </div>
        {levels ? (
          <div className="levels" role="radiogroup" aria-label={mode === "word" ? "Word topics" : "Sentence level"}>
            {levels.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={level === key}
                className={"lv" + (level === key ? " on" : "")} onClick={() => onLevel(key)}>{label}</button>
            ))}
          </div>
        ) : null}
        {mode === "verb" ? <Ticker /> : null}
        <label className="lbl" htmlFor="sname">Student name / विद्यार्थी का नाम</label>
        <input id="sname" className={"field" + (err ? " err" : "")} type="text" placeholder="Write your name"
          maxLength={40} autoComplete="off" value={name}
          onChange={(e) => { onName(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") start(); }} />
        <div className="errtext" role="alert">{err}</div>
        <button className="btn full" id="startBtn" type="button" onClick={start}>Start the test</button>
        <div className="feats">
          <div className="feat"><b>30</b><span>new questions every time</span></div>
          <div className="feat"><b>30 sec</b><span>timer for each question</span></div>
          <div className="feat"><b>1 mark</b><span>each, no negative marks</span></div>
        </div>
      </div>
    </section>
  );
}
