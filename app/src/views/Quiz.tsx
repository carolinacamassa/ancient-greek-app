import { useEffect, useMemo, useState } from 'react';
import { useTextDoc } from '../data/context';
import { describe, isPunct, label } from '../greek/morph';
import { getState, quizResult, useLearner } from '../learner/model';
import { buildQuiz, postagPool, type QuizItem } from '../learner/quiz';
import { gradeTranslation, type Grade } from '../llm/claude';
import { href } from '../router';
import type { Sentence, TextDoc } from '../types';

export function Quiz({ textId, passage }: { textId: string; passage: number }) {
  const doc = useTextDoc(textId);
  if (!doc) return <p className="muted">Loading…</p>;
  const p = doc.passages[passage];
  if (!p) return <p className="error">No such passage.</p>;
  return <QuizRun doc={doc} passage={passage} />;
}

function QuizRun({ doc, passage }: { doc: TextDoc; passage: number }) {
  const p = doc.passages[passage];
  const items = useMemo(() => buildQuiz(doc, p, getState(), postagPool(doc)), [doc, p]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const next = passage + 1 < doc.passages.length ? passage + 1 : null;

  if (items.length === 0) {
    return (
      <div className="quiz">
        <h1>Nothing to quiz yet</h1>
        <p className="muted">This passage gave no quiz material. Keep reading.</p>
        <p><a className="btn primary" href={next !== null ? href({ name: 'read', textId: doc.id, passage: next }) : href({ name: 'text', textId: doc.id })}>Continue</a></p>
      </div>
    );
  }
  if (i >= items.length) {
    return (
      <div className="quiz">
        <h1>Done</h1>
        <div className="card"><div className="stat">{score.ok}/{score.n}</div><div className="muted small">correct</div></div>
        <p className="muted small">Wrong answers lowered the strength of those words and, for parses, brought the glosses back for forms of that pattern for a week.</p>
        <div className="row">
          {next !== null && <a className="btn primary" href={href({ name: 'read', textId: doc.id, passage: next })}>Next passage</a>}
          <a className="btn" href={href({ name: 'text', textId: doc.id })}>Back to {doc.title}</a>
        </div>
      </div>
    );
  }
  const item = items[i];
  return (
    <div className="quiz">
      <div className="topbar"><span className="crumb">{p.title} · quiz</span><span className="spacer" /><span className="progress-dots">{i + 1} / {items.length}</span></div>
      <ItemView key={i} item={item} doc={doc} onDone={(ok) => { setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 })); }} onNext={() => setI(i + 1)} />
    </div>
  );
}

function SentenceLine({ s, target, blank }: { s: Sentence; target?: number; blank?: boolean }) {
  return (
    <p className="prompt">
      {s.t.map((t, i) => {
        const space = i + 1 < s.t.length && !isPunct(s.t[i + 1]) ? ' ' : '';
        if (i === target && blank) return <span key={i}><span className="blank">&nbsp;</span>{space}</span>;
        return <span key={i} className={i === target ? 'target' : ''}>{t.f}{space}</span>;
      })}
    </p>
  );
}

