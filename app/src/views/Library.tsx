import { useData } from '../data/context';
import { coverage, knownCount, useLearner } from '../learner/model';
import { href } from '../router';
import type { ManifestText } from '../types';

const STAGES: Record<number, { title: string; blurb: string }> = {
  1: { title: 'Start here', blurb: 'Short, simple, authentic. Morphology and the core vocabulary come from these.' },
  2: { title: 'Then Plutarch', blurb: 'Long periodic sentences; the participle chains start to matter.' },
  3: { title: 'Then Plato', blurb: 'The target. The progress figure below is computed against the Euthyphro.' },
};

export function Library() {
  const { manifest } = useData();
  const st = useLearner();
  const target = manifest.texts.find((t) => t.id === 'plato-euthyphro');
  const cov = target ? coverage(st, target.freq) : null;
  const known = knownCount(st);
  return (
    <div>
      <h1>Greek Reader</h1>
      <div className="card">
        <div className="row">
          <div><div className="stat">{known}</div><div className="muted small">words known</div></div>
          {cov && <div><div className="stat">{Math.round(cov.ratio * 100)}%</div><div className="muted small">of the Euthyphro readable without help</div></div>}
        </div>
        {cov && <div className="bar"><div style={{ width: `${cov.ratio * 100}%` }} /></div>}
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          A word counts as known once you have read it several times without tapping it, or answered a quiz on it. Tapping a gloss brings it back.
        </p>
      </div>
      <a className="card clickable" href={href({ name: 'alphabet' })} style={{ display: 'block', color: 'inherit' }}>
        <h3>Alphabet and pronunciation</h3>
        <p className="muted small" style={{ margin: '4px 0 0' }}>The letters, the diphthongs, the breathings and accents, each with a recording. Ten minutes before the first fable.</p>
      </a>
      {[1, 2, 3].map((stage) => (
        <section key={stage}>
          <h2>{STAGES[stage].title}</h2>
          <p className="muted small" style={{ marginTop: 0 }}>{STAGES[stage].blurb}</p>
          {manifest.texts.filter((t) => t.stage === stage).map((t) => <TextCard key={t.id} t={t} />)}
        </section>
      ))}
    </div>
  );
}

function TextCard({ t }: { t: ManifestText }) {
  const st = useLearner();
  const cov = coverage(st, t.freq);
  const read = Object.keys(st.read).filter((id) => id.startsWith(t.id + ':')).length;
  return (
    <a className="card clickable" href={href({ name: 'text', textId: t.id })} style={{ display: 'block', color: 'inherit' }}>
      <div className="row">
        <h3 style={{ flex: 1 }}>{t.author}, <em>{t.title}</em></h3>
        {t.optional && <span className="badge">optional</span>}
        {t.analysis === 'auto' && <span className="badge warn">auto parse</span>}
      </div>
      <p className="muted small" style={{ margin: '4px 0 6px' }}>{t.description}</p>
      <div className="bar"><div style={{ width: `${cov.ratio * 100}%` }} /></div>
      <div className="row small muted">
        <span>{Math.round(cov.ratio * 100)}% of words known</span>
        <span>·</span>
        <span>{read}/{t.passages} passages read</span>
        <span>·</span>
        <span>{t.tokens.toLocaleString()} words, {t.lemmas.toLocaleString()} lemmas</span>
      </div>
    </a>
  );
}
