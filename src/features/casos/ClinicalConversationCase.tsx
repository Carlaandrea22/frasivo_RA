import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, UserRound } from 'lucide-react';
import type { ConversationNode, InterviewCase, InvestigationCase, InvestigationNode } from '../../content/casos/sessionTypes';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { createInterviewExchange, getInterviewChoices, scoreInvestigation } from './clinicalEngine';
import { NextCaseButton, ResultCard, type CaseStepProps } from './ClinicalResult';
import { ClinicalAnatomy } from './ClinicalAnatomy';
import { Bilingual } from './Bilingual';

function PatientLabel({ name }: { name: string }) {
  return <div className="clinical-message-head">
    <span className="clinical-avatar" aria-hidden="true"><UserRound size={16}/></span><strong>{name}</strong>
  </div>;
}

type PatientOpening = Pick<InterviewCase, 'patientName' | 'openingEs' | 'openingEn'>;

function Transcript({ item, path, pending, follow = false }: {
  item: PatientOpening;
  path: readonly ConversationNode[];
  pending?: ConversationNode;
  follow?: boolean;
}) {
  const chat = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!follow || (!pending && !path.length)) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: reduce ? 'instant' : 'smooth' });
  }, [follow, path, pending]);

  return <section className="lumar-card clinical-chat" ref={chat} tabIndex={0} aria-label={`Conversación con ${item.patientName}`}>
      <div className="clinical-message clinical-message--patient">
        <PatientLabel name={item.patientName}/>
        <Bilingual es={item.openingEs} en={item.openingEn}/>
      </div>
      {[...path, ...(pending ? [pending] : [])].map(node => <div key={node.id} className="clinical-exchange">
        <div className="clinical-message clinical-message--student">
          <strong>Tú</strong><Bilingual es={node.promptEs} en={node.promptEn}/>
        </div>
        {node === pending ? <div className="clinical-message clinical-message--patient clinical-typing" role="status" aria-label={`${item.patientName} está escribiendo`}>
          <PatientLabel name={item.patientName}/>
          <span className="clinical-typing-dots" aria-hidden="true"><i/><i/><i/></span>
        </div> : <div className="clinical-message clinical-message--patient">
          <PatientLabel name={item.patientName}/>
          <Bilingual es={node.patientEs} en={node.patientEn}/>
        </div>}
      </div>)}
  </section>;
}

function Conversation<Node extends ConversationNode>({ item, finishLabel, onFinish }: {
  item: PatientOpening & { nodes: readonly Node[]; roots: readonly string[] };
  finishLabel: string;
  onFinish: (path: Node[]) => void;
}) {
  const [path, setPath] = useState<Node[]>([]);
  const [pending, setPending] = useState<Node>();
  const timeout = useRef<number | undefined>(undefined);
  const choices = getInterviewChoices(item, path.map(node => node.id));

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  const ask = (node: Node) => {
    if (timeout.current !== undefined) return;
    setPending(node);
    timeout.current = window.setTimeout(() => {
      setPath(previous => [...previous, node]);
      setPending(undefined);
      timeout.current = undefined;
    }, 500);
  };

  return <div className="clinical-case-body">
    <Transcript item={item} path={path} pending={pending} follow/>
    {choices.length > 0 ? <section className="clinical-options" aria-labelledby="clinical-question-options">
      <div className="clinical-prompt-heading">
        <h2 id="clinical-question-options">Elige tu pregunta</h2>
        <span>Turno {path.length + 1} de 3</span>
      </div>
      {choices.map(node => <Button key={node.id} variant="answer" disabled={!!pending} onClick={() => ask(node)}>
        <Bilingual es={node.promptEs} en={node.promptEn}/>
      </Button>)}
    </section> : <Button className="clinical-finish-dialogue" onClick={() => onFinish(path)}>{finishLabel}<ArrowRight size={17}/></Button>}
  </div>;
}

