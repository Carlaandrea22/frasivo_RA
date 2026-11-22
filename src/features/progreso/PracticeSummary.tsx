import { ArrowRight } from 'lucide-react';
import { casos } from '../../content/casos/rodilla';
import { clinicalModeLabels } from '../../content/casos/sessionTypes';
import { retoModeLabels, retoTypeLabels } from '../../content/types';
import type { PracticeEvent, ReasoningText } from '../../shared/progreso';
import { retoTuvoReintentos, rutaResultado } from '../retos/intentos';
import { challengeCatalog, clinicalCatalog, practiceGroup, practiceGroupLabels, practiceId, practiceTitle } from './practiceProgress';

const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

function PracticeMetrics({ correct, errors, hints, assisted = 0 }: PracticeEvent) {
  return <ul className="progress-metrics" aria-label="Resultado">
    <li data-tone="good"><strong>{correct + assisted}</strong> {correct + assisted === 1 ? 'acierto' : 'aciertos'}</li>
    {assisted > 0 && <li data-tone="assist"><strong>{assisted}</strong> {assisted === 1 ? 'asistida' : 'asistidas'}</li>}
    <li data-tone={errors ? 'review' : undefined}><strong>{errors}</strong> para revisar</li>
    {hints > 0 && <li><strong>{hints}</strong> {hints === 1 ? 'pista' : 'pistas'}</li>}
  </ul>;
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

export function PracticeSummary({ event, history = false }: { event: PracticeEvent; history?: boolean }) {
  const id = practiceId(event);
  const item = clinicalCatalog.get(id);
  const reto = challengeCatalog.get(id);
  const group = practiceGroup(event);
  const route = item?.kind === 'investigation' && event.context?.kind === 'caso' ? event.context : undefined;
  const mode = event.context?.kind === 'reto' ? retoModeLabels[event.context.mode] : undefined;
  const type = reto ? retoTypeLabels[reto.tipo] : item && clinicalModeLabels[item.kind];
  const retried = reto ? retoTuvoReintentos(reto, event) : event.retried;
  const Heading = history ? 'h3' : 'h2';

  return <>
    <div className="progress-entry-heading">
      <Heading>{practiceTitle(event)}</Heading>
      <time dateTime={event.timestamp}>{fecha.format(new Date(event.timestamp))}</time>
    </div>
    {(group || mode || event.quick) && <p className="progress-entry-type">
      {[group && practiceGroupLabels[group], type, event.quick ? 'Práctica rápida' : mode].filter(Boolean).join(' · ')}
    </p>}
    <PracticeMetrics {...event}/>
    {retried && <p className="progress-caption">
      {group === 'challenge' ? 'Incluye respuestas reintentadas' : event.errors ? 'Se volvió a intentar' : 'Resuelto en un reintento'}
    </p>}
    {reto && mode && <div><a className="progress-result-link" href={rutaResultado(reto.id, event.id)}>
      Ver resultado del reto <ArrowRight size={14}/>
    </a></div>}
    {item?.kind === 'investigation' && route && <details>
      <summary>Ruta de investigación</summary>
      <ol>{route.questionIds.map(questionId => {
        const node = item.nodes.find(question => question.id === questionId);
        return node && <li key={node.id}><strong>{node.promptEs}</strong><p>{node.patientEs}</p></li>;
      })}</ol>
      <p>Hipótesis elegida · {item.hypotheses.find(option => option.id === route.hypothesisId)?.textEs ?? route.hypothesisId}</p>
    </details>}
    {history && event.reasoning && <details>
      <summary>Ficha de razonamiento</summary>
      <h4>Texto inicial del estudiante</h4>
      <Reasoning text={event.reasoning.original}/>
      {event.reasoning.suggestions.length > 0 && <>
        <h4>Sugerencias del tutor</h4>
        <ul>{event.reasoning.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
      </>}
      {event.reasoning.revised && <>
        <h4>Revisión del estudiante</h4>
        <Reasoning text={event.reasoning.revised}/>
      </>}
    </details>}
  </>;
}
