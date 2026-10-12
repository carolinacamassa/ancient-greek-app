import { useEffect, useState } from 'react';

export type Route =
  | { name: 'library' }
  | { name: 'text'; textId: string }
  | { name: 'read'; textId: string; passage: number }
  | { name: 'quiz'; textId: string; passage: number }
  | { name: 'grammar'; noteId?: string }
  | { name: 'alphabet' }
  | { name: 'progress' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'text': return { name: 'text', textId: parts[1] };
    case 'read': return { name: 'read', textId: parts[1], passage: Number(parts[2] ?? 0) };
    case 'quiz': return { name: 'quiz', textId: parts[1], passage: Number(parts[2] ?? 0) };
    case 'grammar': return { name: 'grammar', noteId: parts[1] };
    case 'alphabet': return { name: 'alphabet' };
    case 'progress': return { name: 'progress' };
    default: return { name: 'library' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'library': return '#/';
    case 'text': return `#/text/${r.textId}`;
    case 'read': return `#/read/${r.textId}/${r.passage}`;
    case 'quiz': return `#/quiz/${r.textId}/${r.passage}`;
    case 'grammar': return r.noteId ? `#/grammar/${r.noteId}` : '#/grammar';
    case 'alphabet': return '#/alphabet';
    case 'progress': return '#/progress';
  }
}

export function go(r: Route) { location.hash = href(r); }

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => { setRoute(parseHash(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