function ItemView({ item, doc, onDone, onNext }: { item: QuizItem; doc: TextDoc; onDone: (ok: boolean) => void; onNext: () => void }) {
  const [picked, setPicked] = useState<number | string | null>(null);
  const st = useLearner();
  const answered = picked !== null;

  function pick(v: number | string) {
    if (answered) return;
    setPicked(v);
    let ok = false;
    if (item.kind === 'parse') {
      ok = v === item.answer;
      quizResult({ lemma: item.sentence.t[item.tokenIndex].l, correct: ok, pattern: item.pattern });
    } else if (item.kind === 'agree' || item.kind === 'refer') {
      ok = v === item.answer;
      quizResult({ lemma: item.sentence.t[item.tokenIndex].l, correct: ok });
    } else if (item.kind === 'cloze') {
      ok = v === item.answer;
      quizResult({ lemma: item.lemma, correct: ok, clozeId: item.clozeId });
    }
    onDone(ok);
  }

  if (item.kind === 'parse') {
    const t = item.sentence.t[item.tokenIndex];
    return (
      <div>
        <h2>Parse this form</h2>
        <SentenceLine s={item.sentence} target={item.tokenIndex} />
        <p className="muted small">{t.l !== t.f && <>{t.f} is from <span className="greek" style={{ fontFamily: 'var(--greek)' }}>{t.l}</span>. </>}Which analysis fits here?</p>
        <div className="options">
          {item.options.map((o) => (
            <button key={o} className={`option${answered ? (o === item.answer ? ' correct' : o === picked ? ' wrong' : '') : ''}`} onClick={() => pick(o)}>{label(o)}</button>
          ))}
        </div>
        {answered && <Feedback ok={picked === item.answer} text={picked === item.answer ? describe(item.answer) : `It is ${describe(item.answer)}.`} onNext={onNext} />}
      </div>
    );
  }
  if (item.kind === 'agree' || item.kind === 'refer') {
    const t = item.sentence.t[item.tokenIndex];
    return (
      <div>
        <h2>{item.kind === 'agree' ? 'What does this participle agree with?' : 'What does this pronoun refer to?'}</h2>
        <SentenceLine s={item.sentence} target={item.tokenIndex} />
        <p className="muted small">{t.f}: {describe(t.p)}</p>
        <div className="options">
          {item.options.map((o) => (
            <button key={o} className={`option greek${answered ? (o === item.answer ? ' correct' : o === picked ? ' wrong' : '') : ''}`} onClick={() => pick(o)}>
              {item.sentence.t[o].f} <span className="small muted" style={{ fontFamily: 'var(--ui)' }}>{label(item.sentence.t[o].p)}</span>
            </button>
          ))}
        </div>
        {answered && <Feedback ok={picked === item.answer} text={picked === item.answer ? '' : `It goes with ${item.sentence.t[item.answer].f}.`} onNext={onNext} />}
      </div>
    );
  }
  if (item.kind === 'cloze') {
    return (
      <div>
        <h2>{item.clozeId ? 'Review' : 'Fill the gap'}</h2>
        <SentenceLine s={item.sentence} target={item.tokenIndex} blank={!answered} />
        <p className="muted small">Which word was here? ({describe(item.sentence.t[item.tokenIndex].p)})</p>
        <div className="options">
          {item.options.map((o) => (
            <button key={o} className={`option greek${answered ? (o === item.answer ? ' correct' : o === picked ? ' wrong' : '') : ''}`} onClick={() => pick(o)}>{o}</button>
          ))}
        </div>
        {answered && <Feedback ok={picked === item.answer} text={picked === item.answer ? '' : `${item.answer}`} onNext={onNext} />}
      </div>
    );
  }
  if (item.kind !== 'translate') return null;
  return <TranslateView item={item} apiKey={st.settings.apiKey} model={st.settings.model} onDone={onDone} onNext={onNext} docTitle={doc.title} />;
}

function Feedback({ ok, text, onNext }: { ok: boolean; text: string; onNext: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') onNext(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);
  return (
    <div>
      <p className={`feedback ${ok ? 'ok' : 'bad'}`}>{ok ? 'Right.' : 'Not quite.'} {text}</p>
      <button className="btn primary" onClick={onNext}>Next</button>
    </div>
  );
}

function TranslateView({ item, apiKey, model, onDone, onNext, docTitle }: {
  item: Extract<QuizItem, { kind: 'translate' }>; apiKey: string; model: string; onDone: (ok: boolean) => void; onNext: () => void; docTitle: string;
}) {
  const [attempt, setAttempt] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const greek = item.sentence.t.map((t) => t.f).join(' ');

  async function submit() {
    if (!attempt.trim()) return;
    if (!apiKey) { setRevealed(true); return; }
    setBusy(true); setErr(null);
    try {
      const g = await gradeTranslation({ apiKey, model, greek, reference: item.reference, attempt });
      setGrade(g);
      const ok = g.score === 2;
      for (const t of item.sentence.t) if (!isPunct(t) && 'nva'.includes(t.p[0])) quizResult({ lemma: t.l, correct: ok || g.score === 1 });
      onDone(ok);
    } catch (e) {
      setErr(String(e));
      setRevealed(true);
    } finally { setBusy(false); }
  }

  function selfAssess(ok: boolean) {
    for (const t of item.sentence.t) if (!isPunct(t) && 'nva'.includes(t.p[0])) quizResult({ lemma: t.l, correct: ok });
    onDone(ok);
    onNext();
  }

  return (
    <div>
      <h2>Translate</h2>
      <SentenceLine s={item.sentence} />
      <p className="muted small">From {docTitle}. Meaning counts, not wording.</p>
      <textarea value={attempt} onChange={(e) => setAttempt(e.target.value)} placeholder="Your translation" disabled={!!grade || revealed} />
      {!grade && !revealed && (
        <p><button className="btn primary" onClick={submit} disabled={busy || !attempt.trim()}>{busy ? 'Grading…' : apiKey ? 'Grade with Claude' : 'Compare with the reference'}</button></p>
      )}
      {err && <p className="error small">Grading failed ({err}). Compare with the reference instead.</p>}
      {grade && (
        <div>
          <p className={`feedback ${grade.score === 2 ? 'ok' : grade.score === 1 ? '' : 'bad'}`}>{['Wrong.', 'Partly right.', 'Right.'][grade.score]} {grade.comment}</p>
          <div className="translation">{item.reference}</div>
          <p><button className="btn primary" onClick={onNext}>Next</button></p>
        </div>
      )}
      {revealed && !grade && (
        <div>
          <div className="translation">{item.reference}</div>
          <p className="small muted">The reference may cover more than this sentence. Did you get the meaning?</p>
          <div className="row">
            <button className="btn" onClick={() => selfAssess(true)}>Yes</button>
            <button className="btn" onClick={() => selfAssess(false)}>No</button>
          </div>
        </div>
      )}
    </div>
  );
}
