import { useSyncExternalStore } from 'react';
import { estructuras } from '../../content/anatomy/catalogo';
import { casos } from '../../content/casos/rodilla';
import { clinicalCases } from '../../content/casos/session';
import { retos } from '../../content/ejercicios/retos';
import { getProgress, subscribeProgress, type ReasoningText } from '../../shared/progreso';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import './progreso.css';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });
const practiceCatalog = [
  ...retos.map(item => ({ id: item.id, title: item.titulo })),
  ...casos.map(item => ({ id: item.id, title: item.titulo })),
  ...clinicalCases.map(item => ({ id: item.id, title: item.titleEs })),
];

export function Progreso() {
  const { events, legacy } = useSyncExternalStore(subscribeProgress, getProgress);
  const consulted = new Set(events.filter(event => event.kind === 'consultation').map(event => event.itemId));
  const practices = events.filter(event => event.kind === 'practice');
  const performance = events.filter(event => event.kind === 'demonstration');
  const available = estructuras.filter(item => consulted.has(item.id));
  const legacyTerms = Object.keys(legacy?.words ?? {}).length;
  const last = [...practices].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const activity = last && practiceCatalog.find(item => item.id === (last.activityId ?? last.itemId));

  return <section className="lumar-page">
    <header>
      <h1>Mi progreso</h1>
      <p className="lumar-subtitle">En construcción</p>
    </header>
    <Card>
      <h2>Mi actividad</h2>
      <ul>
        <li>Contenido consultado · {consulted.size}</li>
        <li>Prácticas realizadas · {practices.length}</li>
        <li>Desempeños demostrados · {performance.length}</li>
      </ul>
      <a className="button button--primary lumar-link" href="#progreso/practicas">Mis prácticas</a>
    </Card>
    {last && <Card>
      <h2>Última práctica registrada</h2>
      {activity && <p>{activity.title}</p>}
      <p>{last.correct} aciertos · {last.errors} errores · {last.hints} pistas</p>
    </Card>}
    {available.length ? <Card>
      <h2>Consultas recientes</h2>
      {available.map(item => <a key={item.id} href={`#explorar/estructura/${item.id}`}>{item.nombreEs}</a>)}
    </Card> : <ContentState state="empty" title="Tu primer objetivo">
      <p><a href="#explorar">Explora una estructura anatómica</a> para agregarla a tus consultas.</p>
    </ContentState>}
    {legacy && <Card>
      <h2>Progreso anterior</h2>
      <p>{legacy.points} puntos y {legacyTerms} {legacyTerms === 1 ? 'término' : 'términos'} con historial.</p>
    </Card>}
    <div><Button variant="secondary" onClick={() => { window.location.hash = 'progreso/creditos'; }}>Créditos</Button></div>
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
  return <section className="lumar-page">
    <header>
      <h1>Mis prácticas</h1>
      <p className="lumar-subtitle">En construcción</p>
    </header>
    {practices.length ? practices.map(event => {
      const id = event.activityId ?? event.itemId;
      const item = practiceCatalog.find(activity => activity.id === id);
      return <Card key={event.id}>
        <h2>{item?.title ?? 'Actividad registrada'}</h2>
        <time dateTime={event.timestamp}>{fecha.format(new Date(event.timestamp))}</time>
        <p>{event.correct} aciertos · {event.errors} errores · {event.hints} pistas</p>
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
