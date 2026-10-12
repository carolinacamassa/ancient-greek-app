import { useEffect, useRef } from 'react';
import { NOTES } from '../content/grammar';
import { useLearner } from '../learner/model';
import { href } from '../router';

export function Grammar({ noteId }: { noteId?: string }) {
  const st = useLearner();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (noteId) document.getElementById(`note-${noteId}`)?.scrollIntoView({ block: 'start' });
  }, [noteId]);
  const unlocked = NOTES.filter((n) => st.notesShown[n.id]);
  const locked = NOTES.filter((n) => !st.notesShown[n.id]);
  return (
    <div ref={ref}>
      <h1>Grammar reference</h1>
      <p className="muted">
        Every note here appears in the reader at the point where its construction has come up often enough to matter. You can also read ahead: nothing is locked, the order below only reflects what you have met.
      </p>
      <p><a className="btn" href={href({ name: 'alphabet' })}>Alphabet and pronunciation ›</a></p>
      {unlocked.length > 0 && <h2>Met in your reading</h2>}
      {unlocked.map((n) => <Note key={n.id} id={n.id} open={n.id === noteId} count={st.constructionCounts[n.detector] ?? 0} />)}
      {locked.length > 0 && <h2>{unlocked.length ? 'Not yet met' : 'All notes'}</h2>}
      {locked.map((n) => <Note key={n.id} id={n.id} open={n.id === noteId} count={st.constructionCounts[n.detector] ?? 0} />)}
    </div>
  );
}

function Note({ id, open, count }: { id: string; open: boolean; count: number }) {
  const n = NOTES.find((x) => x.id === id)!;
  return (
    <details className="card note" id={`note-${id}`} open={open}>
      <summary>
        <strong>{n.title}</strong>
        <span className="muted small"> · seen {count}×{count < n.threshold ? ` (note appears at ${n.threshold})` : ''}</span>
      </summary>
      <p className="latin">{n.latin}</p>
      {n.body.map((b, i) => <p key={i}>{b}</p>)}
      <p className="small muted">{n.tags.join(', ')}</p>
    </details>
  );
}
