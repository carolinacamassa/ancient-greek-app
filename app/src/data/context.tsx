import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lexicon, Manifest, TextDoc } from '../types';
import { loadLexicon, loadManifest, loadText } from './loader';

interface Data { manifest: Manifest; lexicon: Lexicon }
const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([loadManifest(), loadLexicon()])
      .then(([manifest, lexicon]) => setData({ manifest, lexicon }))
      .catch((e) => setError(String(e)));
  }, []);
  if (error) return <div className="screen"><p className="error">Could not load the corpus: {error}</p><p>Run <code>python3 pipeline/build.py</code> to generate <code>app/public/data</code>.</p></div>;
  if (!data) return <div className="screen muted">Loading…</div>;
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const d = useContext(Ctx);
  if (!d) throw new Error('DataProvider missing');
  return d;
}

export function useTextDoc(id: string | undefined): TextDoc | undefined {
  const [doc, setDoc] = useState<TextDoc | undefined>();
  useEffect(() => {
    let alive = true;
    setDoc(undefined);
    if (id) loadText(id).then((d) => { if (alive) setDoc(d); });
    return () => { alive = false; };
  }, [id]);
  return doc;
}