export function InterviewCaseView({ item, onComplete, last }: CaseStepProps<InterviewCase>) {
  const [recall, setRecall] = useState<ReturnType<typeof createInterviewExchange>[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const exchange = recall[answers.length];

  if (!recall.length) return <Conversation item={item} finishLabel="Comenzar preguntas de comprensión"
    onFinish={path => setRecall(path.map(node => createInterviewExchange(node)))}/>;

  if (!exchange) {
    const correct = recall.filter(({ recall: entry }, index) => entry.correctId === answers[index]).length;
    const score = { correct, errors: recall.length - correct };
    return <ResultCard title={`${correct} de ${recall.length} respuestas correctas`} score={score}>
      <p>La puntuación corresponde a lo que recordaste de esta conversación.</p>
      <NextCaseButton score={score} onComplete={onComplete} last={last}/>
    </ResultCard>;
  }

  const { prompt, recall: question } = exchange;
  return <div className="clinical-case-body">
    <header>
      <p className="lumar-eyebrow">Comprensión · {answers.length + 1} de {recall.length}</p>
      <h2>Comprueba lo que entendiste</h2>
    </header>
    <Card className="clinical-question-card">
      <div className="clinical-recall-prompt">
        <p><Bilingual es={question.promptEs} en={question.promptEn}/></p>
        <h3><Bilingual es={prompt.promptEs} en={prompt.promptEn}/></h3>
      </div>
      <div className="clinical-answer-list" key={answers.length}>
        {question.options.map(option => <Button key={option.id} variant="answer" onClick={() => setAnswers([...answers, option.id])}>
          <Bilingual es={option.textEs} en={option.textEn}/>
        </Button>)}
      </div>
    </Card>
  </div>;
}

export function InvestigationCaseView({ item, onComplete, last }: CaseStepProps<InvestigationCase>) {
  const [path, setPath] = useState<InvestigationNode[]>();
  const [hypothesisId, setHypothesisId] = useState<string>();
  const retry = () => {
    setHypothesisId(undefined);
    setPath(undefined);
  };

  if (!path) return <Conversation item={item} finishLabel="Elegir una hipótesis" onFinish={setPath}/>;

  if (!hypothesisId) return <Card className="clinical-question-card">
    <h2><Bilingual es="¿Qué investigarías primero?" en="What would you investigate first?"/></h2>
    <p>Elige la hipótesis que mejor encaje con las respuestas de {item.patientName}.</p>
    <details className="clinical-review-dialogue">
      <summary>Releer la conversación</summary>
      <Transcript item={item} path={path}/>
    </details>
    <div className="clinical-answer-list">
      {item.hypotheses.map(option => <Button key={option.id} variant="answer" onClick={() => setHypothesisId(option.id)}>
        <Bilingual es={option.textEs} en={option.textEn}/>
      </Button>)}
    </div>
    <Button variant="text" className="clinical-retry" onClick={retry}><RotateCcw size={17}/> Volver al primer turno</Button>
  </Card>;

  const questionIds = path.map(node => node.id);
  const { findings, hypothesisSupported, correct, errors } = scoreInvestigation(item, questionIds, hypothesisId);
  const score = { correct, errors, investigation: { questionIds, hypothesisId } };
  const preferred = item.hypotheses.find(option => option.id === item.preferredHypothesisId);

  return <ResultCard title={errors === 0 ? 'Investigación bien orientada' : 'Revisa tu camino'} score={score}>
    <p>{findings.length} de {item.findings.length} hallazgos clave · {hypothesisSupported ? 'Hipótesis respaldada' : 'Hipótesis por revisar'}</p>
    {findings.length > 0 && <ul className="clinical-findings" aria-label="Hallazgos que obtuviste">
      {findings.map(finding => <li key={finding.id}><Bilingual es={finding.textEs} en={finding.textEn}/></li>)}
    </ul>}
    {preferred && <details className="clinical-debrief" open={errors === 0}>
      <summary>Hipótesis de referencia</summary>
      <div>
        <Bilingual es={preferred.textEs} en={preferred.textEn}/>
        <Bilingual es={item.debriefEs} en={item.debriefEn}/>
      </div>
    </details>}
    <ClinicalAnatomy structures={item.anatomy}/>
    <div className="clinical-result-actions">
      <Button variant="secondary" onClick={retry}><RotateCcw size={17}/> Volver al primer turno</Button>
      <NextCaseButton score={score} onComplete={onComplete} last={last}/>
    </div>
  </ResultCard>;
}
