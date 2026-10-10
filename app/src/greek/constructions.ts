/** Detectors for grammatical constructions. Each returns the indices of the
 *  tokens that carry the construction in a sentence (empty = not present).
 *  Grammar notes (content/grammar.ts) are triggered by counts of these. */
import type { Sentence, Token } from '../types';
import { isInfinitive, isParticiple, isVerb, parse } from './morph';
import { children, dependants, governor, isAdvRel, isAttrRel, isObjectRel, isSubjectRel } from './structure';

export type Detector = (s: Sentence) => number[];

const idx = (s: Sentence, pred: (t: Token, i: number) => boolean) => s.t.map((t, i) => (pred(t, i) ? i : -1)).filter((i) => i >= 0);

const PARTICLES = new Set(['γάρ', 'οὖν', 'δή', 'γε', 'ἄρα', 'τοι', 'μήν', 'μέντοι', 'τοίνυν', 'που', 'δῆτα']);
const DEMONSTR = new Set(['οὗτος', 'ὅδε', 'ἐκεῖνος']);
const RELATIVES = new Set(['ὅς', 'ὅστις', 'ὅσπερ', 'οἷος', 'ὅσος', 'ὁπόσος', 'ἡλίκος']);
const MI_VERBS = new Set(['εἰμί', 'φημί', 'δίδωμι', 'τίθημι', 'ἵστημι', 'ἵημι', 'εἶμι', 'δείκνυμι', 'δύναμαι', 'ἐπίσταμαι', 'κεῖμαι', 'ἀφίημι', 'ἀποδίδωμι', 'παραδίδωμι', 'καθίστημι', 'ἀνίστημι', 'συνίημι', 'οἶδα']);

