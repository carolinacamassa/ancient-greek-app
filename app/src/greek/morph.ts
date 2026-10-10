/** Decoding of the 9-position AGDT postag. */
import type { Token } from '../types';

export const POS: Record<string, string> = {
  n: 'noun', v: 'verb', a: 'adjective', d: 'adverb', l: 'article', g: 'particle',
  c: 'conjunction', r: 'preposition', p: 'pronoun', m: 'numeral', i: 'interjection',
  e: 'exclamation', u: 'punctuation', x: 'other', t: 'participle',
};
export const PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };
export const NUMBER: Record<string, string> = { s: 'sing.', p: 'plur.', d: 'dual' };
export const TENSE: Record<string, string> = {
  p: 'present', i: 'imperfect', r: 'perfect', l: 'pluperfect', t: 'fut. perfect', f: 'future', a: 'aorist',
};
export const MOOD: Record<string, string> = {
  i: 'indicative', s: 'subjunctive', o: 'optative', n: 'infinitive', m: 'imperative', p: 'participle',
  d: 'gerund', g: 'gerundive',
};
export const VOICE: Record<string, string> = { a: 'active', p: 'passive', m: 'middle', e: 'mid./pass.' };
export const GENDER: Record<string, string> = { m: 'masc.', f: 'fem.', n: 'neut.' };
export const CASE: Record<string, string> = {
  n: 'nominative', g: 'genitive', d: 'dative', a: 'accusative', v: 'vocative', l: 'locative',
};
export const DEGREE: Record<string, string> = { c: 'comparative', s: 'superlative' };

export interface Morph {
  pos: string; person: string; number: string; tense: string; mood: string;
  voice: string; gender: string; case: string; degree: string;
}

export function parse(p: string): Morph {
  const q = (p + '---------').slice(0, 9);
  return {
    pos: q[0], person: q[1], number: q[2], tense: q[3], mood: q[4],
    voice: q[5], gender: q[6], case: q[7], degree: q[8],
  };
}

