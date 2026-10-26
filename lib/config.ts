import type { Mode } from "./types";
import { QUOTA_TOTAL } from "./verbs";

export const TIME_LIMIT = 30;
export const RING_LEN = 2 * Math.PI * 28;
export const SCORE_LEN = 2 * Math.PI * 66;

export const MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: "verb", title: "Verbs", blurb: "Verb forms, Hindi meanings, spelling and fill in the blank" },
  { id: "sentence", title: "Sentences", blurb: "Meaning in Hindi, where to use it and fill in the blank, from 4,100 sentences" },
  { id: "word", title: "Words", blurb: "1,000+ essential words: Hindi meaning, spelling and word groups" },
];

export const SENTENCE_LEVELS: [string, string][] = [
  ["all", "All levels"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"], ["real", "Real life"], ["grammar", "Grammar"],
];
export const WORD_LEVELS: [string, string][] = [
  ["wall", "All topics"], ["wbasic", "Basics"], ["wpeople", "People & body"], ["wverbs", "Verbs & describing"], ["whome", "Food & home"], ["wworld", "World & work"],
];

export const LEAD: Record<Mode, string> = {
  word: "Answer 30 random questions from 1,081 essential English words: Hindi meaning, English word, spelling and word groups. Choose a topic group below or test all of them. Then get a coaching report.",
  verb: "Answer " + QUOTA_TOTAL + " random questions on verb forms, Hindi meanings, spelling and sentences. Then get a personal coaching report.",
  sentence: "Answer " + QUOTA_TOTAL + " random questions made from everyday English sentences: know the Hindi meaning of each sentence, where to use it, and complete it. Questions come from the 4,100 sentences of the book. Then get a coaching report.",
};
export const HERO_TITLE: Record<Mode, string> = {
  verb: "Test your English verbs", word: "Test your English words", sentence: "Test your everyday English",
};

export const TIPS: Record<string, string> = {
  "V2 (Past)": "Learn past forms in pairs and say them aloud: go-went, eat-ate, buy-bought, write-wrote.",
  "V3 (Past Participle)": "Practise with “have/has”: I have gone, she has eaten, we have written.",
  "V4 (-ing form)": "Watch the spelling: run-running (double the last letter), make-making (drop the e), study-studying.",
  "V5 (s/es form)": "With he, she and it add s or es: she goes, he watches, it studies.",
  "Hindi Meaning": "Say each verb in a short sentence, then say the Hindi meaning right after it.",
  "Hindi to English": "Cover the English column in your book and try to recall the verb from the Hindi.",
  "Spelling": "Write each tricky word three times, and remember the pattern, for example “i before e” in receive and believe.",
  "Fill in the Blank": "Look at the time word first (yesterday, every day, now, already) and pick the matching form.",
  "Sentence meaning": "Read the English sentence aloud, then say it in Hindi. Learn 5 new sentences with their Hindi every day.",
  "Hindi to English sentence": "Cover the English in your book, read the Hindi and try to say the full English sentence.",
  "Where to use it": "Before you learn a sentence, picture the place (office, hotel, hospital, bank) and who is talking.",
  "Complete the sentence": "Learn whole sentences, not single words. Say the full sentence three times.",
  "Word meaning": "Say the word aloud, then its Hindi meaning, then make one small sentence with it.",
  "Hindi to English word": "Cover the English side of your book and try to recall the word from the Hindi.",
  "Word group": "Learn words topic by topic (fruits, body parts, animals) so you can recall them together.",
};

export function gradeFor(pct: number): { name: string; cls: string; msg: string } {
  if (pct >= 90) return { name: "A+ Outstanding", cls: "good", msg: "Outstanding work! You know your English very well." };
  if (pct >= 75) return { name: "A Very good", cls: "good", msg: "Very good work. Revise the few mistakes below and you will be perfect." };
  if (pct >= 60) return { name: "B Good", cls: "mid", msg: "Good job. A little more daily practice will lift your score." };
  if (pct >= 40) return { name: "C Average", cls: "warn", msg: "You are getting there. Revise a little every day." };
  return { name: "D Keep practising", cls: "bad", msg: "Do not worry. Learn 10 new items every day and try again soon." };
}
