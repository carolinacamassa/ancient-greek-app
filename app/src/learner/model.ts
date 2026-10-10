/** The learner model: what the app believes you know, kept in localStorage.
 *
 *  Evidence: reading a sentence without tapping a word is weak evidence of
 *  knowing its lemmas; tapping a gloss is evidence of not knowing; quiz and
 *  cloze answers are strong evidence either way. A lemma counts as known when
 *  its strength reaches KNOWN. A missed morphological pattern re-enables
 *  glosses for all forms matching that pattern for a while. */
import { useSyncExternalStore } from 'react';
import type { Token } from '../types';
import { matchesMask } from '../greek/morph';

export const KNOWN = 4;
const DAY = 86_400_000;

export interface LemmaState {
  s: number;        // strength
  seen: number;     // passages in which it was read
  taps: number;
  ok: number;
  bad: number;
  last: number;     // timestamp of last evidence
}

export interface ClozeItem {
  id: string;       // `${textId}:${sentenceId}:${tokenIndex}`
  textId: string;
  passageId: string;
  sentenceId: string;
  tokenIndex: number;
  lemma: string;
  due: number;
  interval: number; // days
  reps: number;
}

export interface PatternReveal { mask: string; until: number; label: string }

export interface Settings {
  apiKey: string;
  model: string;
  glossMode: 'auto' | 'all' | 'none';
  showAutoParseWarning: boolean;
}

export interface LearnerState {
  v: 1;
  lemmas: Record<string, LemmaState>;
  patterns: PatternReveal[];
  read: Record<string, number>;               // passageId -> timestamp finished
  constructionCounts: Record<string, number>; // detector id -> occurrences read
  notesShown: Record<string, number>;         // note id -> timestamp
  cloze: ClozeItem[];
  tapsInPassage: Record<string, string[]>;    // passageId -> lemmas tapped (session-scoped evidence)
  settings: Settings;
  events: number;                             // counter, for stats
}

const KEY = 'greek-reader-learner-v1';

function empty(): LearnerState {
  return {
    v: 1, lemmas: {}, patterns: [], read: {}, constructionCounts: {}, notesShown: {}, cloze: [],
    tapsInPassage: {}, settings: { apiKey: '', model: 'claude-opus-5-5', glossMode: 'auto', showAutoParseWarning: true },
    events: 0,
  };
}

function load(): LearnerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const st = JSON.parse(raw) as LearnerState;
    return { ...empty(), ...st, settings: { ...empty().settings, ...(st.settings ?? {}) } };
  } catch {
    return empty();
  }
}

let state: LearnerState = load();
const listeners = new Set<() => void>();

