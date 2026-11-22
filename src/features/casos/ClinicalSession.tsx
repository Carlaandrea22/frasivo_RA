import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
} from 'lucide-react';
import { clinicalCases } from '../../content/casos/session';
import type {
  ClinicalCase,
  MultipleChoiceCase,
  OrderingCase,
} from '../../content/casos/sessionTypes';
import { recordPractice, type PracticeSessionMode } from '../../shared/progreso';
import { EvaluationOption } from '../../shared/evaluacion/EvaluationOption';
import { useEvaluationPronunciation } from '../../shared/evaluacion/useEvaluationPronunciation';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import {
  applyOrderingHint,
  discardIncorrectChoice,
  moveItem,
  performanceLevel,
  scoreMultipleChoice,
  scoreOrderedActions,
  type PerformanceLevel,
} from './clinicalEngine';
import { InterviewCaseView, InvestigationCaseView } from './ClinicalConversationCase';
import { ClinicalMatching } from './ClinicalMatching';
import { CaseResult, type CaseStepProps, type Score } from './ClinicalResult';
import { ClinicalSummary } from './ClinicalSummary';
import { Bilingual } from './Bilingual';

const casesById = new Map(clinicalCases.map(item => [item.id, item]));
const sessionLabels = {
  interview: 'Conversación y comprensión',
  investigation: 'Investigación clínica',
  ordering: 'Orden clínico',
  'multiple-choice': 'Decisión clínica',
  matching: 'Relaciona síntomas y causas',
};
function OrderingCaseView({ item, ...step }: CaseStepProps<OrderingCase>) {
  const actionMap = useMemo(() => new Map(item.actions.map(action => [action.id, action])), [item]);
  const expectedIds = useMemo(() => item.actions.map(action => action.id), [item]);
  const allowHints = step.mode === 'entrenamiento';
  const requireReorder = !!step.submitTimed || !allowHints;
  const initialOrder = useMemo(() => {
    const ids = [...expectedIds];
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [ids[index], ids[swap]] = [ids[swap], ids[index]];
    }
    if (requireReorder && ids.every((id, index) => id === expectedIds[index])) [ids[0], ids[1]] = [ids[1], ids[0]];
    return ids;
  }, [expectedIds, requireReorder]);
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [drag, setDrag] = useState<{ id: string; pointerId: number; originX: number; originY: number; x: number; y: number; targetId: string }>();
  const [score, setScore] = useState<ReturnType<typeof scoreOrderedActions> | null>(null);
  useEvaluationPronunciation(score ? 'result' : 'order');
  const hintLimit = Math.min(3, item.actions.length - 1);

  const reorder = (fromIndex: number, toIndex: number) => {
    const locked = new Set(lockedIds);
    if (fromIndex === toIndex || locked.has(order[fromIndex]) || locked.has(order[toIndex])) return;
    setOrder(current => {
      const movableIndexes = current.map((_, index) => index).filter(index => !locked.has(current[index]));
      const fromMovable = movableIndexes.indexOf(fromIndex);
      const toMovable = movableIndexes.indexOf(toIndex);
      if (fromMovable < 0 || toMovable < 0) return current;
      const moved = moveItem(movableIndexes.map(index => current[index]), fromMovable, toMovable);
      let cursor = 0;
      return current.map(id => locked.has(id) ? id : moved[cursor++]);
    });
  };

  const moveBy = (id: string, direction: -1 | 1) => {
    const unlocked = order.filter(actionId => !lockedIds.includes(actionId));
    const movableIndex = unlocked.indexOf(id);
    const targetId = unlocked[movableIndex + direction];
    if (!targetId) return;
    reorder(order.indexOf(id), order.indexOf(targetId));
  };

  const useHint = () => {
    const result = applyOrderingHint(order, expectedIds, lockedIds);
    setOrder(result.order);
    setLockedIds(result.lockedIds);
  };

  const reset = () => {
    const locked = new Set(lockedIds);
    const remaining = initialOrder.filter(id => !locked.has(id));
    let cursor = 0;
    setOrder(expectedIds.map(id => locked.has(id) ? id : remaining[cursor++]));
  };

  const beginDrag = (event: React.PointerEvent<HTMLElement>, id: string, locked: boolean) => {
    if (locked) return;
    const target = event.target as HTMLElement;
    const usedHandle = !!target.closest('[data-drag-handle]');
    if (target.closest('.clinical-order-moves, .button--sound') || (event.pointerType !== 'mouse' && !usedHandle)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id, pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, x: 0, y: 0, targetId: id });
  };

  const continueDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const candidates = [...document.querySelectorAll<HTMLElement>('[data-order-id]')]
      .filter(card => card.dataset.orderId !== drag.id && card.dataset.locked !== 'true');
    const nearest = candidates.reduce<HTMLElement | undefined>((best, card) => {
      if (!best) return card;
      const distance = Math.abs(card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2 - event.clientY);
      const bestDistance = Math.abs(best.getBoundingClientRect().top + best.getBoundingClientRect().height / 2 - event.clientY);
      return distance < bestDistance ? card : best;
    }, undefined);
    setDrag(current => current ? {
      ...current,
      x: event.clientX - current.originX,
      y: event.clientY - current.originY,
      targetId: nearest?.dataset.orderId ?? current.targetId,
    } : current);
  };

  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    reorder(order.indexOf(drag.id), order.indexOf(drag.targetId));
    setDrag(undefined);
  };

  if (score) return <CaseResult {...step} title={`${score.correct + score.assisted} de ${item.actions.length} posiciones correctas`}
    score={score} onRetry={() => setScore(null)} solutionLabel="Ver orden correcto" solution={<>
      <ol className="clinical-correction-list" aria-label="Orden correcto">
        {item.actions.map((action, index) => <li key={action.id}>
          <Bilingual es={action.textEs} en={action.textEn}/>
          {order[index] !== action.id && <small className="clinical-result-meta">Tu orden colocaba este paso en la posición {order.indexOf(action.id) + 1}.</small>}
        </li>)}
      </ol>
      <p><Bilingual es={item.explanationEs} en={item.explanationEn}/></p>
    </>}>
    {allowHints && <p className="clinical-result-meta">
      {score.correct} sin ayuda · {score.assisted} {score.assisted === 1 ? 'con pista' : 'con pistas'} · {score.errors} para revisar
    </p>}
  </CaseResult>;

  return <div className="clinical-case-body">
    <Card className="clinical-question-card">
      <p><Bilingual es={item.scenarioEs} en={item.scenarioEn}/></p>
    </Card>
    <section className="clinical-order" aria-labelledby="selected-actions">
      <div className="clinical-order-heading">
        <div><h3 id="selected-actions">Tu orden</h3><p>Arrastra las tarjetas o usa las flechas.</p></div>
        {allowHints && <span>{lockedIds.length} de {hintLimit} pistas</span>}
      </div>
      <div className="clinical-order-list" role="list">
        {order.map((id, index) => {
          const action = actionMap.get(id);
          if (!action) return null;
          const locked = lockedIds.includes(id);
          const unlocked = order.filter(actionId => !lockedIds.includes(actionId));
          const movableIndex = unlocked.indexOf(id);
          const isDragged = drag?.id === id;
          return <article key={id} role="listitem" className="clinical-order-card" data-order-id={id}
            data-locked={locked || undefined} data-dragging={isDragged || undefined}
            data-drop-target={drag && drag.targetId === id && !isDragged || undefined}
            style={isDragged ? { transform: `translate3d(${drag.x}px, ${drag.y}px, 0) scale(1.03) rotate(-0.5deg)` } : undefined}
            onPointerDown={event => beginDrag(event, id, locked)} onPointerMove={continueDrag}
            onPointerUp={finishDrag} onPointerCancel={() => setDrag(undefined)}>
            <button type="button" className="clinical-drag-handle" data-drag-handle aria-label="Arrastrar acción" disabled={locked}>
              {locked ? <LockKeyhole size={19}/> : <GripVertical size={19}/>}
            </button>
            <span className="clinical-order-number">{index + 1}</span>
            <p><Bilingual es={action.textEs} en={action.textEn}/></p>
            {locked && <span className="clinical-assisted-label">Colocada con pista</span>}
            <div className="clinical-order-moves">
              <button type="button" aria-label="Mover arriba" disabled={locked || movableIndex <= 0} onClick={() => moveBy(id, -1)}><ChevronUp size={18}/></button>
              <button type="button" aria-label="Mover abajo" disabled={locked || movableIndex < 0 || movableIndex >= unlocked.length - 1} onClick={() => moveBy(id, 1)}><ChevronDown size={18}/></button>
            </div>
          </article>;
        })}
      </div>
      <div className="lumar-actions">
        <Button variant="secondary" onClick={reset}><RotateCcw size={17}/> Reiniciar</Button>
        {allowHints && <Button variant="secondary" disabled={lockedIds.length >= hintLimit} onClick={useHint}><Lightbulb size={17}/> Pista de orden</Button>}
        <Button onClick={() => {
          const result = scoreOrderedActions(order, expectedIds, lockedIds);
          if (!step.submitTimed || step.submitTimed(result)) setScore(result);
        }}>Comprobar orden</Button>
      </div>
      {allowHints && <p className="clinical-hint-status" role="status">
        {lockedIds.length >= hintLimit
          ? 'Ya usaste todas las pistas disponibles.'
          : `${hintLimit - lockedIds.length} ${hintLimit - lockedIds.length === 1 ? 'pista disponible' : 'pistas disponibles'}.`}
      </p>}
    </section>
  </div>;
}

