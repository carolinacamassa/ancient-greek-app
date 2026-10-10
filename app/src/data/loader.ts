import type { Lexicon, Manifest, TextDoc } from '../types';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const cache = new Map<string, Promise<unknown>>();

function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${base}/data/${path}`).then((r) => {
        if (!r.ok) throw new Error(`failed to load ${path}: ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export const loadManifest = () => getJson<Manifest>('manifest.json');
export const loadLexicon = () => getJson<Lexicon>('lexicon.json');
export const loadText = (id: string) => getJson<TextDoc>(`texts/${id}.json`);
