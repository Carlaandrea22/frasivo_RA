import { useSyncExternalStore } from 'react';
import { ArrowRight, BookOpen, ClipboardList, History, Target, Trophy } from 'lucide-react';
import { estructuras } from '../../content/anatomy/catalogo';
import type { RouteProps } from '../../shared/navegacion';
import { getProgress, subscribeProgress, type PracticeEvent } from '../../shared/progreso';
import { useRacha } from '../../shared/progreso/useRacha';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { MascotaProgreso } from './mascota/MascotaProgreso';
import { PracticeActivity } from './PracticeActivity';
import { PracticeFormatSelect, progressHref } from './PracticeFormatSelect';
import { PracticeSummary } from './PracticeSummary';
import { practiceFormat, practiceProgress, readPracticeFormat } from './practiceProgress';
import './progreso.css';

export function Progreso({ params }: RouteProps) {
  const { events, legacy } = useSyncExternalStore(subscribeProgress, getProgress);
  const racha = useRacha(events);
  const format = readPracticeFormat(params.formato);
  const statsSummary = practiceProgress(events, format);
  const consulted = new Set(events.filter(event => event.kind === 'consultation').map(event => event.itemId));
  const available = estructuras.filter(item => consulted.has(item.id));
  const legacyTerms = Object.keys(legacy?.words ?? {}).length;
  const last = events.filter((event): event is PracticeEvent =>
    event.kind === 'practice' && (format === 'all' || practiceFormat(event) === format)).at(-1);
  const stats = [
    { label: 'Estructuras consultadas', value: consulted.size, Icon: BookOpen },
    { label: 'Casos clínicos realizados', value: statsSummary.clinical, Icon: ClipboardList },
    { label: 'Retos de anatomía realizados', value: statsSummary.challenge, Icon: Target },
    { label: 'Calificaciones perfectas', value: `${statsSummary.perfectRate}%`, Icon: Trophy,
      detail: `${statsSummary.perfect} de ${statsSummary.completed} prácticas al primer intento` },
  ];

  return <section className="lumar-page progress-page">
    <MascotaProgreso {...racha}/>
    <Card className="progress-overview">
      <header>
        <div><h1>Mi progreso</h1><p className="lumar-subtitle">Tu actividad y resultados de práctica.</p></div>
        <a className="button button--primary lumar-link" href={progressHref('history', format)}>Mis prácticas <ArrowRight size={17}/></a>
      </header>
      <PracticeFormatSelect format={format} counts={statsSummary.formats}
        onChange={value => window.location.replace(progressHref('overview', value))}/>
      <ul className="progress-stats" aria-label="Mi actividad">
        {stats.map(({ label, value, detail, Icon }) => <li key={label}>
          <Icon size={17} aria-hidden="true"/><strong>{value}</strong><span>{label}</span>
          {detail && <small>{detail}</small>}
        </li>)}
      </ul>
    </Card>
    {import.meta.env.MODE === 'push-test' && <div>
      <a className="button button--secondary lumar-link" href="#progreso/notificaciones">Prueba de notificaciones</a>
    </div>}
    {last && <Card className="progress-entry">
      <p className="progress-caption"><History size={16} aria-hidden="true"/> Última práctica registrada</p>
      <PracticeSummary event={last}/>
    </Card>}
    <PracticeActivity modes={statsSummary.modes} recommendation={statsSummary.recommendation} format={format}/>
    {available.length ? <Card className="progress-entry">
      <h2>Estructuras consultadas</h2>
      <div className="progress-consulted">{available.map(item => <a key={item.id} href={`#explorar/estructura/${item.id}`}>{item.nombreEs}<ArrowRight size={14}/></a>)}</div>
    </Card> : <ContentState state="empty" title="Tu primer objetivo">
      <p><a href="#explorar">Explora una estructura anatómica</a> para agregarla a tus consultas.</p>
    </ContentState>}
    {legacy && <Card>
      <h2>Progreso anterior</h2>
      <p>{legacy.points} puntos y {legacyTerms} {legacyTerms === 1 ? 'término' : 'términos'} con historial.</p>
    </Card>}
    <div><a className="button button--text lumar-link" href="#progreso/creditos">Créditos</a></div>
  </section>;
}