function MultipleChoiceCaseView({ item, ...step }: CaseStepProps<MultipleChoiceCase>) {
  const [selected, setSelected] = useState<string>();
  const [discarded, setDiscarded] = useState<string>();
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState<Score | null>(null);
  const allowHints = step.mode === 'entrenamiento';
  useEvaluationPronunciation(score ? 'result' : 'choice');

  if (score) {
    const chosen = item.options.find(option => option.id === selected);
    const expected = item.options.find(option => option.id === item.correctId);
    return <CaseResult {...step} title={score.correct ? 'Respuesta correcta' : 'Respuesta para revisar'} score={score}
      onRetry={() => { setSelected(undefined); setScore(null); }} solution={<>
        {expected && <strong><Bilingual es={expected.textEs} en={expected.textEn}/></strong>}
        <p><Bilingual es={item.explanationEs} en={item.explanationEn}/></p>
      </>}>
      {score.errors > 0 && chosen && <p><strong>Tu respuesta</strong><Bilingual es={chosen.textEs} en={chosen.textEn}/></p>}
      {allowHints && <p className="clinical-result-meta">{hintUsed ? '1 pista utilizada' : 'Sin pistas'}</p>}
    </CaseResult>;
  }

  return <div className="clinical-case-body">
    <Card className="clinical-question-card">
      <p><Bilingual es={item.scenarioEs} en={item.scenarioEn}/></p>
      <h3><Bilingual es={item.promptEs} en={item.promptEn}/></h3>
      <div className="clinical-answer-list">
        {item.options.map(option => {
          const isSelected = selected === option.id;
          const isDiscarded = discarded === option.id;
          return <EvaluationOption key={option.id} pronunciation={option.textEn} disabled={isDiscarded}
            aria-pressed={isSelected} data-discarded={isDiscarded || undefined}
            onClick={() => setSelected(option.id)}>
            <Bilingual es={option.textEs} en={option.textEn} audio={false}/>
            {isDiscarded && <small lang="es">Opción descartada</small>}
          </EvaluationOption>;
        })}
      </div>
      <div className="clinical-choice-actions">
        {allowHints && <Button variant="secondary" disabled={hintUsed} onClick={() => {
          const discardedId = discardIncorrectChoice(item.options, item.correctId, selected);
          if (discardedId) setDiscarded(discardedId);
          setHintUsed(true);
        }}><Lightbulb size={17}/> Descartar una opción</Button>}
        <Button disabled={!selected} onClick={() => {
          if (!selected) return;
          const result = { ...scoreMultipleChoice(selected, item.correctId), hints: hintUsed ? 1 : 0 };
          if (!step.submitTimed || step.submitTimed(result)) setScore(result);
        }}>Comprobar respuesta</Button>
      </div>
    </Card>
  </div>;
}

