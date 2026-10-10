/** Dependency-tree helpers: relation labels per scheme and a sentence
 *  structure summary (main verb, subject, objects, participles, clauses). */
import type { Sentence, Token } from '../types';
import { isFiniteVerb, isInfinitive, isParticiple, isPunct, isVerb, label, parse } from './morph';

type Scheme = 'agdt' | 'proiel';

const AGDT_REL: Record<string, string> = {
  PRED: 'main verb', SBJ: 'subject', OBJ: 'object', ATR: 'attribute (modifies a noun)',
  ADV: 'adverbial (modifies the verb)', PNOM: 'predicate nominative', OCOMP: 'object complement',
  ATV: 'predicative attribute', AtvV: 'predicative attribute', APOS: 'apposition', ExD: 'outside the sentence (vocative, interjection)',
  AuxP: 'preposition', AuxC: 'subordinating conjunction', COORD: 'coordinator', AuxY: 'sentence particle',
  AuxZ: 'emphasising particle', AuxX: 'comma', AuxK: 'end punctuation', AuxG: 'bracket / punctuation',
  AuxV: 'auxiliary verb', MWE: 'multiword expression', UNDEFINED: 'unclassified',
};
const PROIEL_REL: Record<string, string> = {
  pred: 'main verb', sub: 'subject', obj: 'object', obl: 'oblique (indirect object / prepositional phrase)',
  adv: 'adverbial', atr: 'attribute (modifies a noun)', aux: 'auxiliary word (article, particle)',
  xobj: 'predicative complement', xadv: 'circumstantial participle', comp: 'complement clause',
  apos: 'apposition', ag: 'agent', voc: 'vocative', parpred: 'parenthetical', part: 'partitive',
  narg: 'adnominal argument', nonsub: 'non-subject argument', per: 'peripheral', arg: 'argument',
  expl: 'expletive', pid: 'predicate identity', rel: 'relative', xsub: 'external subject',
};

export function relationLabel(rel: string, scheme: Scheme): string {
  const base = rel.replace(/_(CO|AP|ExD|PA)+$/g, '');
  const table = scheme === 'proiel' ? PROIEL_REL : AGDT_REL;
  let out = table[base] ?? base.toLowerCase();
  if (/_CO/.test(rel)) out += ', coordinated';
  if (/_AP/.test(rel)) out += ', in apposition';
  return out;
}

const baseRel = (r: string) => r.replace(/_(CO|AP|ExD|PA)+$/g, '');

export const isSubjectRel = (r: string) => ['SBJ', 'sub', 'xsub'].includes(baseRel(r));
export const isObjectRel = (r: string) => ['OBJ', 'obj', 'obl', 'comp'].includes(baseRel(r));
export const isAttrRel = (r: string) => ['ATR', 'atr'].includes(baseRel(r));
export const isAdvRel = (r: string) => ['ADV', 'adv', 'xadv'].includes(baseRel(r));
export const isPredRel = (r: string) => ['PRED', 'pred'].includes(baseRel(r));
export const isCoord = (t: Token) => baseRel(t.r) === 'COORD' || (t.p[0] === 'c' && t.r === 'pred');
export const isAuxP = (t: Token) => baseRel(t.r) === 'AuxP' || t.p[0] === 'r';
export const isAuxC = (t: Token) => baseRel(t.r) === 'AuxC' || (t.p[0] === 'c' && ['comp', 'adv', 'aux'].includes(baseRel(t.r)) && t.l !== 'καί');

export function children(s: Sentence, i: number): number[] {
  const out: number[] = [];
  s.t.forEach((t, j) => { if (t.h === i) out.push(j); });
  return out;
}

/** Walk up through coordinators/prepositions/conjunctions to the governing word. */
export function governor(s: Sentence, i: number): number {
  let h = s.t[i].h;
  let guard = 0;
  while (h >= 0 && guard++ < 20) {
    const t = s.t[h];
    if (isCoord(t) || isAuxP(t) || isAuxC(t)) h = t.h;
    else return h;
  }
  return h;
}

/** Descendants through coordination/auxiliaries, i.e. the real dependants of word i. */
export function dependants(s: Sentence, i: number): number[] {
  const out: number[] = [];
  const visit = (j: number) => {
    for (const c of children(s, j)) {
      const t = s.t[c];
      if (isCoord(t) || isAuxP(t) || isAuxC(t)) { out.push(c); visit(c); }
      else out.push(c);
    }
  };
  visit(i);
  return out;
}

export function phraseOf(s: Sentence, i: number): string {
  const idx = new Set<number>([i]);
  const stack = [i];
  while (stack.length) {
    const j = stack.pop()!;
    for (const c of children(s, j)) if (!idx.has(c)) { idx.add(c); stack.push(c); }
  }
  return [...idx].sort((a, b) => a - b).map((k) => s.t[k].f).filter((f) => !/^[.,;·]$/.test(f)).join(' ');
}

export interface ClauseInfo {
  verb: number;             // index of the finite verb / infinitive / participle heading the clause
  kind: 'main' | 'subordinate' | 'participle' | 'infinitive';
  intro?: number;           // conjunction or relative pronoun introducing it
  subject?: number;
  objects: number[];
  dependsOn?: number;       // for participles/infinitives/subordinate clauses: governing word
  note?: string;
}

export interface Structure {
  clauses: ClauseInfo[];
  particles: number[];
}

