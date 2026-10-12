import { useEffect, useMemo, useRef, useState } from 'react';
import { sentenceText, speak, tokenAtChar, tokenAtWord, type Handle } from '../speech';
import { useData, useTextDoc } from '../data/context';
import { NOTES, type GrammarNote } from '../content/grammar';
import { detect } from '../greek/constructions';
import { describe, isContentWord, isPunct } from '../greek/morph';
import { analyse, relationLabel } from '../greek/structure';
import { finishPassage, glossVisible, isKnown, markNoteShown, setKnown, strength, tap, updateSettings, useLearner, KNOWN } from '../learner/model';
import { go, href } from '../router';
import type { Passage, Sentence, TextDoc, Token } from '../types';

interface Props { textId: string; passage: number }

export function Reader({ textId, passage }: Props) {
  const doc = useTextDoc(textId);
  if (!doc) return <p className="muted">Loading…</p>;
  const p = doc.passages[passage];
  if (!p) return <p className="error">No such passage.</p>;
  return <PassageView doc={doc} p={p} index={passage} />;
}

function PassageView({ doc, p, index }: { doc: TextDoc; p: Passage; index: number }) {
  const { lexicon } = useData();
  const st = useLearner();
  const [sel, setSel] = useState<{ s: number; t: number } | null>(null);
  const [openSentence, setOpenSentence] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [speaking, setSpeaking] = useState<{ s: number; t: number; loading?: boolean } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const handle = useRef<Handle | null>(null);
  useEffect(() => () => { handle.current?.stop(); }, []);

  async function play(si: number) {
    if (speaking?.s === si) { handle.current?.stop(); handle.current = null; setSpeaking(null); return; }
    handle.current?.stop();
    const s = p.s[si];
    const forms = s.t.map((t) => t.f);
    const punct = (f: string) => /^[\s.,;:·\-—–()[\]"'«»‘’“”…!?]+$/.test(f);
    const { text, starts } = sentenceText(forms, punct);
    setSpeechError(null);
    setSpeaking({ s: si, t: -1, loading: true });
    try {
      const r = await speak(st.settings.voice, {
        textId: doc.id, passageId: p.id, sentenceId: s.id, text,
        rate: st.settings.speechRate,
        onWord: (wordIndex, charStart) => setSpeaking({ s: si, t: wordIndex >= 0 ? tokenAtWord(forms, wordIndex, punct) : tokenAtChar(starts, forms, charStart, punct) }),
        onEnd: () => { handle.current = null; setSpeaking((cur) => (cur?.s === si ? null : cur)); },
        onError: (m) => setSpeechError(m),
      });
      handle.current = r.handle;
      if (st.settings.voice === 'recorded' && r.engine === 'system') setSpeechError('No recording for this sentence; using the device voice.');
      setSpeaking((cur) => (cur?.s === si && cur.loading ? { s: si, t: -1 } : cur));
    } catch (e) {
      setSpeaking(null);
      setSpeechError(String(e));
    }
  }

  // constructions per sentence, and the notes whose threshold is crossed within this passage
  const hits = useMemo(() => p.s.map((s) => detect(s)), [p]);
  const noteAt = useMemo(() => {
    const counts: Record<string, number> = { ...st.constructionCounts };
    const out = new Map<number, { note: GrammarNote; tokens: number[] }[]>();
    const shownHere = new Set<string>();
    hits.forEach((h, i) => {
      for (const [k, idx] of Object.entries(h)) counts[k] = (counts[k] ?? 0) + idx.length;
      for (const n of NOTES) {
        if (st.notesShown[n.id] || shownHere.has(n.id)) continue;
        if ((counts[n.detector] ?? 0) >= n.threshold && h[n.detector]) {
          shownHere.add(n.id);
          const arr = out.get(i) ?? [];
          arr.push({ note: n, tokens: h[n.detector] });
          out.set(i, arr);
        }
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits, p.id]);

  const glossOf = (t: Token) => t.g ?? lexicon[t.l]?.s ?? '';
  const done = !!st.read[p.id];

  function onTap(si: number, ti: number) {
    const t = p.s[si].t[ti];
    if (isPunct(t)) return;
    if (sel && sel.s === si && sel.t === ti) { setSel(null); return; }
    const wasVisible = glossVisible(st, t);
    if (!wasVisible && !done) tap(t.l, p.id);
    setSel({ s: si, t: ti });
    setOpenSentence(null);
  }

  function finish() {
    const lemmas: string[] = [];
    const cons: Record<string, number> = {};
    hits.forEach((h) => { for (const [k, idx] of Object.entries(h)) cons[k] = (cons[k] ?? 0) + idx.length; });
    const tapped = new Set(st.tapsInPassage[p.id] ?? []);
    const clozeCandidates: { sentenceId: string; tokenIndex: number; lemma: string }[] = [];
    const seen = new Set<string>();
    for (const s of p.s) s.t.forEach((t, i) => {
      if (isPunct(t)) return;
      lemmas.push(t.l);
      if (tapped.has(t.l) && isContentWord(t) && !seen.has(t.l)) { seen.add(t.l); clozeCandidates.push({ sentenceId: s.id, tokenIndex: i, lemma: t.l }); }
    });
    for (const arr of noteAt.values()) for (const x of arr) markNoteShown(x.note.id);
    finishPassage({ passageId: p.id, textId: doc.id, lemmas, constructions: cons, clozeCandidates });
    go({ name: 'quiz', textId: doc.id, passage: index });
  }

  const selTok = sel ? p.s[sel.s].t[sel.t] : null;
  const prev = index > 0 ? index - 1 : null;
  const next = index + 1 < doc.passages.length ? index + 1 : null;

  return (
    <div>
      <div className="topbar">
        <a className="crumb" href={href({ name: 'text', textId: doc.id })}>‹ {doc.title}</a>
        <span className="spacer" />
        {prev !== null && <a className="btn small ghost" href={href({ name: 'read', textId: doc.id, passage: prev })}>‹ prev</a>}
        {next !== null && <a className="btn small ghost" href={href({ name: 'read', textId: doc.id, passage: next })}>next ›</a>}
      </div>
      <h1 style={{ marginBottom: 4 }}>{p.title}</h1>
      <div className="readerbar small muted">
        <span>{doc.author}</span>
        {doc.analysis === 'auto' && st.settings.showAutoParseWarning && (
          <span className="badge warn" title="Syntax from an automatic parser; the structure view may be wrong">automatic parse</span>
        )}
        <span className="spacer" />
        <label className="small">glosses
          <select value={st.settings.glossMode} onChange={(e) => updateSettings({ glossMode: e.target.value as 'auto' | 'all' | 'none' })} style={{ width: 'auto', marginLeft: 6, padding: '2px 6px' }}>
            <option value="auto">as needed</option>
            <option value="all">all</option>
            <option value="none">none</option>
          </select>
        </label>
      </div>

      <div className="reader">
        {p.s.map((s, si) => (
          <div key={s.id}>
            <SentenceView
              s={s} si={si} open={openSentence === si} sel={sel?.s === si ? sel.t : null}
              glossOf={glossOf} onTap={onTap} onToggle={() => { setOpenSentence(openSentence === si ? null : si); setSel(null); }}
              visible={(t) => glossVisible(st, t)} hitTokens={noteAt.has(si) ? new Set(noteAt.get(si)!.flatMap((x) => x.tokens)) : undefined}
              speaking={speaking?.s === si ? speaking : null} onPlay={() => play(si)}
            />
            {noteAt.get(si)?.filter((x) => !dismissed.has(x.note.id)).map((x) => (
              <NoteCard key={x.note.id} note={x.note} sentence={s} tokens={x.tokens} onDismiss={() => { markNoteShown(x.note.id); setDismissed(new Set([...dismissed, x.note.id])); }} />
            ))}
          </div>
        ))}
      </div>

      {speechError && <p className="error small" style={{ fontFamily: 'var(--ui)' }}>{speechError}</p>}
      <div className="card" style={{ fontFamily: 'var(--ui)' }}>
        <p className="small muted" style={{ marginTop: 0 }}>
          {done ? 'You have read this passage. Reading it again does not change what the app believes you know; the quiz does.' :
            'When you reach the end, finish the passage: the words you read without tapping gain strength, and a short quiz follows, built from these sentences.'}
        </p>
        <div className="row">
          <button className="btn primary" onClick={finish}>{done ? 'Quiz again' : 'Finish passage & quiz'}</button>
          {next !== null && <a className="btn" href={href({ name: 'read', textId: doc.id, passage: next })}>Next passage</a>}
        </div>
      </div>

      {selTok && sel && (
        <WordSheet t={selTok} s={p.s[sel.s]} scheme={doc.scheme} gloss={glossOf(selTok)} full={lexicon[selTok.l]?.d} known={isKnown(st, selTok.l)} str={strength(st, selTok.l)} onClose={() => setSel(null)} />
      )}
      {openSentence !== null && (
        <SentenceSheet s={p.s[openSentence]} p={p} scheme={doc.scheme} onClose={() => setOpenSentence(null)} />
      )}
    </div>
  );
}

function SentenceView(props: {
  s: Sentence; si: number; open: boolean; sel: number | null; glossOf: (t: Token) => string;
  visible: (t: Token) => boolean; onTap: (si: number, ti: number) => void; onToggle: () => void; hitTokens?: Set<number>;
  speaking: { t: number; loading?: boolean } | null; onPlay: () => void;
}) {
  const { s, si, open, sel, glossOf, visible, onTap, onToggle, hitTokens, speaking, onPlay } = props;
  return (
    <div className={`sentence${open ? ' open' : ''}`}>
      <button className="handle" onClick={onToggle} title="Sentence structure and translation" aria-label="Sentence structure">¶</button>
      <button className={`handle play${speaking ? ' on' : ''}`} onClick={onPlay} title={speaking ? 'Stop' : 'Read aloud'} aria-label={speaking ? 'Stop' : 'Read aloud'}>
        {speaking?.loading ? '…' : speaking ? '■' : '▶'}
      </button>
      {s.sp && <span className="speaker">{s.sp}</span>}
      {s.t.map((t, ti) => {
        const punct = isPunct(t);
        const show = !punct && (visible(t) || sel === ti);
        const g = show ? glossOf(t) : '';
        return (
          <span key={ti} className={`tok${punct ? ' punct' : ''}${sel === ti ? ' sel' : ''}${hitTokens?.has(ti) ? ' hit' : ''}${speaking?.t === ti ? ' speaking' : ''}`} onClick={() => onTap(si, ti)}>
            <span className="form">{t.f}</span>
            {!punct && <span className="gloss">{g || ' '}</span>}
          </span>
        );
      })}
    </div>
  );
}

function NoteCard({ note, sentence, tokens, onDismiss }: { note: GrammarNote; sentence: Sentence; tokens: number[]; onDismiss: () => void }) {
  const hit = new Set(tokens);
  return (
    <div className="card note">
      <div className="row"><span className="badge">grammar</span><strong>{note.title}</strong></div>
      <p className="latin">{note.latin}</p>
      <p className="example">{sentence.t.map((t, i) => <span key={i} className={hit.has(i) ? 'hit' : ''}>{t.f}{isPunct(sentence.t[i + 1] ?? { f: 'x', p: 'n' } as Token) ? '' : ' '}</span>)}</p>
      {note.body.map((b, i) => <p key={i}>{b}</p>)}
      <div className="row">
        <button className="btn small" onClick={onDismiss}>Got it</button>
        <a className="small" href={href({ name: 'grammar', noteId: note.id })}>Open in the grammar reference</a>
      </div>
    </div>
  );
}

function WordSheet(props: { t: Token; s: Sentence; scheme: 'agdt' | 'proiel'; gloss: string; full?: string; known: boolean; str: number; onClose: () => void }) {
  const { t, s, scheme, gloss, full, known, str, onClose } = props;
  const head = t.h >= 0 ? s.t[t.h] : null;
  return (
    <div className="sheet">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="head">{t.f}</div>
      <div className="lemma">{t.l !== t.f ? t.l : ''}{gloss && <> · <span style={{ fontFamily: 'var(--ui)' }}>{gloss}</span></>}</div>
      <dl>
        <dt>form</dt><dd>{describe(t.p)}</dd>
        {full && full !== gloss && <><dt>definition</dt><dd>{full}</dd></>}
        <dt>role</dt><dd>{relationLabel(t.r, scheme)}{head && !isPunct(head) ? <> of <span className="greek">{head.f}</span></> : ''}</dd>
        <dt>status</dt><dd>{known ? 'known' : `strength ${str}/${KNOWN}`}</dd>
      </dl>
      <div className="row">
        {known
          ? <button className="btn small" onClick={() => setKnown(t.l, false)}>I don't know this word</button>
          : <button className="btn small" onClick={() => setKnown(t.l, true)}>I know this word</button>}
      </div>
    </div>
  );
}

function SentenceSheet({ s, p, scheme, onClose }: { s: Sentence; p: Passage; scheme: 'agdt' | 'proiel'; onClose: () => void }) {
  const [showTr, setShowTr] = useState(false);
  const structure = useMemo(() => analyse(s), [s]);
  const tr = p.tr?.[s.id] ?? p.tr?.[s.ref];
  const KIND: Record<string, string> = { main: 'main clause', subordinate: 'subordinate clause', participle: 'participle', infinitive: 'infinitive' };
  return (
    <div className="sheet">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="small muted">Structure{s.ref ? ` · ${s.ref}` : ''}</div>
      {structure.clauses.length === 0 && <p className="muted">No verb in this sentence.</p>}
      {structure.clauses.map((c) => (
        <div className="clause" key={c.verb}>
          <div className="kind">{KIND[c.kind]}{c.intro !== undefined ? ` · ${s.t[c.intro].f}` : ''}</div>
          <div className="verb">{s.t[c.verb].f} <span className="detail" style={{ fontFamily: 'var(--ui)' }}>{describe(s.t[c.verb].p)}</span></div>
          <div className="detail">
            {c.subject !== undefined && <>subject <span className="greek">{s.t[c.subject].f}</span>{c.objects.length ? ' · ' : ''}</>}
            {c.objects.length > 0 && <>object{c.objects.length > 1 ? 's' : ''} {c.objects.map((o, i) => <span key={o}><span className="greek">{s.t[o].f}</span>{i < c.objects.length - 1 ? ', ' : ''}</span>)}</>}
            {c.note && <div>{c.note}</div>}
          </div>
        </div>
      ))}
      {structure.particles.length > 0 && (
        <div className="small muted" style={{ marginTop: 6 }}>particles: {structure.particles.map((i) => <span key={i} className="greek">{s.t[i].f} </span>)}
          <span className="muted">· {structure.particles.map((i) => relationLabel(s.t[i].r, scheme)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span></div>
      )}
      {tr ? (
        showTr ? <div className="translation">{tr}</div>
          : <p><button className="btn small" onClick={() => setShowTr(true)}>Show translation</button> <span className="small muted">Make your own attempt first.</span></p>
      ) : <p className="small muted">No translation available for this text yet (see docs/TRANSLATIONS.md).</p>}
    </div>
  );
}
