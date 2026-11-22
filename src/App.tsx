import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Activity, BookOpen, Box, ScanLine } from 'lucide-react';
import { anatomyArea } from './content/anatomy/area';
import { RecordatorioRacha } from './features/progreso/mascota/RecordatorioRacha';
import { QuickInvitation, QuickPractice } from './features/practicaRapida/QuickPractice';
import { chooseQuickActivity, type QuickActivity } from './features/practicaRapida/quickActivity';
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

const quickHash = '#practicar/rapida';
const quickInviteCooldown = 5 * 60_000;
const quickInviteProbability = .2;

export default function App() {
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot);
  const match = resolveRoute(routes, hash);
  const atQuick = hash === quickHash;
  const tab = atQuick ? 'practicar' : match?.route.tab;
  const body = tab === 'cuerpo';
  const path = match?.route.path;
  const canInvite = !!path && (tab !== 'practicar' || path === 'practicar' || path === 'practicar/retos');
  const navigation = useRef({ hash, tab, canInvite });
  const nextInvitation = useRef(0);
  const [offer, setOffer] = useState<{ hash: string; activity: QuickActivity }>();
  const [quick, setQuick] = useState<{ activity: QuickActivity; deadline: number; returnHash: string }>();
  const invitation = offer?.hash === hash ? offer.activity : undefined;

  useEffect(() => {
    const previous = navigation.current;
    navigation.current = { hash, tab, canInvite };
    if (previous.hash === hash) return;
    setOffer(undefined);
    if (previous.hash === quickHash) setQuick(undefined);
    if (tab === 'cuerpo' || !canInvite || !previous.canInvite || previous.tab === tab || document.hidden) return;
    const now = Date.now();
    if (now < nextInvitation.current || Math.random() >= quickInviteProbability) return;
    nextInvitation.current = now + quickInviteCooldown;
    setOffer({ hash, activity: chooseQuickActivity() });
  }, [hash, tab, canInvite]);

  const startQuick = () => {
    if (!invitation) return;
    setOffer(undefined);
    setQuick({ activity: invitation, deadline: Date.now() + invitation.seconds * 1000, returnHash: hash || '#cuerpo' });
    window.location.hash = quickHash;
  };

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
      <RecordatorioRacha pausado={body || tab === 'practicar'} oculto={!!invitation}/>
      {invitation && <QuickInvitation activity={invitation} accept={startQuick} dismiss={() => setOffer(undefined)}/>}

      <main className={`app-main${body ? ' app-main--body' : ''}`}>
        {atQuick ? quick ? <QuickPractice activity={quick.activity} deadline={quick.deadline}
          onExit={() => window.location.replace(quick.returnHash)}/> : <div className="lumar-page">
          <ContentState state="unavailable" title="Práctica rápida finalizada">
            <a href="#practicar">Volver a Practicar</a>
          </ContentState>
        </div> : match ? <match.route.Screen params={match.params}/> : (
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
            <Button key={id} variant="nav" aria-current={tab === id ? 'page' : undefined}
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
