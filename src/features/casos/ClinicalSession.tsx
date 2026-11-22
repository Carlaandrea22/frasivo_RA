import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Circle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { clinicalCases } from '../../content/casos/session';
import type {
  ClinicalCase,
  InterviewCase,
  MultipleChoiceCase,
  OrderingCase,
} from '../../content/casos/sessionTypes';
import { recordPractice } from '../../shared/progreso';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import {
  applyOrderingHint,
  buildCaseSession,
  createInterviewExchange,
  discardIncorrectChoice,
  getInterviewChoices,
  moveItem,
  performanceLevel,
  scoreMultipleChoice,
  scoreOrderedActions,
  type InterviewExchange,
  type PerformanceLevel,
} from './clinicalEngine';

interface Score {
  correct: number;
  errors: number;
  hints?: number;
  assisted?: number;
}

interface CaseViewProps<T extends ClinicalCase> {
  item: T;
  onComplete: (score: Score) => void;
}

function NextCaseButton({ onComplete, score }: { onComplete: (score: Score) => void; score: Score }) {
  return <Button onClick={() => onComplete(score)}>Siguiente caso</Button>;
}

function InterviewCaseView({ item, onComplete }: CaseViewProps<InterviewCase>) {
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [pending, setPending] = useState<InterviewExchange>();
  const [phase, setPhase] = useState<'conversation' | 'recall' | 'result'>('conversation');
  const [recallIndex, setRecallIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [conversationHints, setConversationHints] = useState<Set<number>>(() => new Set());
  const [recallHints, setRecallHints] = useState<Set<number>>(() => new Set());
  const typingRef = useRef(false);
  const typingTimeout = useRef<number | undefined>(undefined);
  const chatEnd = useRef<HTMLDivElement>(null);

  const available = getInterviewChoices(item, path);
  const showConversationTranslation = conversationHints.has(path.length);
  const hintsUsed = conversationHints.size + recallHints.size;

  useEffect(() => () => {
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [exchanges, pending]);

  const ask = (prompt: (typeof available)[number]) => {
    if (typingRef.current) return;
    typingRef.current = true;
    const exchange = createInterviewExchange(prompt);
    setPending(exchange);
    typingTimeout.current = window.setTimeout(() => {
      setExchanges(previous => [...previous, exchange]);
      setPath(previous => [...previous, prompt.id]);
      setPending(undefined);
      typingRef.current = false;
    }, 500);
  };

  if (phase === 'recall') {
    const question = exchanges[recallIndex].recall;
    const showTranslation = recallHints.has(recallIndex);
    const answer = (id: string) => {
      const nextCorrect = correct + Number(id === question.correctId);
      setCorrect(nextCorrect);
      if (recallIndex === exchanges.length - 1) setPhase('result');
      else setRecallIndex(index => index + 1);
    };
    return <div className="clinical-case-body">
      <header>
        <p className="lumar-eyebrow">Comprensión · {recallIndex + 1} de {exchanges.length}</p>
        <h2>Comprueba lo que entendiste</h2>
      </header>
      <Card className="clinical-question-card">
        <h3 lang="en">{question.promptEn}</h3>
        {showTranslation && <p className="clinical-translation" lang="es">{question.promptEs}</p>}
        <div className="clinical-answer-list">
          {question.options.map(option => <Button key={option.id} variant="answer" lang="en" onClick={() => answer(option.id)}>
            <span>{option.textEn}</span>
            {showTranslation && <small lang="es">{option.textEs}</small>}
          </Button>)}
        </div>
        <div className="clinical-hint-row">
          <Button variant="secondary" disabled={showTranslation} onClick={() => setRecallHints(previous => new Set(previous).add(recallIndex))}>
            <Lightbulb size={17}/> Pista
          </Button>
          <span>{recallHints.size} de 3 traducciones usadas</span>
        </div>
      </Card>
    </div>;
  }

  if (phase === 'result') {
    const score = { correct, errors: exchanges.length - correct, hints: hintsUsed };
    return <ResultCard title={`${correct} de ${exchanges.length} respuestas correctas`} level={performanceLevel(score)}>
      <p>La puntuación corresponde a lo que recordaste de esta conversación.</p>
      <p className="clinical-result-meta">{hintsUsed} {hintsUsed === 1 ? 'pista utilizada' : 'pistas utilizadas'}</p>
      <NextCaseButton score={score} onComplete={onComplete}/>
    </ResultCard>;
  }

  return <div className="clinical-case-body">
    <Card className="clinical-chat" aria-label={`Conversación con ${item.patientName}`}>
      <div className="clinical-message clinical-message--patient">
        <div className="clinical-message-head"><span className="clinical-avatar"><UserRound size={16}/></span><strong>{item.patientName}</strong></div>
        <p lang="en">{item.openingEn}</p>
      </div>
      {exchanges.map(exchange => <div key={exchange.prompt.id} className="clinical-exchange">
        <div className="clinical-message clinical-message--student"><strong>Tú</strong><p lang="en">{exchange.prompt.promptEn}</p></div>
        <div className="clinical-message clinical-message--patient">
          <div className="clinical-message-head"><span className="clinical-avatar"><UserRound size={16}/></span><strong>{item.patientName}</strong></div>
          <p lang="en">{exchange.response.patientEn}</p>
        </div>
      </div>)}
      {pending && <div className="clinical-exchange clinical-exchange--pending">
        <div className="clinical-message clinical-message--student"><strong>Tú</strong><p lang="en">{pending.prompt.promptEn}</p></div>
        <div className="clinical-message clinical-message--patient clinical-typing" role="status" aria-label={`${item.patientName} está escribiendo`}>
          <div className="clinical-message-head"><span className="clinical-avatar"><UserRound size={16}/></span><strong>{item.patientName}</strong></div>
          <span className="clinical-typing-dots" aria-hidden="true"><i/><i/><i/></span>
        </div>
      </div>}
      <div ref={chatEnd}/>
    </Card>

    {path.length < 3 ? <section className="clinical-options" aria-labelledby="clinical-question-options">
      <p id="clinical-question-options" className="lumar-card-meta">Elige tu pregunta · Turno {exchanges.length + 1} de 3</p>
      {available.map(prompt => <Button key={prompt.id} variant="answer" lang="en" disabled={!!pending} onClick={() => ask(prompt)}>
        <span>{prompt.promptEn}</span>
        {showConversationTranslation && <small lang="es">{prompt.promptEs}</small>}
      </Button>)}
      <div className="clinical-hint-row">
        <Button variant="secondary" disabled={showConversationTranslation || !!pending}
          onClick={() => setConversationHints(previous => new Set(previous).add(path.length))}>
          <Lightbulb size={17}/> Pista
        </Button>
        <span>{conversationHints.size} de 3 traducciones usadas</span>
      </div>
    </section> : <Card className="clinical-ready">
      <p>Ya tienes tres respuestas de {item.patientName}. Ahora comprueba qué detalles entendiste.</p>
      <Button onClick={() => setPhase('recall')}>Comenzar preguntas de comprensión</Button>
    </Card>}
  </div>;
}

function OrderingCaseView({ item, onComplete }: CaseViewProps<OrderingCase>) {
  const actionMap = useMemo(() => new Map(item.actions.map(action => [action.id, action])), [item]);
  const expectedIds = useMemo(() => item.actions.map(action => action.id), [item]);
  const initialOrder = useMemo(() => {
    const ids = [...expectedIds];
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [ids[index], ids[swap]] = [ids[swap], ids[index]];
    }
    return ids;
  }, [expectedIds]);
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string>();
  const [score, setScore] = useState<ReturnType<typeof scoreOrderedActions> | null>(null);
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

  const pointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggedId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-order-id]');
    const targetId = target?.dataset.orderId;
    if (!targetId || targetId === draggedId) return;
    reorder(order.indexOf(draggedId), order.indexOf(targetId));
  };

  if (score) return <ResultCard title={`${score.correct} de ${item.actions.length} posiciones resueltas sin ayuda`} level={performanceLevel(score)}>
    <p lang="en">{item.explanationEn}</p>
    <p className="clinical-result-meta">
      {score.assisted} {score.assisted === 1 ? 'posición colocada con pista' : 'posiciones colocadas con pistas'} · {score.errors} para revisar
    </p>
    <NextCaseButton score={score} onComplete={onComplete}/>
  </ResultCard>;

  return <div className="clinical-case-body">
    <Card className="clinical-question-card">
      <p lang="en">{item.scenarioEn}</p>
    </Card>
    <section className="clinical-order" aria-labelledby="selected-actions">
      <div className="clinical-order-heading">
        <div><h3 id="selected-actions">Tu orden</h3><p>Arrastra las tarjetas o usa las flechas.</p></div>
        <span>{lockedIds.length} de {hintLimit} pistas</span>
      </div>
      <div className="clinical-order-list" role="list">
        {order.map((id, index) => {
          const locked = lockedIds.includes(id);
          const unlocked = order.filter(actionId => !lockedIds.includes(actionId));
          const movableIndex = unlocked.indexOf(id);
          return <article key={id} role="listitem" className="clinical-order-card" data-order-id={id} data-locked={locked || undefined}>
            <button type="button" className="clinical-drag-handle" aria-label="Arrastrar acción" disabled={locked}
              onPointerDown={event => {
                setDraggedId(id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={pointerMove}
              onPointerUp={event => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDraggedId(undefined);
              }}>
              {locked ? <LockKeyhole size={19}/> : <GripVertical size={19}/>}
            </button>
            <span className="clinical-order-number">{index + 1}</span>
            <p lang="en">{actionMap.get(id)?.textEn}</p>
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
        <Button variant="secondary" disabled={lockedIds.length >= hintLimit} onClick={useHint}><Lightbulb size={17}/> Pista de orden</Button>
        <Button onClick={() => setScore(scoreOrderedActions(order, expectedIds, lockedIds))}>Comprobar orden</Button>
      </div>
    </section>
  </div>;
}

function MultipleChoiceCaseView({ item, onComplete }: CaseViewProps<MultipleChoiceCase>) {
  const [selected, setSelected] = useState<string>();
  const [discarded, setDiscarded] = useState<string>();
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState<Score | null>(null);

  if (score) return <ResultCard title={score.correct ? 'Respuesta correcta' : 'Respuesta para revisar'} level={performanceLevel(score)}>
    <p lang="en">{item.explanationEn}</p>
    <p className="clinical-result-meta">{hintUsed ? '1 pista utilizada' : 'Sin pistas'}</p>
    <NextCaseButton score={score} onComplete={onComplete}/>
  </ResultCard>;

  return <div className="clinical-case-body">
    <Card className="clinical-question-card">
      <p lang="en">{item.scenarioEn}</p>
      <h3 lang="en">{item.promptEn}</h3>
      <div className="clinical-answer-list">
        {item.options.map(option => {
          const isSelected = selected === option.id;
          const isDiscarded = discarded === option.id;
          return <Button key={option.id} variant="answer" lang="en" disabled={isDiscarded}
            aria-pressed={isSelected} data-selected={isSelected || undefined} data-discarded={isDiscarded || undefined}
            onClick={() => setSelected(option.id)}>
            <span className="clinical-choice-marker" aria-hidden="true">{isSelected ? <Check size={16}/> : <Circle size={16}/>}</span>
            <span>{option.textEn}{isDiscarded && <small lang="es">Opción descartada</small>}</span>
          </Button>;
        })}
      </div>
      <div className="clinical-choice-actions">
        <Button variant="secondary" disabled={hintUsed} onClick={() => {
          const discardedId = discardIncorrectChoice(item.options, item.correctId, selected);
          if (discardedId) setDiscarded(discardedId);
          setHintUsed(true);
        }}><Lightbulb size={17}/> Descartar una opción</Button>
        <Button disabled={!selected} onClick={() => selected && setScore({
          ...scoreMultipleChoice(selected, item.correctId),
          hints: hintUsed ? 1 : 0,
        })}>Comprobar respuesta</Button>
      </div>
    </Card>
  </div>;
}

function ResultCard({ title, children, level = 'strong' }: { title: string; children: ReactNode; level?: PerformanceLevel }) {
  return <Card className="clinical-result" data-level={level}>
    <span className="clinical-result-icon" aria-hidden="true">
      {level === 'strong' ? <Check size={24}/> : <AlertCircle size={24}/>} 
    </span>
    <h2>{title}</h2>
    {children}
  </Card>;
}

function CaseView({ item, onComplete }: CaseViewProps<ClinicalCase>) {
  if (item.kind === 'interview') return <InterviewCaseView item={item} onComplete={onComplete}/>;
  if (item.kind === 'ordering') return <OrderingCaseView item={item} onComplete={onComplete}/>;
  return <MultipleChoiceCaseView item={item} onComplete={onComplete}/>;
}

export function ClinicalSession({ onExit }: { onExit: () => void }) {
  const sessionIds = useMemo(() => buildCaseSession(clinicalCases.map(item => item.id)), []);
  const caseMap = useMemo(() => new Map(clinicalCases.map(item => [item.id, item])), []);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState<Score>({ correct: 0, errors: 0, hints: 0, assisted: 0 });
  const item = caseMap.get(sessionIds[index]);

  if (!item) return <section className="lumar-page clinical-session clinical-complete">
    <p className="lumar-eyebrow">Sesión terminada</p>
    <h1>Completaste los cinco casos</h1>
    <p>{total.correct} respuestas o posiciones correctas · {total.errors} para revisar · {total.hints ?? 0} pistas</p>
    <Button onClick={onExit}>Volver a Casos clínicos</Button>
  </section>;

  const complete = (score: Score) => {
    recordPractice({
      areaId: 'anatomy',
      groupId: 'clinical-cases',
      itemId: item.id,
      activityId: item.id,
      correct: score.correct,
      errors: score.errors,
      hints: score.hints ?? 0,
    });
    setTotal(previous => ({
      correct: previous.correct + score.correct,
      errors: previous.errors + score.errors,
      hints: (previous.hints ?? 0) + (score.hints ?? 0),
      assisted: (previous.assisted ?? 0) + (score.assisted ?? 0),
    }));
    setIndex(current => current + 1);
  };

  return <section className="lumar-page clinical-session">
    <div className="clinical-session-topbar">
      <Button variant="text" onClick={onExit}><ArrowLeft size={17}/> Salir</Button>
      <strong>Caso {index + 1} de {sessionIds.length}</strong>
    </div>
    <div className="clinical-progress" aria-label={`Caso ${index + 1} de ${sessionIds.length}`}>
      <span style={{ width: `${((index + 1) / sessionIds.length) * 100}%` }}/>
    </div>
    <header>
      <p className="lumar-eyebrow">{item.kind === 'interview' ? 'Conversación clínica' : item.kind === 'ordering' ? 'Orden clínico' : 'Decisión clínica'}</p>
      <h1>{item.titleEs}</h1>
      <p className="lumar-subtitle">{item.instructionsEs}</p>
    </header>
    <CaseView key={item.id} item={item} onComplete={complete}/>
    <p className="clinical-disclaimer">Material educativo provisional basado en la fuente indicada. No sustituye formación clínica supervisada.</p>
  </section>;
}
