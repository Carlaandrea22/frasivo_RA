import { useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, History, Trophy } from 'lucide-react';
import { estructuras } from '../../content/anatomy/catalogo';
import { casos } from '../../content/casos/rodilla';
import { clinicalCases } from '../../content/casos/session';
import { retos } from '../../content/ejercicios/retos';
import { getProgress, subscribeProgress, type PracticeEvent, type ReasoningText } from '../../shared/progreso';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { MascotaProgreso } from './mascota/MascotaProgreso';
import './progreso.css';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });
const practiceCatalog = new Map([
  ...retos.map(item => ({ id: item.id, title: item.titulo })),
  ...casos.map(item => ({ id: item.id, title: item.titulo })),
  ...clinicalCases.map(item => ({ id: item.id, title: item.titleEs })),
].map(item => [item.id, item.title]));
const clinicalCatalog = new Map(clinicalCases.map(item => [item.id, item]));
const dateOf = (timestamp: string) => fecha.format(new Date(timestamp));

function PracticeMetrics({ correct, errors, hints, assisted = 0 }: {
  correct: number;
  errors: number;
  hints: number;
  assisted?: number;
}) {
  return <ul className="progress-metrics" aria-label="Resultado">
    <li data-tone="good"><strong>{correct}</strong> {correct === 1 ? 'acierto' : 'aciertos'}</li>
    {assisted > 0 && <li data-tone="assist"><strong>{assisted}</strong> {assisted === 1 ? 'asistida' : 'asistidas'}</li>}
    <li data-tone={errors ? 'review' : undefined}><strong>{errors}</strong> para revisar</li>
    {hints > 0 && <li><strong>{hints}</strong> {hints === 1 ? 'pista' : 'pistas'}</li>}
  </ul>;
}

function PracticeSummary({ event }: { event: PracticeEvent }) {
  const id = event.activityId ?? event.itemId;
  const item = clinicalCatalog.get(id);
  const route = item?.kind === 'investigation' && event.context?.kind === 'caso' ? event.context : undefined;

  return <>
    <div className="progress-entry-heading">
      <h2>{practiceCatalog.get(id) ?? 'Actividad registrada'}</h2>
      <time dateTime={event.timestamp}>{dateOf(event.timestamp)}</time>
    </div>
    <PracticeMetrics {...event}/>
    {item?.kind === 'investigation' && route && <details>
      <summary>Ruta de investigación</summary>
      <ol>{route.questionIds.map(questionId => {
        const node = item.nodes.find(question => question.id === questionId);
        return node && <li key={node.id}><strong>{node.promptEs}</strong><p>{node.patientEs}</p></li>;
      })}</ol>
      <p>Hipótesis elegida · {item.hypotheses.find(option => option.id === route.hypothesisId)?.textEs ?? route.hypothesisId}</p>
    </details>}
  </>;
}

export function Progreso() {
  const { events, legacy } = useSyncExternalStore(subscribeProgress, getProgress);
  const consulted = new Set(events.filter(event => event.kind === 'consultation').map(event => event.itemId));
  const practices = events.filter(event => event.kind === 'practice');
  const performance = events.filter(event => event.kind === 'demonstration');
  const available = estructuras.filter(item => consulted.has(item.id));
  const legacyTerms = Object.keys(legacy?.words ?? {}).length;
  const legacyCorrect = Object.values(legacy?.words ?? {}).reduce((total, word) => total + word.correct, 0);
  const correct = practices.reduce((total, practice) => total + practice.correct, legacyCorrect);
  const last = practices.at(-1);
  const stats = [
    { label: 'Estructuras consultadas', count: consulted.size, Icon: BookOpen },
    { label: 'Prácticas realizadas', count: practices.length, Icon: ClipboardList },
    { label: 'Desempeños demostrados', count: performance.length, Icon: Trophy },
  ];

  return <section className="lumar-page progress-page">
    <Card className="progress-overview">
      <header>
        <div><h1>Mi progreso</h1><p className="lumar-subtitle">Tu actividad y resultados de práctica.</p></div>
        <a className="button button--primary lumar-link" href="#progreso/practicas">Mis prácticas <ArrowRight size={17}/></a>
      </header>
      <ul className="progress-stats" aria-label="Mi actividad">
        {stats.map(({ label, count, Icon }) => <li key={label}>
          <Icon size={17} aria-hidden="true"/><strong>{count}</strong><span>{label}</span>
        </li>)}
      </ul>
    </Card>
    <MascotaProgreso aciertos={correct}/>
    {last && <Card className="progress-entry">
      <p className="progress-caption"><History size={16} aria-hidden="true"/> Última práctica registrada</p>
      <PracticeSummary event={last}/>
    </Card>}
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

function Reasoning({ text }: { text: ReasoningText }) {
  const hypothesis = casos.flatMap(item => [item.hipotesis.correcta, ...item.hipotesis.alternativas])
    .find(item => item.id === text.hypothesisId)?.texto ?? text.hypothesisId;
  return <dl className="progreso-ficha">
    <dt>Resumen</dt><dd>{text.summary}</dd>
    <dt>Hipótesis</dt><dd>{hypothesis}</dd>
    <dt>Hallazgos</dt><dd>{text.evidence}</dd>
    <dt>Información por investigar</dt><dd>{text.missingInformation}</dd>
  </dl>;
}

export function Practicas() {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const practices = events.filter(event => event.kind === 'practice').sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return <section className="lumar-page progress-page">
    <header className="progress-history-heading">
      <a className="button button--text lumar-link" href="#progreso"><ArrowLeft size={16}/> Mi progreso</a>
      <h1>Mis prácticas</h1>
    </header>
    {practices.length ? practices.map(event => {
      return <Card key={event.id} className="progress-entry">
        <PracticeSummary event={event}/>
        {event.reasoning && <details>
          <summary>Ficha de razonamiento</summary>
          <h3>Texto inicial del estudiante</h3>
          <Reasoning text={event.reasoning.original}/>
          {event.reasoning.suggestions.length > 0 && <>
            <h3>Sugerencias del tutor</h3>
            <ul>{event.reasoning.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
          </>}
          {event.reasoning.revised && <>
            <h3>Revisión del estudiante</h3>
            <Reasoning text={event.reasoning.revised}/>
          </>}
        </details>}
      </Card>;
    }) : <ContentState state="empty" title="Todavía no tienes prácticas registradas">
      <p><a href="#practicar">Ir a Practicar</a></p>
    </ContentState>}
  </section>;
}
