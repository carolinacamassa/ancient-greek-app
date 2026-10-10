import { useData, useTextDoc } from '../data/context';
import { coverage, useLearner } from '../learner/model';
import { href } from '../router';
import { isPunct } from '../greek/morph';

export function TextPage({ textId }: { textId: string }) {
  const { manifest } = useData();
  const meta = manifest.texts.find((t) => t.id === textId);
  const doc = useTextDoc(textId);
  const st = useLearner();
  if (!meta) return <p className="error">Unknown text.</p>;
  const cov = coverage(st, meta.freq);
  const firstUnread = doc ? Math.max(0, doc.passages.findIndex((p) => !st.read[p.id])) : 0;
  return (
    <div>
      <div className="topbar"><a className="crumb" href={href({ name: 'library' })}>‹ Library</a></div>
      <h1>{meta.author}, <em>{meta.title}</em></h1>
      <p className="muted">{meta.description}</p>
      <div className="row small muted">
        <span>{meta.dialect}</span><span>·</span>
        <span>{meta.analysis === 'manual' ? 'hand-annotated syntax' : 'automatic parse (syntax roughly 80% accurate)'}</span>
      </div>
      <div className="bar"><div style={{ width: `${cov.ratio * 100}%` }} /></div>
      <p className="small muted">{Math.round(cov.ratio * 100)}% of this text's words are known to you ({cov.known.toLocaleString()} of {cov.total.toLocaleString()}).</p>
      {doc && (
        <p><a className="btn primary" href={href({ name: 'read', textId, passage: firstUnread })}>
          {Object.keys(st.read).some((k) => k.startsWith(textId + ':')) ? 'Continue reading' : 'Start reading'}
        </a></p>
      )}
      {!doc && <p className="muted">Loading text…</p>}
      {doc && (
        <ul className="plist">
          {doc.passages.map((p, i) => {
            const words = p.s.reduce((n, s) => n + s.t.filter((t) => !isPunct(t)).length, 0);
            const incipit = p.s[0]?.t.filter((t) => !isPunct(t)).slice(0, 6).map((t) => t.f).join(' ');
            return (
              <li key={p.id} className={st.read[p.id] ? 'done' : ''}>
                <a className="title" href={href({ name: 'read', textId, passage: i })} style={{ color: 'inherit' }}>
                  {p.title} <span className="muted small">· {words} words</span>
                  <span className="incipit">{incipit}…</span>
                </a>
                {st.read[p.id] ? <span className="badge">read</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      {doc && (
        <p className="small muted" style={{ marginTop: 24 }}>
          Text and annotation: <a href={doc.source.url}>{doc.source.name}</a> ({doc.source.license}).
          {doc.translation && <> Translation: <a href={doc.translation.url}>{doc.translation.name}</a> ({doc.translation.license}).</>}
        </p>
      )}
    </div>
  );
}
