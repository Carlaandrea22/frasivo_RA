import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Timer, X } from 'lucide-react';
import { getProgress, subscribeProgress } from '../../shared/progreso';
import { useRacha } from '../../shared/progreso/useRacha';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ClinicalSession } from '../casos/ClinicalSession';
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

type Status = 'running' | 'finished' | 'expired';
const remainingTime = (deadline: number, durationMs: number) => Math.min(durationMs, Math.max(0, deadline - Date.now()));

function QuickClock({ deadline, durationSeconds, running }: { deadline: number; durationSeconds: number; running: boolean }) {
  const durationMs = durationSeconds * 1000;
  const [remaining, setRemaining] = useState(() => remainingTime(deadline, durationMs));
  const seconds = Math.ceil(remaining / 1000);
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setRemaining(remainingTime(deadline, durationMs)), 200);
    return () => window.clearInterval(tick);
  }, [deadline, durationMs, running]);

  return <div className="quick-practice-clock" data-urgent={running && seconds <= 10}>
    <strong><Timer size={20} aria-hidden="true"/> Práctica rápida</strong>
    {running ? <span role="timer" aria-label="Tiempo restante">{seconds} s</span>
      : <span role="status">Respuesta registrada</span>}
    {running && <progress className="quick-practice-time" max={durationMs} value={remaining} aria-hidden="true"/>}
  </div>;
}

export function QuickPractice({ activity, deadline, onExit }: { activity: QuickActivity; deadline: number; onExit: () => void }) {
  const [status, setStatus] = useState<Status>('running');
  const current = useRef<Status>('running');
  const expiredHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status !== 'running') return;
    const expire = () => {
      if (current.current !== 'running') return;
      current.current = 'expired';
      setStatus('expired');
    };
    const checkDeadline = () => { if (Date.now() >= deadline) expire(); };
    const timeout = window.setTimeout(expire, Math.max(0, deadline - Date.now()));
    document.addEventListener('visibilitychange', checkDeadline);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', checkDeadline);
    };
  }, [deadline, status]);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if (status === 'expired') expiredHeading.current?.focus(); }, [status]);

  function finish() {
    if (current.current !== 'running') return false;
    const inTime = Date.now() < deadline;
    current.current = inTime ? 'finished' : 'expired';
    setStatus(current.current);
    return inTime;
  }

  if (status === 'expired') return <section className="lumar-page">
    <Card className="quick-timeout">
      <p className="lumar-eyebrow">Práctica rápida</p>
      <h1 tabIndex={-1} ref={expiredHeading}>Se acabó el tiempo</h1>
      <p>Las respuestas se guardan al completar la práctica.</p>
      <Button onClick={onExit}>Volver</Button>
    </Card>
  </section>;

  return <div className="quick-practice">
    <QuickClock deadline={deadline} durationSeconds={activity.seconds} running={status === 'running'}/>
    {activity.kind === 'clinical' ? <ClinicalSession caseIds={[activity.caseId]} onExit={onExit} finishTimed={finish}/>
      : <Juego reto={activity.reto} modo="evaluacion" quick={{ finish, exit: onExit }}/>}
  </div>;
}
