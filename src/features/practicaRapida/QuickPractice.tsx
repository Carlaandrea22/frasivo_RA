import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Timer, X } from 'lucide-react';
import { getProgress, subscribeProgress } from '../../shared/progreso';
import { useRacha } from '../../shared/progreso/useRacha';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ClinicalSession } from '../casos/ClinicalSession';
import { ClinicalConfetti } from '../casos/ClinicalConfetti';
import { performanceLevel, scoreRatio } from '../casos/clinicalEngine';
import type { Score } from '../casos/ClinicalResult';
import { Mascota } from '../progreso/mascota/Mascota';
import { obtenerEvolucion, type MascotaEtapa } from '../progreso/mascota/evolucion';
import { Juego } from '../retos/Retos';
import type { QuickActivity } from './quickActivity';
import '../progreso/mascota/recordatorio-racha.css';
import './quick-practice.css';

const messages: Record<MascotaEtapa, string> = {
  bebe: '¿Una más conmigo, porfi? Tú me enseñas.',
  nino: '¡Quiero una más! A ver si le ganas al reloj.',
  adolescente: '¿Me ayudas a repasar? Hagamos una rapidito.',
  medico_joven: 'Tengo un minuto libre. ¿Practicamos una más?',
  medico_veterano: 'Hagamos una más. Lo peor que puede pasar es que aprendamos algo.',
};

export function QuickInvitation({ activity, accept, dismiss }: {
  activity: QuickActivity;
  accept: () => void;
  dismiss: () => void;
}) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { dias } = useRacha(events);
  const { actual } = obtenerEvolucion(dias);

  return <aside className="recordatorio-racha" aria-labelledby="quick-invitation-title">
    <div className="recordatorio-racha-retrato"><Mascota etapa={actual.id} animacion="estatica"/></div>
    <div className="recordatorio-racha-texto" aria-live="polite">
      <h2 id="quick-invitation-title">¿Una práctica rápida?</h2>
      <p>{messages[actual.id]}</p>
      <small>{activity.kind === 'clinical' ? 'Caso clínico' : 'Reto de anatomía'} · {activity.label} · {activity.seconds} s</small>
    </div>
    <button type="button" className="recordatorio-racha-cerrar" aria-label="Ahora no" onClick={dismiss}><X size={21} aria-hidden="true"/></button>
    <Button onClick={accept}>Aceptar práctica rápida <ArrowRight size={17} aria-hidden="true"/></Button>
  </aside>;
}

type Outcome = { kind: 'finished'; score: Score } | { kind: 'expired' };
const remainingTime = (deadline: number, durationMs: number) => Math.min(durationMs, Math.max(0, deadline - Date.now()));

function QuickClock({ deadline, durationSeconds }: { deadline: number; durationSeconds: number }) {
  const durationMs = durationSeconds * 1000;
  const [remaining, setRemaining] = useState(() => remainingTime(deadline, durationMs));
  const seconds = Math.ceil(remaining / 1000);
  useEffect(() => {
    const tick = window.setInterval(() => setRemaining(remainingTime(deadline, durationMs)), 200);
    return () => window.clearInterval(tick);
  }, [deadline, durationMs]);

  return <div className="quick-practice-clock" data-urgent={seconds <= 10}>
    <strong><Timer size={20} aria-hidden="true"/> Práctica rápida</strong>
    <span role="timer" aria-label="Tiempo restante">{seconds} s</span>
    <progress className="quick-practice-time" max={durationMs} value={remaining} aria-hidden="true"/>
  </div>;
}

function QuickResult({ outcome, onExit }: { outcome: Outcome; onExit: () => void }) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { dias } = useRacha(events);
  const { actual } = obtenerEvolucion(dias);
  const expired = outcome.kind === 'expired';
  const score = expired ? undefined : outcome.score;
  const level = score ? performanceLevel(score) : 'review';
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const Heading = expired ? 'h1' : 'h2';

  return <Card className="quick-outcome" data-level={level}>
    {level === 'strong' && <ClinicalConfetti/>}
    <div>
      <p className="lumar-eyebrow">Práctica rápida</p>
      <Heading tabIndex={-1} ref={heading}>
        {expired ? 'Se acabó el tiempo' : level === 'strong' ? '¡Buen trabajo!' : 'Práctica terminada'}
      </Heading>
      {score ? <>
        <p className="quick-outcome-score">{Math.round(scoreRatio(score) * 100)}% <span>de aciertos</span></p>
        <p>Respuesta registrada</p>
      </> : <>
        <p>Las respuestas se guardan al completar la práctica.</p>
        <Button onClick={onExit}>Volver</Button>
      </>}
    </div>
    <Mascota className="quick-outcome-mascot" etapa={actual.id}
      animacion={level === 'strong' ? 'celebracion' : level === 'review' ? 'triste' : 'reposo'}/>
  </Card>;
}

export function QuickPractice({ activity, deadline, onExit }: { activity: QuickActivity; deadline: number; onExit: () => void }) {
  const [outcome, setOutcome] = useState<Outcome>();
  const settled = useRef(false);

  useEffect(() => {
    if (outcome) return;
    const expire = () => {
      if (settled.current) return;
      settled.current = true;
      setOutcome({ kind: 'expired' });
    };
    const checkDeadline = () => { if (Date.now() >= deadline) expire(); };
    const timeout = window.setTimeout(expire, Math.max(0, deadline - Date.now()));
    document.addEventListener('visibilitychange', checkDeadline);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', checkDeadline);
    };
  }, [deadline, outcome]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  function finish(score: Score) {
    if (settled.current) return false;
    const inTime = Date.now() < deadline;
    settled.current = true;
    setOutcome(inTime ? { kind: 'finished', score } : { kind: 'expired' });
    return inTime;
  }

  if (outcome?.kind === 'expired') return <section className="lumar-page"><QuickResult outcome={outcome} onExit={onExit}/></section>;

  return <div className="quick-practice">
    {outcome ? <QuickResult outcome={outcome} onExit={onExit}/> : <QuickClock deadline={deadline} durationSeconds={activity.seconds}/>}
    {activity.kind === 'clinical' ? <ClinicalSession caseIds={[activity.caseId]} onExit={onExit} finishTimed={finish}/>
      : <Juego reto={activity.reto} modo="evaluacion" quick={{ finish, exit: onExit }}/>}
  </div>;
}
