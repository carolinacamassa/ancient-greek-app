import { DataProvider } from './data/context';
import { href, useRoute } from './router';
import { Library } from './views/Library';
import { TextPage } from './views/TextPage';
import { Reader } from './views/Reader';
import { Quiz } from './views/Quiz';
import { Grammar } from './views/Grammar';
import { Progress } from './views/Progress';

export default function App() {
  const route = useRoute();
  const tab = route.name === 'grammar' ? 'grammar' : route.name === 'progress' ? 'progress' : 'library';
  return (
    <DataProvider>
      <div className="app">
        <main className="main">
          {route.name === 'library' && <Library />}
          {route.name === 'text' && <TextPage textId={route.textId} />}
          {route.name === 'read' && <Reader key={`${route.textId}/${route.passage}`} textId={route.textId} passage={route.passage} />}
          {route.name === 'quiz' && <Quiz key={`${route.textId}/${route.passage}`} textId={route.textId} passage={route.passage} />}
          {route.name === 'grammar' && <Grammar noteId={route.noteId} />}
          {route.name === 'progress' && <Progress />}
        </main>
        <nav className="tabs">
          <a className={tab === 'library' ? 'on' : ''} href={href({ name: 'library' })}>Read</a>
          <a className={tab === 'grammar' ? 'on' : ''} href={href({ name: 'grammar' })}>Grammar</a>
          <a className={tab === 'progress' ? 'on' : ''} href={href({ name: 'progress' })}>Progress</a>
        </nav>
      </div>
    </DataProvider>
  );
}
