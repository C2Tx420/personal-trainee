import { addDays, type IsoDate, WEEKDAYS, weekdayOf } from './dates';
import type { SessionKind } from './schedule';
import { normalizeVi } from './text';

/**
 * Free-text quick log (§6.2a): split typed/pasted workout notes into exercises + sets.
 * Rule-based, no AI. The result always goes through a preview screen to be corrected before saving.
 */

export type ParsedSet = {
  count: number;
  reps: number | null;
  seconds: number | null;
  kg: number | null;
  warmup: boolean;
};

export type ParsedExercise = { name: string; sets: ParsedSet[]; note: string | null };

export type ParsedLog = {
  date: IsoDate;
  kind: SessionKind | null;
  warmup: { minutes: number; speedMin: number | null; speedMax: number | null; text: string } | null;
  exercises: ParsedExercise[];
  unparsed: string[];
};

const KIND_WORDS: [RegExp, SessionKind][] = [
  [/\bpush\b/, 'push'],
  [/\bpull\b/, 'pull'],
  [/\blegs?\b|\bchan\b/, 'legs'],
  [/cau long|badminton/, 'badminton'],
];

const WEEKDAY_WORDS: [RegExp, number][] = [
  [/\b(thu|t) ?2\b|thu hai/, 0],
  [/\b(thu|t) ?3\b|thu ba/, 1],
  [/\b(thu|t) ?4\b|thu tu/, 2],
  [/\b(thu|t) ?5\b|thu nam/, 3],
  [/\b(thu|t) ?6\b|thu sau/, 4],
  [/\b(thu|t) ?7\b|thu bay/, 5],
  [/chu nhat|\bcn\b/, 6],
];

function parseDate(n: string, raw: string, today: IsoDate): IsoDate | null {
  if (/hom qua/.test(n)) return addDays(today, -1);
  if (/hom kia/.test(n)) return addDays(today, -2);
  if (/hom nay/.test(n)) return today;
  const m = raw.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (m) {
    const y = m[3] ?? today.slice(0, 4);
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  for (const [re, idx] of WEEKDAY_WORDS) {
    if (re.test(n)) {
      // most recent date ≤ today that falls on that weekday
      for (let back = 0; back < 7; back++) {
        const d = addDays(today, -back);
        if (weekdayOf(d) === WEEKDAYS[idx]) return d;
      }
    }
  }
  return null;
}

const num = (s: string) => Number(s.replace(',', '.'));

/** Set line: "3 set x 12 27kg", "2x12x20", "3 hiệp 12 lần 20 kg", "3 x 45s", "12 lần 20kg". */
function parseSetLine(raw: string): ParsedSet | null {
  const n = normalizeVi(raw.replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)\.(\d)/g, '$1d$2'))
    .replace(/(\d)d(\d)/g, '$1.$2');
  const warmup = /\b(w|warm ?up|warm|lam nong|khoi dong)\b/.test(n);
  const forgot = /quen|khong nho|\?/.test(n);
  const kgM = n.match(/(\d+(?:\.\d+)?) ?(kg|ky|ki|k)\b/);
  const secM = n.match(/(\d+) ?(s|giay|sec)\b/);
  let count = 1;
  let reps: number | null = null;
  let kg: number | null = kgM ? num(kgM[1]) : null;
  const stripped = n
    .replace(kgM?.[0] ?? '\u0000', ' ')
    .replace(secM?.[0] ?? '\u0000', ' ')
    .trim();

  const triple = stripped.match(/^(\d+) ?x ?(\d+) ?x ?(\d+(?:\.\d+)?)/);
  const setsX = stripped.match(/(\d+) ?(?:set|sets|hiep|h)? ?x ?(\d+)/);
  const setsWord = stripped.match(/(\d+) ?(?:set|sets|hiep)\b/);
  const repsWord = stripped.match(/(\d+) ?(?:lan|rep|reps|cai)\b/);
  if (triple) {
    count = Number(triple[1]);
    reps = Number(triple[2]);
    kg = kg ?? num(triple[3]);
  } else if (setsX) {
    count = Number(setsX[1]);
    reps = Number(setsX[2]);
  } else {
    const countOnly = stripped.match(/^(\d+) ?(?:set|sets|hiep|x)(?:\s|$)/);
    if (setsWord) count = Number(setsWord[1]);
    else if (countOnly) count = Number(countOnly[1]);
    if (repsWord) reps = Number(repsWord[1]);
  }
  const seconds = secM ? Number(secM[1]) : null;
  if (reps === null && seconds === null) return null;
  if (forgot) kg = null;
  return { count, reps: seconds !== null && !setsX ? null : reps, seconds, kg, warmup };
}

