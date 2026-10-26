"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RING_LEN, TIME_LIMIT } from "@/lib/config";
import type { AnswerRecord, AnswerStatus, Question } from "@/lib/types";
import { VERB_BY } from "@/lib/verbs";
import { VerbCard } from "./VerbCard";

export interface QuizResult { answers: AnswerRecord[]; score: number; bestStreak: number }

export default function QuizView({ quiz, onDone }: { quiz: Question[]; onDone: (r: QuizResult) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const correctSoundRef = useRef<HTMLAudioElement>(null);
  const wrongSoundRef = useRef<HTMLAudioElement>(null);

  const item = quiz[idx];
  const status: AnswerStatus | null = locked ? answers[idx]?.status ?? null : null;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  /* countdown for the open question */
  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [idx, locked]);

  const record = useCallback((opt: string | null) => {
    if (locked) return;
    const ok = opt !== null && opt === item.a;
    const st: AnswerStatus = opt === null ? "skipped" : ok ? "correct" : "wrong";
    setLocked(true);
    setPicked(opt);
    if (opt !== null) {
      const sound = ok ? correctSoundRef.current : wrongSoundRef.current;
      if (sound) {
        sound.currentTime = 0;
        void sound.play().catch((error: unknown) => {
          console.error("Unable to play answer feedback sound.", error);
        });
      }
    }
    setAnswers((a) => [...a, {
      n: idx + 1, t: item.t, q: item.q, a: item.a, vk: item.vk, note: item.note,
      picked: opt, status: st, used: opt === null ? TIME_LIMIT : TIME_LIMIT - timeLeft,
    }]);
    if (ok) {
      const n = streak + 1;
      setScore((s) => s + 1);
      setStreak(n);
      setBest((b) => Math.max(b, n));
    } else {
      setStreak(0);
    }
  }, [locked, item, idx, timeLeft, streak]);

  useEffect(() => { if (!locked && timeLeft <= 0) record(null); }, [locked, timeLeft, record]);
  useEffect(() => {
    if (locked) nextRef.current?.focus({ preventScroll: isMobile });
  }, [locked, isMobile]);
  useEffect(() => {
    if (idx > 0 && isMobile) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [idx, isMobile]);

  const next = useCallback(() => {
    if (!locked) return;
    if (idx + 1 >= quiz.length) { onDone({ answers, score, bestStreak: best }); return; }
    setIdx(idx + 1);
    setLocked(false);
    setPicked(null);
    setTimeLeft(TIME_LIMIT);
  }, [locked, idx, quiz.length, onDone, answers, score, best]);

  /* keyboard: 1-4 or A-D to answer, Enter / right arrow for next */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (!locked) {
        const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
        if (k in map && item.opts[map[k]] !== undefined) record(item.opts[map[k]]);
      } else if ((k === "enter" || k === "arrowright") && document.activeElement !== nextRef.current) {
        next();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [locked, item, record, next]);

  const secs = Math.max(0, timeLeft);
  const danger = secs <= 10, warn = secs <= 20 && !danger;
  const verb = item.vk ? VERB_BY[item.vk] : undefined;
  const nextLabel = idx + 1 >= quiz.length ? "See my results" : "Next question";

  return (
    <section className={"view quiz-view" + (locked ? " answered" : "")}>
      <audio ref={correctSoundRef} src="/duolingo_correct.mp3" preload="auto" />
      <audio ref={wrongSoundRef} src="/duolingo_wrong.mp3" preload="auto" />
      <div ref={cardRef} className="card">
        <div className="qtop">
          <span>Question <b>{idx + 1}</b> of <b>{quiz.length}</b></span>
          <span className="meta"><span>Score <b>{score}</b></span><span>Streak <b>{streak}</b></span></span>
        </div>
        <div className="segs" aria-hidden="true">
          {quiz.map((_q, i) => {
            const a = answers[i];
            const cls = a ? (a.status === "correct" ? "ok" : a.status === "wrong" ? "no" : "skip") : i === idx ? "now" : "";
            return <span key={i} className={cls} />;
          })}
        </div>
        <div className="qhead">
          <div className="txt">
            <span className="chip">{item.t}</span>
            <p className="q">{item.q}</p>
          </div>
          <div className="ring" role="timer" aria-label="Time left">
            <svg viewBox="0 0 68 68" aria-hidden="true">
              <circle className="track" cx="34" cy="34" r="28" />
              <circle className={"prog" + (danger ? " danger" : warn ? " warn" : "")} cx="34" cy="34" r="28"
                style={{ strokeDasharray: RING_LEN, strokeDashoffset: RING_LEN * (1 - secs / TIME_LIMIT) }} />
            </svg>
            <div className={"sec" + (danger ? " danger" : "")}>{secs}</div>
          </div>
        </div>
        <div className={"opts" + (item.wide ? " wide" : "")}>
          {item.opts.map((o, i) => {
            const isRight = locked && o === item.a;
            const isWrong = locked && picked !== null && o === picked && o !== item.a;
            return (
              <button key={i} type="button" disabled={locked}
                className={"opt" + (isRight ? " correct" : "") + (isWrong ? " wrong" : "")}
                onClick={() => record(o)}>
                <span className="k">{"ABCD"[i]}</span>
                <span className="t">{o}</span>
                <span className="mk">{isRight ? "✓" : isWrong ? "✗" : ""}</span>
              </button>
            );
          })}
        </div>
        {!locked ? <p className="hint">Tip: press 1 to 4 or A to D on your keyboard to answer.</p> : null}
        {locked ? (
          <div className="fb" aria-live="polite">
            <div className={"status " + (status === "correct" ? "ok" : status === "wrong" ? "no" : "skip")}>
              {status === "correct" ? "Correct! +1 mark"
                : status === "wrong" ? "Not quite. The correct answer is " + item.a + "."
                : "Time is up. The correct answer is " + item.a + "."}
            </div>
            <div className="vcard">
              {item.note
                ? item.note.map((n, i) => <div key={i} className="hi">{n.label}: <b>{n.text}</b></div>)
                : verb ? <VerbCard verb={verb} correct={item.a} /> : null}
            </div>
            {!isMobile ? (
              <button ref={nextRef} className="btn" type="button" onClick={next}>{nextLabel}</button>
            ) : null}
          </div>
        ) : null}
      </div>
      {isMobile && locked
        ? createPortal(
          <div className="quiz-actionbar">
            <button ref={nextRef} className="btn" type="button" onClick={next}>{nextLabel}</button>
          </div>,
          document.body,
        )
        : null}
    </section>
  );
}