export function analyse(s: Sentence): Structure {
  const clauses: ClauseInfo[] = [];
  const particles: number[] = [];
  s.t.forEach((t, i) => {
    if (t.p[0] === 'g' || (t.p[0] === 'd' && ['AuxY', 'AuxZ', 'aux'].includes(baseRel(t.r)))) particles.push(i);
    if (!isVerb(t)) return;
    const gov = governor(s, i);
    const deps = dependants(s, i).filter((j) => !isPunct(s.t[j]));
    const subject = deps.find((j) => isSubjectRel(s.t[j].r));
    // PROIEL attaches the noun of a prepositional phrase to the preposition as "obl";
    // that is not an object of the verb, so skip nouns whose head is a preposition.
    const objects = deps.filter((j) => isObjectRel(s.t[j].r) && !isVerb(s.t[j])
      && !(s.t[j].r === 'obl' && s.t[j].h >= 0 && s.t[s.t[j].h].p[0] === 'r'));
    const introIdx = findIntro(s, i);
    let kind: ClauseInfo['kind'];
    if (isParticiple(t)) kind = 'participle';
    else if (isInfinitive(t)) kind = 'infinitive';
    else if (gov < 0 || !isVerb(s.t[gov]) || isPredRel(t.r)) kind = introIdx !== undefined ? 'subordinate' : 'main';
    else kind = 'subordinate';
    if (kind === 'main' && isFiniteVerb(t) && gov >= 0 && isVerb(s.t[gov])) kind = 'subordinate';
    const info: ClauseInfo = { verb: i, kind, intro: introIdx, subject, objects, dependsOn: gov >= 0 ? gov : undefined };
    info.note = describeClause(s, info);
    clauses.push(info);
  });
  // main clauses first, then by position
  clauses.sort((a, b) => (a.kind === 'main' ? 0 : 1) - (b.kind === 'main' ? 0 : 1) || a.verb - b.verb);
  return { clauses, particles };
}

function findIntro(s: Sentence, verb: number): number | undefined {
  // AGDT: the verb depends on an AuxC conjunction; PROIEL: a subjunction (G-) depends on or governs it
  let h = s.t[verb].h;
  let guard = 0;
  while (h >= 0 && guard++ < 10) {
    const t = s.t[h];
    if (isAuxC(t) && t.p[0] === 'c') return h;
    if (isCoord(t)) { h = t.h; continue; }
    break;
  }
  // relative pronoun inside the clause
  const rel = dependants(s, verb).find((j) => /^(ὅς|ὅστις|ὅσπερ|οἷος|ὅσος|ὁπόσος)$/.test(s.t[j].l) || s.t[j].r === 'rel');
  return rel;
}

function describeClause(s: Sentence, c: ClauseInfo): string {
  const t = s.t[c.verb];
  const m = parse(t.p);
  const bits: string[] = [];
  if (c.kind === 'participle') {
    const gov = c.dependsOn;
    const agreesWith = participleAgreement(s, c.verb);
    if (isAttrRel(t.r) && agreesWith !== undefined) bits.push(`attributive, modifies ${s.t[agreesWith].f}`);
    else if (m.case === 'g' && c.subject !== undefined && s.t[c.subject].p[7] === 'g') bits.push(`genitive absolute with ${s.t[c.subject].f}`);
    else if (agreesWith !== undefined) bits.push(`agrees with ${s.t[agreesWith].f}`);
    if (gov !== undefined && isVerb(s.t[gov])) bits.push(`depends on ${s.t[gov].f}`);
    else if (gov !== undefined && !isAttrRel(t.r)) bits.push(`depends on ${s.t[gov].f}`);
  } else if (c.kind === 'infinitive') {
    if (c.dependsOn !== undefined) bits.push(`depends on ${s.t[c.dependsOn].f}`);
    if (c.subject !== undefined && s.t[c.subject].p[7] === 'a') bits.push(`accusative subject ${s.t[c.subject].f}`);
    const art = children(s, c.verb).find((j) => s.t[j].p[0] === 'l');
    if (art !== undefined || (c.dependsOn !== undefined && s.t[c.dependsOn].p[0] === 'l')) bits.push('articular infinitive');
  } else if (c.kind === 'subordinate') {
    if (c.intro !== undefined) bits.push(`introduced by ${s.t[c.intro].f}`);
    if (c.dependsOn !== undefined) bits.push(`depends on ${s.t[c.dependsOn].f}`);
  }
  return bits.join('; ');
}

/** For a participle (or adjective), the noun/pronoun it agrees with, if determinable. */
export function participleAgreement(s: Sentence, i: number): number | undefined {
  const t = s.t[i];
  const m = parse(t.p);
  if (isAttrRel(t.r)) {
    const g = governor(s, i);
    if (g >= 0) return g;
  }
  // circumstantial: the subject of the governing verb, when cases match
  const g = governor(s, i);
  if (g >= 0 && isVerb(s.t[g])) {
    const gs = dependants(s, g).find((j) => isSubjectRel(s.t[j].r) && !isVerb(s.t[j]));
    if (gs !== undefined && s.t[gs].p[7] === m.case && m.case !== '-') return gs;
    if (m.case === 'n' && gs === undefined) return undefined;
    // predicative participle agreeing with an object
    const obj = dependants(s, g).find((j) => isObjectRel(s.t[j].r) && s.t[j].p[7] === m.case && s.t[j].p[2] === m.number);
    if (obj !== undefined) return obj;
  }
  // own subject in the same case (genitive absolute)
  const own = dependants(s, i).find((j) => isSubjectRel(s.t[j].r));
  if (own !== undefined) return own;
  return undefined;
}

/** For a relative pronoun, its antecedent. */
export function antecedent(s: Sentence, i: number): number | undefined {
  let v = s.t[i].h;
  let guard = 0;
  while (v >= 0 && !isVerb(s.t[v]) && guard++ < 10) v = s.t[v].h;
  if (v < 0) return undefined;
  const g = governor(s, v);
  if (g >= 0 && 'npa'.includes(s.t[g].p[0])) return g;
  return undefined;
}

export const tokenLabel = (t: Token) => label(t.p);
