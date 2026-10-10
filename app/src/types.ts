/** Shapes produced by pipeline/build.py (see docs/DATA.md). */

export interface Token {
  f: string;        // surface form
  l: string;        // lemma (normalised)
  p: string;        // 9-char AGDT postag
  h: number;        // head index within sentence, -1 = root
  r: string;        // dependency relation
  g?: string;       // contextual gloss (Aesop only)
}

export interface Sentence {
  id: string;
  ref: string;
  t: Token[];
  sp?: string;      // speaker
}

export interface Passage {
  id: string;
  title: string;
  ref: string;
  s: Sentence[];
  tr?: Record<string, string>;   // ref -> translation
}

export interface SourceInfo { name: string; license: string; url: string }

export interface TextDoc {
  id: string;
  title: string;
  author: string;
  stage: number;
  dialect: string;
  description: string;
  scheme: 'agdt' | 'proiel';
  analysis: 'manual' | 'auto';
  source: SourceInfo;
  translation: SourceInfo | null;
  optional: boolean;
  passages: Passage[];
}

export interface ManifestText {
  id: string;
  title: string;
  author: string;
  stage: number;
  optional: boolean;
  analysis: 'manual' | 'auto';
  dialect: string;
  description: string;
  file: string;
  bytes: number;
  passages: number;
  sentences: number;
  tokens: number;
  lemmas: number;
  hasTranslation: boolean;
  freq: Record<string, number>;
}

export interface Manifest {
  generated: string;
  texts: ManifestText[];
  corpusLemmas: number;
  corpusTokens: number;
}

export interface LexEntry { s: string; d: string }
export type Lexicon = Record<string, LexEntry>;
