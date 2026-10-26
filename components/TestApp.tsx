"use client";
import { useCallback, useEffect, useState } from "react";
import { buildSentenceQuiz } from "@/lib/sentences";
import type { Mode, Question } from "@/lib/types";
import { buildVerbQuiz } from "@/lib/verbs";
import { buildWordQuiz } from "@/lib/words";
import QuizView, { type QuizResult } from "./QuizView";
import ResultView from "./ResultView";
import StartView from "./StartView";

type View = "start" | "quiz" | "result";

export default function TestApp() {
  const [view, setView] = useState<View>("start");
  const [mode, setMode] = useState<Mode>("verb");
  const [level, setLevel] = useState("all");
  const [name, setName] = useState("");
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  /* theme: saved choice, otherwise follow the device */
  useEffect(() => {
    try {
      const t = window.localStorage.getItem("evt_theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch { /* storage blocked */ }
  }, []);
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  function toggleTheme() {
    const cur = theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    setTheme(next);
    try { window.localStorage.setItem("evt_theme", next); } catch { /* ignore */ }
  }

  function chooseMode(m: Mode) {
    setMode(m);
    setLevel(m === "word" ? "wall" : "all");
  }

  function start() {
    const q = mode === "sentence" ? buildSentenceQuiz(level) : mode === "word" ? buildWordQuiz(level) : buildVerbQuiz();
    setQuiz(q);
    setResult(null);
    setView("quiz");
    window.scrollTo({ top: 0 });
  }

  const done = useCallback((r: QuizResult) => { setResult(r); setView("result"); }, []);

  return (
    <div className="shell">
      <header className="bar">
        <div className="logo" aria-hidden="true">H</div>
        <div className="names">
          <div className="n1">Hello English Classes</div>
          <div className="n2">Verbs, Sentences &amp; Words · Practice Test</div>
        </div>
        <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Switch between light and dark theme" title="Switch theme">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" style={{ fill: "var(--text)" }} /></svg>
        </button>
      </header>
      <main>
        {view === "start" ? (
          <StartView mode={mode} level={level} name={name} onMode={chooseMode} onLevel={setLevel} onName={setName} onStart={start} />
        ) : null}
        {view === "quiz" ? <QuizView key={quiz.length + ":" + quiz[0]?.q} quiz={quiz} onDone={done} /> : null}
        {view === "result" && result ? (
          <ResultView result={result} total={quiz.length} mode={mode} name={name.trim()} onRetry={() => { setView("start"); window.scrollTo({ top: 0 }); }} />
        ) : null}
      </main>
      <p className="foot">Hello English Classes · Speak English with Confidence</p>
      <p className="credit">Developed by <b>Syed Shaaz Akhtar</b></p>
    </div>
  );
}
