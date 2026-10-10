/** Quiz items built from the sentences of a passage. */
import type { Passage, Sentence, TextDoc, Token } from '../types';
import { distractors, isContentWord, isNominal, isParticiple, isPunct, isVerb, label, mask, shuffle } from '../greek/morph';
import { antecedent, participleAgreement, isAttrRel } from '../greek/structure';
import type { ClozeItem, LearnerState } from './model';
import { dueCloze } from './model';

export interface ParseItem {
  kind: 'parse'; sentence: Sentence; tokenIndex: number; options: string[]; answer: string; pattern: { mask: string; label: string };
}
export interface ReferItem {
  kind: 'agree' | 'refer'; sentence: Sentence; tokenIndex: number; options: number[]; answer: number;
}
export interface ClozeQuizItem {
  kind: 'cloze'; sentence: Sentence; tokenIndex: number; options: string[]; answer: string; clozeId?: string; lemma: string;
}
export interface TranslateItem {
  kind: 'translate'; sentence: Sentence; reference: string;
}
export type QuizItem = ParseItem | ReferItem | ClozeQuizItem | TranslateItem;

const tokenText = (s: Sentence) => s.t.map((t) => t.f).join(' ');

/** All postags seen for each surface form in the text (real homograph ambiguity). */
export function postagPool(text: TextDoc): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const p of text.passages) for (const s of p.s) for (const t of s.t) {
    if (isPunct(t)) continue;
    const arr = m.get(t.f) ?? [];
    if (!arr.includes(t.p)) arr.push(t.p);
    m.set(t.f, arr);
  }
  return m;
}

function patternFor(t: Token): { mask: string; label: string } {
  if (isVerb(t)) {
    if (isParticiple(t)) return { mask: mask(t.p, [0, 3, 4, 5]), label: `${label(t.p).split(' ').slice(0, 3).join(' ')} forms` };
    return { mask: mask(t.p, [0, 3, 4, 5]), label: `${label(t.p).split(' ').slice(0, 3).join(' ')} forms` };
  }
  return { mask: mask(t.p, [0, 2, 7]), label: `${label(t.p).split(' ').slice(0, 2).join(' ')} forms` };
}

export function parseItems(passage: Passage, pool: Map<string, string[]>, n: number): ParseItem[] {
  const cands: { s: Sentence; i: number }[] = [];
  for (const s of passage.s) s.t.forEach((t, i) => {
    if (isVerb(t) || (isNominal(t) && 'na'.includes(t.p[0]))) cands.push({ s, i });
  });
  shuffle(cands);
  // prefer verbs and participles: they are where Greek forms are ambiguous
  cands.sort((a, b) => Number(isVerb(b.s.t[b.i])) - Number(isVerb(a.s.t[a.i])));
  const out: ParseItem[] = [];
  const usedForms = new Set<string>();
  for (const { s, i } of cands) {
    const t = s.t[i];
    if (usedForms.has(t.f)) continue;
    const ds = distractors(t.p, 3, pool.get(t.f) ?? []);
    if (ds.length < 2) continue;
    usedForms.add(t.f);
    out.push({ kind: 'parse', sentence: s, tokenIndex: i, options: shuffle([t.p, ...ds]), answer: t.p, pattern: patternFor(t) });
    if (out.length >= n) break;
  }
  return out;
}

export function referItems(passage: Passage, n: number): ReferItem[] {
  const out: ReferItem[] = [];
  const cands: ReferItem[] = [];
  for (const s of passage.s) s.t.forEach((t, i) => {
    let answer: number | undefined;
    let kind: 'agree' | 'refer' = 'agree';
    if (isParticiple(t) && !isAttrRel(t.r)) answer = participleAgreement(s, i);
    else if (isParticiple(t)) answer = participleAgreement(s, i);
    else if (/^(ὅς|ὅστις|ὅσπερ)$/.test(t.l)) { answer = antecedent(s, i); kind = 'refer'; }
    if (answer === undefined || answer === i) return;
    const a = s.t[answer];
    if (!'npa'.includes(a.p[0])) return;
    const others = s.t.map((_, j) => j).filter((j) => j !== answer && j !== i && 'npa'.includes(s.t[j].p[0]) && !isPunct(s.t[j]) && s.t[j].f !== a.f);
    if (others.length < 2) return;
    cands.push({ kind, sentence: s, tokenIndex: i, options: shuffle([answer, ...shuffle(others).slice(0, 3)]), answer });
  });
  shuffle(cands);
  for (const c of cands) { out.push(c); if (out.length >= n) break; }
  return out;
}