export const DETECTORS: Record<string, Detector> = {
  article: (s) => idx(s, (t) => t.p[0] === 'l'),

  gen_abs: (s) => idx(s, (t, i) => {
    if (!isParticiple(t) || t.p[7] !== 'g') return false;
    if (isAttrRel(t.r)) return false;
    const subj = dependants(s, i).find((j) => isSubjectRel(s.t[j].r) && s.t[j].p[7] === 'g');
    return subj !== undefined;
  }),

  ptc_attributive: (s) => idx(s, (t) => isParticiple(t) && isAttrRel(t.r)),

  ptc_circumstantial: (s) => idx(s, (t, i) => {
    if (!isParticiple(t) || !isAdvRel(t.r)) return false;
    if (t.p[7] === 'g' && dependants(s, i).some((j) => isSubjectRel(s.t[j].r) && s.t[j].p[7] === 'g')) return false;
    return true;
  }),

  ptc_supplementary: (s) => idx(s, (t, i) => {
    if (!isParticiple(t)) return false;
    const r = t.r.replace(/_.*$/, '');
    if (!['OBJ', 'PNOM', 'comp', 'xobj', 'ATV', 'AtvV'].includes(r)) return false;
    const g = governor(s, i);
    return g >= 0 && isVerb(s.t[g]);
  }),

  ptc_future: (s) => idx(s, (t) => isParticiple(t) && t.p[3] === 'f'),

  middle: (s) => idx(s, (t) => isVerb(t) && 'me'.includes(t.p[5]) && t.p[3] !== 'a' && t.p[3] !== 'f'),
  aorist_passive: (s) => idx(s, (t) => isVerb(t) && t.p[3] === 'a' && t.p[5] === 'p'),
  aorist: (s) => idx(s, (t) => isVerb(t) && t.p[3] === 'a' && t.p[4] === 'i'),
  imperfect: (s) => idx(s, (t) => isVerb(t) && t.p[3] === 'i' && t.p[4] === 'i'),
  aorist_and_imperfect: (s) => {
    const a = idx(s, (t) => isVerb(t) && t.p[3] === 'a' && t.p[4] === 'i');
    const i = idx(s, (t) => isVerb(t) && t.p[3] === 'i' && t.p[4] === 'i');
    return a.length && i.length ? [...a, ...i].sort((x, y) => x - y) : [];
  },
  perfect: (s) => idx(s, (t) => isVerb(t) && (t.p[3] === 'r' || t.p[3] === 'l')),
  optative: (s) => idx(s, (t) => isVerb(t) && t.p[4] === 'o'),
  subjunctive: (s) => idx(s, (t) => isVerb(t) && t.p[4] === 's'),
  an_particle: (s) => idx(s, (t) => t.l === 'ἄν' || t.l === 'ἐάν' || t.l === 'ὅταν' || t.l === 'ἐπειδάν' || t.l === 'ἤν'),
  imperative: (s) => idx(s, (t) => isVerb(t) && t.p[4] === 'm'),

  inf_articular: (s) => idx(s, (t, i) => {
    if (!isInfinitive(t)) return false;
    if (children(s, i).some((j) => s.t[j].p[0] === 'l')) return true;
    return t.h >= 0 && s.t[t.h].p[0] === 'l';
  }),
  acc_inf: (s) => idx(s, (t, i) => {
    if (!isInfinitive(t)) return false;
    return dependants(s, i).some((j) => isSubjectRel(s.t[j].r) && s.t[j].p[7] === 'a');
  }),
  inf_complement: (s) => idx(s, (t, i) => {
    if (!isInfinitive(t)) return false;
    const g = governor(s, i);
    return g >= 0 && isVerb(s.t[g]) && isObjectRel(t.r);
  }),
  hoti_clause: (s) => idx(s, (t) => (t.l === 'ὅτι' || t.l === 'ὡς') && t.p[0] === 'c'),
  hina_purpose: (s) => idx(s, (t) => (t.l === 'ἵνα' || t.l === 'ὅπως') && t.p[0] === 'c'),
  hoste: (s) => idx(s, (t) => t.l === 'ὥστε'),
  conditional: (s) => idx(s, (t) => ['εἰ', 'ἐάν', 'ἤν', 'ἄν'].includes(t.l) && t.p[0] === 'c'),
  relative: (s) => idx(s, (t) => RELATIVES.has(t.l)),
  men_de: (s) => {
    const m = idx(s, (t) => t.l === 'μέν');
    const d = idx(s, (t) => t.l === 'δέ');
    return m.length && d.length ? [...m, ...d].sort((x, y) => x - y) : [];
  },
  particles: (s) => idx(s, (t) => PARTICLES.has(t.l)),
  negation_me: (s) => idx(s, (t) => t.l === 'μή' || t.l === 'μηδέ' || t.l === 'μηδείς' || t.l === 'μήτε'),
  negation_ou: (s) => idx(s, (t) => t.l === 'οὐ' || t.l === 'οὐδέ' || t.l === 'οὐδείς' || t.l === 'οὔτε'),
  autos: (s) => idx(s, (t) => t.l === 'αὐτός'),
  demonstratives: (s) => idx(s, (t) => DEMONSTR.has(t.l)),
  tis: (s) => idx(s, (t) => t.l === 'τις' || t.l === 'τίς'),
  prepositions: (s) => idx(s, (t) => t.p[0] === 'r'),
  mi_verbs: (s) => idx(s, (t) => isVerb(t) && MI_VERBS.has(t.l)),
  vocative: (s) => idx(s, (t) => t.p[7] === 'v'),
  dative: (s) => idx(s, (t) => 'napl'.includes(t.p[0]) && t.p[7] === 'd'),
  neuter_plural_subject: (s) => idx(s, (t, i) => {
    if (!('nap'.includes(t.p[0]) && t.p[6] === 'n' && t.p[2] === 'p' && t.p[7] === 'n' && isSubjectRel(t.r))) return false;
    const g = governor(s, i);
    return g >= 0 && isVerb(s.t[g]) && s.t[g].p[2] === 's';
  }),
  dual: (s) => idx(s, (t) => t.p[2] === 'd'),
  comparative: (s) => idx(s, (t) => t.p[8] === 'c' || t.p[8] === 's'),
  indirect_question: (s) => idx(s, (t) => ['ὅστις', 'ὁπόσος', 'ὁποῖος', 'ὅπως', 'ὅπου', 'πότερος', 'εἴτε'].includes(t.l) || (t.l === 'τίς' && t.h >= 0 && isVerb(s.t[t.h]) && s.t[t.h].h >= 0)),
  crasis_elision: (s) => idx(s, (t) => /[ʼ᾽’]$/.test(t.f) || /^(κἀ|κἄ|τοὐ|ταὐ|κἀν|κἀκ)/.test(t.f)),
};

export function detect(s: Sentence): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [k, d] of Object.entries(DETECTORS)) {
    const hits = d(s);
    if (hits.length) out[k] = hits;
  }
  return out;
}

export { parse as parseTag };