function parseWarmupLine(n: string): ParsedLog['warmup'] {
  if (!/warm ?up|khoi dong|di bo|treadmill|may chay/.test(n)) return null;
  const min = n.match(/(\d+) ?(p|phut|min|')\b/);
  if (!min) return null;
  const sp = n.match(/(\d+(?:\.\d+)?) ?(?:-|den|toi) ?(\d+(?:\.\d+)?)/);
  return {
    minutes: Number(min[1]),
    speedMin: sp ? num(sp[1]) : null,
    speedMax: sp ? num(sp[2]) : null,
    text: n,
  };
}

export function parseQuickLog(text: string, today: IsoDate): ParsedLog {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedLog = { date: today, kind: null, warmup: null, exercises: [], unparsed: [] };
  let current: ParsedExercise | null = null;
  let dateSet = false;

  for (const raw of lines) {
    const n = normalizeVi(raw.replace(/(\d)[.,](\d)/g, '$1.$2'));
    const nDots = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

    if (!dateSet) {
      const d = parseDate(n, raw, today);
      if (d) {
        out.date = d;
        dateSet = true;
      }
    }
    // header line (date / session type): strip the date, then look at the remaining text
    const header = normalizeVi(raw.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/, ' '));
    if (!out.kind && !current) {
      const k = KIND_WORDS.find(([re]) => re.test(header));
      if (k && !/\d/.test(header)) {
        out.kind = k[1];
        continue;
      }
    }
    if (!current && dateSet && /^(hom (nay|qua|kia))?\s*$/.test(header.replace(/\b(thu|t) ?\d\b|chu nhat|\bcn\b/g, '').trim())) continue;
    const w = parseWarmupLine(nDots.replace(/[^a-z0-9.\- ']+/g, ' '));
    if (w) {
      out.warmup = w;
      continue;
    }
    const set = parseSetLine(raw);
    if (set) {
      if (!current) {
        out.unparsed.push(raw);
        continue;
      }
      current.sets.push(set);
      continue;
    }
    if (/hom qua|hom nay|hom kia/.test(n) && !/\d/.test(n)) continue;
    // Text line that isn't a set → new exercise name (minus a "quên kg" note if present)
    if (/quen|khong nho/.test(n) && current) {
      current.note = raw;
      for (const s of current.sets) s.kg = null;
      continue;
    }
    current = { name: raw.replace(/[:\-–]+$/, '').trim(), sets: [], note: null };
    out.exercises.push(current);
  }
  out.exercises = out.exercises.filter((e) => e.sets.length > 0 || e.note);
  return out;
}

/**
 * Pattern "2 light sets first + 3 heavy sets" without a warm-up label → suggest marking
 * the first 2 sets as warm-up (confirmed by the user on the preview screen).
 */
export function suggestWarmup(ex: ParsedExercise): boolean {
  if (ex.sets.some((s) => s.warmup) || ex.sets.length < 2) return false;
  const [first, ...rest] = ex.sets;
  const firstKg = first.kg;
  const restKg = rest.map((s) => s.kg);
  return (
    firstKg !== null &&
    restKg.every((k) => k !== null && k > firstKg) &&
    first.count <= 2 &&
    rest.reduce((a, s) => a + s.count, 0) >= 2
  );
}

/** Expand "N set" lines into individual sets. */
export function expandSets(ex: ParsedExercise): Omit<ParsedSet, 'count'>[] {
  return ex.sets.flatMap((s) => Array.from({ length: s.count }, () => ({ reps: s.reps, seconds: s.seconds, kg: s.kg, warmup: s.warmup })));
}
