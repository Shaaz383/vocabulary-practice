export type Mode = "verb" | "sentence" | "word";

export interface NoteLine { label: string; text: string }

export interface Question {
  t: string;          /* topic / question type, shown as a chip and used for "Marks by topic" */
  q: string;
  a: string;
  opts: string[];
  vk?: string;        /* verb key (V1) for the verb revision card */
  wide?: boolean;
  note?: NoteLine[];
}

export interface Verb {
  id: string; v1: string; v2: string; v3: string; v4: string; v5: string; hi: string; irr: boolean;
  [form: string]: string | boolean;
}

export type AnswerStatus = "correct" | "wrong" | "skipped";

export interface AnswerRecord {
  n: number;
  t: string; q: string; a: string;
  vk?: string; note?: NoteLine[];
  picked: string | null;
  status: AnswerStatus;
  used: number;
}
