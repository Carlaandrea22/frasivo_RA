import { useSyncExternalStore } from 'react';
import { Activity, BookOpen, Box, ScanLine } from 'lucide-react';
import { anatomyArea } from './content/anatomy/area';
import { hashSnapshot, resolveRoute, subscribeHash, type RouteDefinition } from './shared/navegacion';
import { baseRoutes } from './shared/navegacion/baseRoutes';
import { PwaInstall, PwaUpdate } from './shared/pwa/PwaControls';
import { Button } from './shared/ui/Button';
import { ContentState } from './shared/ui/ContentState';

const tabs = [
  { id: 'cuerpo', label: 'Cuerpo', icon: ScanLine },
  { id: 'explorar', label: 'Explorar 3D', icon: Box },
  { id: 'practicar', label: 'Practicar', icon: BookOpen },
  { id: 'progreso', label: 'Mi progreso', icon: Activity },
] as const;

const features = import.meta.glob<RouteDefinition[]>('./features/*/routes.ts', { eager: true, import: 'routes' });
const routes: RouteDefinition[] = [
  ...baseRoutes,
  ...Object.values(features).flat(),
];

export default function App() {
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot);
  const match = resolveRoute(routes, hash);
  const body = match?.route.tab === 'cuerpo';

  return (
    <div className="app-shell" data-area={anatomyArea.id}>
      <header className={body ? 'app-header app-header--body' : 'app-header'}>
        <div className="app-brand">
          <img className="app-mark" src="/icon.svg" alt="" width="38" height="38"/>
          <span>LumAR</span>
        </div>
        <div className="app-header-actions">
          <span className="app-area">{anatomyArea.name}</span>
          <PwaInstall/>
        </div>
      </header>
      <PwaUpdate/>

      <main className={`app-main${body ? ' app-main--body' : ''}`}>
        {match ? <match.route.Screen params={match.params}/> : (
          <div className="lumar-page">
            <ContentState state="unavailable" title="Página no disponible">
              <a href="#cuerpo">Volver a Cuerpo</a>
            </ContentState>
          </div>
        )}
      </main>

      <nav className="app-navigation" aria-label="Navegación principal">
        <div className="app-navigation-inner">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant="nav" aria-current={match?.route.tab === id ? 'page' : undefined}
              onClick={() => { window.location.hash = id; }}>
              <Icon size={19} aria-hidden="true"/>
              {label}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}
