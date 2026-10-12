import { useEffect, useRef, useState, type ReactElement } from 'react';
import { DIPHTHONGS, LETTERS, MARKS, type AlphabetEntry, type MarkEntry } from '../content/alphabet';
import { useLearner } from '../learner/model';
import { href } from '../router';
import { loadClipIndex, playClip, type Handle } from '../speech';

type Clips = Record<string, { t: number; d: number }>;

export function Alphabet() {
  const st = useLearner();
  const [clips, setClips] = useState<Clips | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const handle = useRef<Handle | null>(null);
  useEffect(() => { loadClipIndex('alphabet').then(setClips); return () => { handle.current?.stop(); }; }, []);

  async function play(key: string) {
    if (playing === key) { handle.current?.stop(); handle.current = null; setPlaying(null); return; }
    handle.current?.stop();
    const c = clips?.[key];
    if (!c) return;
    setPlaying(key); setErr(null);
    try {
      handle.current = await playClip('alphabet.mp3', c.t, c.d, st.settings.speechRate, () => setPlaying((p) => (p === key ? null : p)));
    } catch (e) { setPlaying(null); setErr(String(e)); }
  }

  const Btn = ({ k, label }: { k: string; label: string }) => (
    <button className={`btn small${playing === k ? ' primary' : ''}`} onClick={() => play(k)} disabled={!clips?.[k]} title={label}>
      {playing === k ? '■' : '▶'} <span className="greek" style={{ fontFamily: 'var(--greek)' }}>{label}</span>
    </button>
  );

  return (
    <div className="alphabet">
      <div className="topbar"><a className="crumb" href={href({ name: 'grammar' })}>‹ Grammar</a></div>
      <h1>Alphabet and pronunciation</h1>
      <p className="muted">
        Twenty-four letters, seven vowels (α ε η ι ο υ ω), no letter for h. The sounds given are the ones the recordings use, the school pronunciation of Italian and German classrooms; where classical Attic differed, the entry says so. Press a name or a word to hear it.
      </p>
      {err && <p className="error small">{err}</p>}
      <p className="small muted">The tag beside each name is the Latin transliteration, what Latin writers used for Greek loanwords and names, which is why ph, th, ch, y, ae and oe look the way they do.</p>
      {LETTERS.map((e) => <LetterRow key={e.id} e={e} Btn={Btn} />)}
      <h2>Diphthongs and the iota subscript</h2>
      <p className="muted small">Two vowels in one syllable. A diaeresis (ϊ ϋ) or a breathing or accent on the first vowel breaks the pair into two syllables.</p>
      {DIPHTHONGS.map((e) => <MarkRow key={e.id} e={e} Btn={Btn} />)}
      <h2>Breathings, accents and other marks</h2>
      <p className="muted small">Every word that begins with a vowel carries a breathing, and nearly every word carries one accent. The marks sit on the vowel; in a diphthong, on its second letter.</p>
      {MARKS.map((e) => <MarkRow key={e.id} e={e} Btn={Btn} />)}
      <p className="small muted" style={{ marginTop: 24 }}>Reading speed follows the slider in <a href={href({ name: 'progress' })}>Progress › Settings</a>.</p>
    </div>
  );
}

function LetterRow({ e, Btn }: { e: AlphabetEntry; Btn: (p: { k: string; label: string }) => ReactElement }) {
  return (
    <div className="card letter">
      <div className="row">
        <span className="glyph">{e.letter}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row"><strong>{e.name}</strong><span className="badge latin">{e.latin}</span></div>
          <div>{e.sound}</div>
          {e.note && <div className="small muted">{e.note}</div>}
        </div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <Btn k={`${e.id}.name`} label={e.greekName} />
        <Btn k={`${e.id}.ex`} label={e.example} />
        <span className="small muted">{e.exampleGloss}</span>
      </div>
    </div>
  );
}

function MarkRow({ e, Btn }: { e: MarkEntry; Btn: (p: { k: string; label: string }) => ReactElement }) {
  return (
    <div className="card letter">
      <div className="row">
        <span className="glyph">{e.sign}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{e.name}</strong>
          <div>{e.sound}</div>
          {e.note && <div className="small muted">{e.note}</div>}
        </div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <Btn k={`${e.id}.ex`} label={e.example} />
        <span className="small muted">{e.exampleGloss}</span>
      </div>
    </div>
  );
}