function CaseView({ item, onComplete, last, submitTimed, mode }: Pick<CaseStepProps<ClinicalCase>, 'item' | 'onComplete' | 'last' | 'submitTimed' | 'mode'>) {
  const [retried, setRetried] = useState(false);
  const step = { onComplete, last, mode, submitTimed, retried, markRetry: () => setRetried(true) };
  if (item.kind === 'interview') return <InterviewCaseView item={item} {...step}/>;
  if (item.kind === 'investigation') return <InvestigationCaseView item={item} {...step}/>;
  if (item.kind === 'ordering') return <OrderingCaseView item={item} {...step}/>;
  if (item.kind === 'matching') return <ClinicalMatching item={item} {...step}/>;
  return <MultipleChoiceCaseView item={item} {...step}/>;
}

interface ClinicalSessionProps {
  caseIds: readonly string[];
  onExit: () => void;
  finishTimed?: (score: Score) => boolean;
  mode?: PracticeSessionMode;
}

export function ClinicalSession(props: ClinicalSessionProps) {
  const [attempt, setAttempt] = useState(0);
  return <ClinicalAttempt key={attempt} {...props} onRepeat={() => setAttempt(current => current + 1)}/>;
}

function ClinicalAttempt({ caseIds: sessionIds, onExit, finishTimed, mode = 'entrenamiento', onRepeat }:
  ClinicalSessionProps & { onRepeat: () => void }) {
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState<Score>({ correct: 0, errors: 0, hints: 0, assisted: 0 });
  const [levels, setLevels] = useState<Record<PerformanceLevel, number>>({ strong: 0, partial: 0, review: 0 });
  const item = casesById.get(sessionIds[index]);
  const lastRecordedId = useRef<string | undefined>(undefined);
  useEvaluationPronunciation(index);

  useEffect(() => { window.scrollTo(0, 0); }, [index]);

  if (!item) return <ClinicalSummary total={total} count={sessionIds.length} levels={levels} mode={mode} onExit={onExit} onRepeat={onRepeat}/>;

  const save = (score: Score) => {
    if (lastRecordedId.current === item.id) return false;
    lastRecordedId.current = item.id;
    recordPractice({
      areaId: 'anatomy',
      groupId: 'clinical-cases',
      itemId: item.id,
      activityId: item.id,
      correct: score.correct,
      errors: score.errors,
      hints: score.hints ?? 0,
      assisted: score.assisted,
      retried: score.retried,
      quick: finishTimed ? true : undefined,
      mode,
      context: score.investigation && { kind: 'caso', ...score.investigation },
    });
    return true;
  };
  const complete = (score: Score) => {
    if (!save(score)) return;
    setTotal(previous => ({
      correct: previous.correct + score.correct,
      errors: previous.errors + score.errors,
      hints: (previous.hints ?? 0) + (score.hints ?? 0),
      assisted: (previous.assisted ?? 0) + (score.assisted ?? 0),
    }));
    const level = performanceLevel(score);
    setLevels(previous => ({ ...previous, [level]: previous[level] + 1 }));
    setIndex(current => current + 1);
  };

  return <section className="lumar-page clinical-session">
    <div className="clinical-session-topbar">
      <Button variant="secondary" onClick={onExit}><ArrowLeft size={17} aria-hidden="true"/> Salir</Button>
      <strong>Caso {index + 1} de {sessionIds.length}</strong>
    </div>
    <div className="clinical-progress" aria-label={`Caso ${index + 1} de ${sessionIds.length}`}>
      <span style={{ width: `${((index + 1) / sessionIds.length) * 100}%` }}/>
    </div>
    <header>
      <p className="lumar-eyebrow">{mode === 'evaluacion' && 'Evaluación · '}{sessionLabels[item.kind]}</p>
      <h1>{item.titleEs}</h1>
      <p className="lumar-subtitle">{item.instructionsEs}</p>
    </header>
    <CaseView key={item.id} item={item} mode={mode} onComplete={finishTimed ? onExit : complete} last={index === sessionIds.length - 1}
      submitTimed={finishTimed && (score => finishTimed(score) && save(score))}/>
    <p className="clinical-disclaimer">Material educativo provisional basado en la fuente indicada. No sustituye formación clínica supervisada.</p>
  </section>;
}