function clozeFromToken(text: TextDoc, s: Sentence, i: number, clozeId?: string): ClozeQuizItem | null {
  const t = s.t[i];
  const pos = t.p[0];
  const forms = new Set<string>();
  for (const p of text.passages) for (const x of p.s) for (const y of x.t) {
    if (y.p[0] === pos && y.f !== t.f && y.l !== t.l && !isPunct(y) && y.p[7] === t.p[7] && y.p[2] === t.p[2]) forms.add(y.f);
    if (forms.size > 40) break;
  }
  if (forms.size < 3) {
    for (const p of text.passages) for (const x of p.s) for (const y of x.t) if (y.p[0] === pos && y.f !== t.f && y.l !== t.l && !isPunct(y)) forms.add(y.f);
  }
  const opts = shuffle([...forms]).slice(0, 3);
  if (opts.length < 2) return null;
  return { kind: 'cloze', sentence: s, tokenIndex: i, options: shuffle([t.f, ...opts]), answer: t.f, clozeId, lemma: t.l };
}

/** Cloze on the words tapped in this passage (not yet scheduled) plus due reviews from earlier. */
export function clozeItems(text: TextDoc, passage: Passage, st: LearnerState, n: number): ClozeQuizItem[] {
  const out: ClozeQuizItem[] = [];
  const tapped = new Set(st.tapsInPassage[passage.id] ?? []);
  const cands: { s: Sentence; i: number }[] = [];
  for (const s of passage.s) s.t.forEach((t, i) => { if (tapped.has(t.l) && isContentWord(t)) cands.push({ s, i }); });
  shuffle(cands);
  const seen = new Set<string>();
  for (const { s, i } of cands) {
    if (seen.has(s.t[i].l)) continue;
    const item = clozeFromToken(text, s, i);
    if (item) { out.push(item); seen.add(s.t[i].l); }
    if (out.length >= n) break;
  }
  return out;
}

export function dueClozeItems(text: TextDoc, st: LearnerState, n: number): ClozeQuizItem[] {
  const out: ClozeQuizItem[] = [];
  const due: ClozeItem[] = dueCloze(st).filter((c) => c.textId === text.id);
  for (const c of due) {
    const p = text.passages.find((x) => x.id === c.passageId);
    const s = p?.s.find((x) => x.id === c.sentenceId);
    if (!s || !s.t[c.tokenIndex]) continue;
    const item = clozeFromToken(text, s, c.tokenIndex, c.id);
    if (item) out.push(item);
    if (out.length >= n) break;
  }
  return out;
}

export function translateItem(passage: Passage): TranslateItem | null {
  if (!passage.tr) return null;
  const cands = passage.s.filter((s) => {
    const words = s.t.filter((t) => !isPunct(t)).length;
    return words >= 4 && words <= 14 && (passage.tr![s.id] || passage.tr![s.ref]);
  });
  if (!cands.length) return null;
  const s = cands[Math.floor(Math.random() * cands.length)];
  return { kind: 'translate', sentence: s, reference: passage.tr[s.id] ?? passage.tr[s.ref] };
}

export function buildQuiz(text: TextDoc, passage: Passage, st: LearnerState, pool: Map<string, string[]>): QuizItem[] {
  const items: QuizItem[] = [
    ...parseItems(passage, pool, 3),
    ...referItems(passage, 2),
    ...clozeItems(text, passage, st, 4),
    ...dueClozeItems(text, st, 4),
  ];
  const tr = translateItem(passage);
  if (tr && Math.random() < 0.6) items.push(tr);
  return items;
}

export { tokenText };