export const isPunct = (t: Token) => t.p[0] === 'u' || /^[\s.,;:·\-—–()[\]"'«»‘’“”…!?⸀-⸏]+$/.test(t.f);
export const isVerb = (t: Token) => t.p[0] === 'v';
export const isParticiple = (t: Token) => t.p[0] === 'v' && t.p[4] === 'p';
export const isFiniteVerb = (t: Token) => t.p[0] === 'v' && 'isom'.includes(t.p[4]);
export const isInfinitive = (t: Token) => t.p[0] === 'v' && t.p[4] === 'n';
export const isNominal = (t: Token) => 'napl'.includes(t.p[0]) && t.p[7] !== '-';
export const isContentWord = (t: Token) => 'nvad'.includes(t.p[0]) && !isPunct(t);

/** Short human label, e.g. "aor. act. ind. 3 sg." or "gen. sg. fem." */
export function label(p: string): string {
  const m = parse(p);
  const parts: string[] = [];
  if (m.pos === 'v') {
    if (m.tense !== '-') parts.push(abbr(TENSE[m.tense]));
    if (m.voice !== '-') parts.push(abbr(VOICE[m.voice]));
    if (m.mood !== '-') parts.push(abbr(MOOD[m.mood]));
    if (m.mood === 'p') {
      if (m.case !== '-') parts.push(abbr(CASE[m.case]));
      if (m.number !== '-') parts.push(NUMBER[m.number]);
      if (m.gender !== '-') parts.push(GENDER[m.gender]);
    } else if (m.mood !== 'n') {
      if (m.person !== '-') parts.push(PERSON[m.person]);
      if (m.number !== '-') parts.push(NUMBER[m.number]);
    }
    return parts.join(' ');
  }
  if ('napl'.includes(m.pos) || (m.pos === 'm' && m.case !== '-')) {
    if (m.case !== '-') parts.push(abbr(CASE[m.case]));
    if (m.number !== '-') parts.push(NUMBER[m.number]);
    if (m.gender !== '-') parts.push(GENDER[m.gender]);
    if (m.degree !== '-') parts.push(DEGREE[m.degree]);
    return parts.join(' ') || POS[m.pos];
  }
  if (m.pos === 'd' && m.degree !== '-') return `${POS.d}, ${DEGREE[m.degree]}`;
  return POS[m.pos] ?? m.pos;
}

/** Full description in words, for the word panel. */
export function describe(p: string): string {
  const m = parse(p);
  const parts: string[] = [POS[m.pos] ?? 'word'];
  if (m.pos === 'v') {
    if (m.tense !== '-') parts.push(TENSE[m.tense]);
    if (m.voice !== '-') parts.push(VOICE[m.voice]);
    if (m.mood !== '-') parts.push(MOOD[m.mood]);
    if (m.mood === 'p') {
      if (m.case !== '-') parts.push(CASE[m.case]);
      if (m.number !== '-') parts.push(NUMBER[m.number]);
      if (m.gender !== '-') parts.push(GENDER[m.gender]);
    } else if (m.mood !== 'n') {
      if (m.person !== '-') parts.push(PERSON[m.person] + ' person');
      if (m.number !== '-') parts.push(NUMBER[m.number]);
    }
  } else {
    if (m.case !== '-') parts.push(CASE[m.case]);
    if (m.number !== '-') parts.push(NUMBER[m.number]);
    if (m.gender !== '-') parts.push(GENDER[m.gender]);
    if (m.degree !== '-') parts.push(DEGREE[m.degree]);
  }
  return parts.join(', ');
}

function abbr(s: string | undefined): string {
  if (!s) return '';
  const map: Record<string, string> = {
    present: 'pres.', imperfect: 'impf.', perfect: 'perf.', pluperfect: 'plpf.', future: 'fut.',
    aorist: 'aor.', active: 'act.', passive: 'pass.', middle: 'mid.', indicative: 'ind.',
    subjunctive: 'subj.', optative: 'opt.', infinitive: 'inf.', imperative: 'imper.',
    participle: 'ptc.', nominative: 'nom.', genitive: 'gen.', dative: 'dat.', accusative: 'acc.',
    vocative: 'voc.', locative: 'loc.',
  };
  return map[s] ?? s;
}

/** Build a wildcard mask from a postag: keeps the features in `keep` (indices), '?' elsewhere. */
export function mask(p: string, keep: number[]): string {
  return Array.from({ length: 9 }, (_, i) => (keep.includes(i) ? p[i] : '?')).join('');
}
export function matchesMask(p: string, m: string): boolean {
  for (let i = 0; i < 9; i++) if (m[i] !== '?' && m[i] !== p[i]) return false;
  return true;
}

/** Produce plausible wrong analyses for a quiz: change one or two features, keep the result valid. */
export function distractors(p: string, n: number, pool: string[] = []): string[] {
  const m = parse(p);
  const out = new Set<string>();
  const set = (idx: number, ch: string) => p.slice(0, idx) + ch + p.slice(idx + 1);
  const cands: string[] = [];
  // real homographs seen elsewhere in the text first
  for (const q of pool) if (q !== p && label(q) !== label(p)) cands.push(q);
  if (m.pos === 'v') {
    for (const t of Object.keys(TENSE)) if (t !== m.tense && m.tense !== '-') cands.push(set(3, t));
    for (const v of ['a', 'm', 'p']) if (v !== m.voice && m.voice !== '-') cands.push(set(5, v));
    if (m.mood !== 'p' && m.mood !== 'n') {
      for (const mo of ['i', 's', 'o', 'm']) if (mo !== m.mood) cands.push(set(4, mo));
      for (const pe of ['1', '2', '3']) if (pe !== m.person) cands.push(set(1, pe));
      cands.push(set(2, m.number === 's' ? 'p' : 's'));
    } else if (m.mood === 'p') {
      for (const c of ['n', 'g', 'd', 'a']) if (c !== m.case) cands.push(set(7, c));
      cands.push(set(2, m.number === 's' ? 'p' : 's'));
      for (const g of ['m', 'f', 'n']) if (g !== m.gender) cands.push(set(6, g));
    }
  } else {
    for (const c of ['n', 'g', 'd', 'a', 'v']) if (c !== m.case) cands.push(set(7, c));
    cands.push(set(2, m.number === 's' ? 'p' : 's'));
    for (const g of ['m', 'f', 'n']) if (g !== m.gender && m.gender !== '-') cands.push(set(6, g));
  }
  shuffle(cands);
  for (const c of cands) {
    if (c === p) continue;
    const l = label(c);
    if (!l || l === label(p)) continue;
    if ([...out].some((o) => label(o) === l)) continue;
    out.add(c);
    if (out.size >= n) break;
  }
  return [...out];
}

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
