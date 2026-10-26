import type { Verb } from "@/lib/types";

const FORM_KEYS: [string, "v1" | "v2" | "v3" | "v4" | "v5"][] = [["V1", "v1"], ["V2", "v2"], ["V3", "v3"], ["V4", "v4"], ["V5", "v5"]];

export function Pill({ label, value, hit }: { label: string; value: string; hit?: boolean }) {
  return (
    <div className={"vp" + (hit ? " hit" : "")}>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

export function Pills({ verb, correct = "" }: { verb: Verb; correct?: string }) {
  const c = correct.toLowerCase();
  return (
    <>
      {FORM_KEYS.map(([lab, key]) => (
        <Pill key={key} label={lab} value={verb[key]} hit={verb[key].toLowerCase() === c} />
      ))}
    </>
  );
}

export function VerbCard({ verb, correct = "" }: { verb: Verb; correct?: string }) {
  return (
    <div className="vcard">
      <div className="row"><Pills verb={verb} correct={correct} /></div>
      {verb.hi ? <div className="hi">Hindi: <b>{verb.hi}</b></div> : null}
    </div>
  );
}
