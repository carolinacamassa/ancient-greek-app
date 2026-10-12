import { useRef, useState } from 'react';
import { useData } from '../data/context';
import { activePatterns, coverage, dueCloze, exportState, importState, knownCount, resetState, updateSettings, useLearner, KNOWN } from '../learner/model';

export function Progress() {
  const { manifest } = useData();
  const st = useLearner();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const known = knownCount(st);
  const learning = Object.values(st.lemmas).filter((x) => x.s > 0 && x.s < KNOWN).length;
  const due = dueCloze(st).length;
  const patterns = activePatterns(st);
  const passagesRead = Object.keys(st.read).length;

  function download() {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `greek-reader-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => { try { importState(t); setMsg('Imported.'); } catch (err) { setMsg(`Import failed: ${err}`); } });
  }

  return (
    <div>
      <h1>Progress</h1>
      <div className="card">
        <div className="row" style={{ gap: 24 }}>
          <div><div className="stat">{known}</div><div className="muted small">words known</div></div>
          <div><div className="stat">{learning}</div><div className="muted small">words in progress</div></div>
          <div><div className="stat">{passagesRead}</div><div className="muted small">passages read</div></div>
          <div><div className="stat">{due}</div><div className="muted small">reviews due</div></div>
        </div>
        <p className="small muted">Reviews due are cloze items on words you looked up; they are added to the quiz after the next passage you finish in the same text.</p>
      </div>

      <h2>How much of each text you can read</h2>
      {manifest.texts.map((t) => {
        const c = coverage(st, t.freq);
        return (
          <div key={t.id} className="card">
            <div className="row"><strong style={{ flex: 1 }}>{t.author}, <em>{t.title}</em></strong><span>{Math.round(c.ratio * 100)}%</span></div>
            <div className="bar"><div style={{ width: `${c.ratio * 100}%` }} /></div>
            <div className="small muted">{c.known.toLocaleString()} of {c.total.toLocaleString()} words</div>
          </div>
        );
      })}

      {patterns.length > 0 && (
        <>
          <h2>Patterns being re-glossed</h2>
          <div className="card">
            <p className="small muted" style={{ marginTop: 0 }}>You missed these in a parse quiz, so glosses are shown again on every word of this shape until the date given.</p>
            <ul>{patterns.map((p) => <li key={p.mask}>{p.label} <span className="muted small">until {new Date(p.until).toLocaleDateString()}</span></li>)}</ul>
          </div>
        </>
      )}

      <h2>Settings</h2>
      <div className="card">
        <label className="field">Default gloss display
          <select value={st.settings.glossMode} onChange={(e) => updateSettings({ glossMode: e.target.value as 'auto' | 'all' | 'none' })}>
            <option value="auto">as needed (fades as you learn)</option>
            <option value="all">always show all glosses</option>
            <option value="none">never show glosses</option>
          </select>
        </label>
        <label className="field">Read-aloud voice
          <select value={st.settings.voice} onChange={(e) => updateSettings({ voice: e.target.value as 'espeak' | 'system' })}>
            <option value="espeak">reconstructed pronunciation (eSpeak NG, offline)</option>
            <option value="system">this device's Modern Greek voice</option>
          </select>
        </label>
        <p className="small muted">The reconstructed voice keeps vowel length, the aspirates θ φ χ and the pitch accent, and says η, ει, ι, υ differently; it sounds mechanical. The device voice sounds natural but uses modern pronunciation, and only exists if a Greek voice is installed.</p>
        <label className="field">Reading speed: {st.settings.speechRate.toFixed(2)}×
          <input type="range" min="0.5" max="1.5" step="0.05" value={st.settings.speechRate} onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })} style={{ width: '100%' }} />
        </label>
        <label className="field">Anthropic API key (optional, for grading your translations; stored only in this browser)
          <input type="password" value={st.settings.apiKey} onChange={(e) => updateSettings({ apiKey: e.target.value.trim() })} placeholder="sk-ant-…" autoComplete="off" />
        </label>
        <label className="field">Model
          <input type="text" value={st.settings.model} onChange={(e) => updateSettings({ model: e.target.value.trim() })} />
        </label>
        <p className="small muted">Without a key, translation items show the reference translation for you to judge yourself.</p>
      </div>

      <h2>Your data</h2>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>Everything the app knows about you lives in this browser. Export it to move to another device.</p>
        <div className="row">
          <button className="btn" onClick={download}>Export</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={upload} />
          <button className="btn" onClick={() => { if (confirm('Erase all learning data? This cannot be undone.')) { resetState(); setMsg('Reset.'); } }}>Reset</button>
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>
      <p className="small muted">Corpus built {manifest.generated}: {manifest.corpusTokens.toLocaleString()} words, {manifest.corpusLemmas.toLocaleString()} lemmas.</p>
    </div>
  );
}