function commit(next: LearnerState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export function useLearner(): LearnerState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
export const getState = () => state;

export function exportState(): string { return JSON.stringify(state, null, 1); }
export function importState(json: string) {
  const st = JSON.parse(json) as LearnerState;
  if (st.v !== 1 || typeof st.lemmas !== 'object') throw new Error('not a learner export');
  commit({ ...empty(), ...st });
}
export function resetState() { commit(empty()); }

function lemma(st: LearnerState, l: string): LemmaState {
  return st.lemmas[l] ?? { s: 0, seen: 0, taps: 0, ok: 0, bad: 0, last: 0 };
}

// ---------------------------------------------------------------- queries

export const isKnown = (st: LearnerState, l: string) => (st.lemmas[l]?.s ?? 0) >= KNOWN;

export function strength(st: LearnerState, l: string): number {
  return st.lemmas[l]?.s ?? 0;
}

export function glossVisible(st: LearnerState, t: Token, now = Date.now()): boolean {
  if (st.settings.glossMode === 'all') return true;
  if (st.settings.glossMode === 'none') return false;
  if (!isKnown(st, t.l)) return true;
  return st.patterns.some((p) => p.until > now && matchesMask(t.p, p.mask));
}

export function activePatterns(st: LearnerState, now = Date.now()): PatternReveal[] {
  return st.patterns.filter((p) => p.until > now);
}

/** Share of a text's tokens whose lemma is known. */
export function coverage(st: LearnerState, freq: Record<string, number>): { known: number; total: number; ratio: number } {
  let known = 0; let total = 0;
  for (const [l, n] of Object.entries(freq)) { total += n; if (isKnown(st, l)) known += n; }
  return { known, total, ratio: total ? known / total : 0 };
}

export function knownCount(st: LearnerState): number {
  return Object.values(st.lemmas).filter((x) => x.s >= KNOWN).length;
}

export function dueCloze(st: LearnerState, now = Date.now()): ClozeItem[] {
  return st.cloze.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

// ---------------------------------------------------------------- actions

export function tap(l: string, passageId: string) {
  const st = structuredClone(state);
  const x = lemma(st, l);
  x.taps += 1; x.s = Math.max(0, x.s - 2); x.last = Date.now();
  st.lemmas[l] = x;
  const arr = st.tapsInPassage[passageId] ?? [];
  if (!arr.includes(l)) arr.push(l);
  st.tapsInPassage[passageId] = arr;
  st.events += 1;
  commit(st);
}

export function setKnown(l: string, known: boolean) {
  const st = structuredClone(state);
  const x = lemma(st, l);
  x.s = known ? Math.max(KNOWN + 2, x.s) : 0; x.last = Date.now();
  st.lemmas[l] = x;
  commit(st);
}

/** Called when a passage is finished: every lemma read and not tapped gains
 *  strength (once per passage), construction counts are updated, and the
 *  tapped words are queued for cloze review. */
export function finishPassage(opts: {
  passageId: string; textId: string; lemmas: string[];
  constructions: Record<string, number>;
  clozeCandidates: { sentenceId: string; tokenIndex: number; lemma: string }[];
}) {
  const st = structuredClone(state);
  const now = Date.now();
  const tapped = new Set(st.tapsInPassage[opts.passageId] ?? []);
  const firstTime = !st.read[opts.passageId];
  for (const l of new Set(opts.lemmas)) {
    const x = lemma(st, l);
    x.seen += 1;
    if (!tapped.has(l) && firstTime) x.s += 1;
    x.last = now;
    st.lemmas[l] = x;
  }
  if (firstTime) for (const [k, n] of Object.entries(opts.constructions)) st.constructionCounts[k] = (st.constructionCounts[k] ?? 0) + n;
  st.read[opts.passageId] = now;
  for (const c of opts.clozeCandidates) {
    const id = `${opts.textId}:${c.sentenceId}:${c.tokenIndex}`;
    if (st.cloze.some((x) => x.id === id)) continue;
    st.cloze.push({ id, textId: opts.textId, passageId: opts.passageId, sentenceId: c.sentenceId, tokenIndex: c.tokenIndex, lemma: c.lemma, due: now + DAY, interval: 1, reps: 0 });
  }
  if (st.cloze.length > 400) st.cloze = st.cloze.slice(-400);
  st.tapsInPassage[opts.passageId] = [];
  commit(st);
}

export function markNoteShown(id: string) {
  if (state.notesShown[id]) return;
  const st = structuredClone(state);
  st.notesShown[id] = Date.now();
  commit(st);
}

/** Quiz outcome for a lemma, with an optional morphological pattern to re-gloss on a miss. */
export function quizResult(opts: { lemma?: string; correct: boolean; pattern?: { mask: string; label: string }; clozeId?: string }) {
  const st = structuredClone(state);
  const now = Date.now();
  if (opts.lemma) {
    const x = lemma(st, opts.lemma);
    if (opts.correct) { x.ok += 1; x.s += 2; } else { x.bad += 1; x.s = Math.max(0, x.s - 2); }
    x.last = now;
    st.lemmas[opts.lemma] = x;
  }
  if (!opts.correct && opts.pattern) {
    st.patterns = st.patterns.filter((p) => p.mask !== opts.pattern!.mask && p.until > now);
    st.patterns.push({ mask: opts.pattern.mask, label: opts.pattern.label, until: now + 7 * DAY });
  }
  if (opts.clozeId) {
    const c = st.cloze.find((x) => x.id === opts.clozeId);
    if (c) {
      if (opts.correct) {
        c.reps += 1;
        c.interval = c.reps >= 4 ? 0 : Math.round(c.interval * 2.5) || 2;
        if (c.interval === 0) st.cloze = st.cloze.filter((x) => x.id !== c.id);
        else c.due = now + c.interval * DAY;
      } else {
        c.reps = 0; c.interval = 1; c.due = now + DAY;
      }
    }
  }
  st.events += 1;
  commit(st);
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...structuredClone(state), settings: { ...state.settings, ...patch } });
}
