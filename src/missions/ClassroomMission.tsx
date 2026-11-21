import { useState } from 'react';
import { ArrowRight, Check, Flag, RotateCcw, Trophy, Volume2 } from 'lucide-react';
import { wordById } from '../vocabulary';
import { classroomChoices, missionInstruction, type ClassroomMission } from './classroom';

export function MissionEntry({ onOpen }: { onOpen: () => void }) {
  return <button className="mission-entry" onClick={onOpen}><span className="mission-entry-icon"><Flag size={21}/></span><span><strong>Un reto para tu próxima exploración</strong><small>Encuentra tres objetos del aula y practica sus palabras.</small></span><span className="mission-entry-action">Ver misión <ArrowRight size={17}/></span></button>;
}

export function MissionIntro({ mission, onStart }: { mission: ClassroomMission; onStart: (ids: string[]) => void }) {
  const [selected, setSelected] = useState(mission.targets);
  return <section className="mission-intro">
    <div className="mission-intro-copy"><span className="mission-category"><Flag size={15}/> Misión del aula</span><h2>Tu aula tiene un reto para ti.</h2><p>Escucha qué objeto buscar, encuéntralo con la cámara y toca su etiqueta. Al terminar, harás tres ejercicios cortos.</p><div className="mission-facts"><span>3 objetos</span><span>3 ejercicios</span><span>Hasta 60 puntos</span></div></div>
    <div className="mission-object-preview" aria-label="Objetivos elegidos">{selected.map(id => { const w = wordById(id)!; return <div key={id}><span aria-hidden="true">{w.emoji}</span><strong>{w.en}</strong><small>{w.es}</small></div>; })}</div>
    <details className="mission-picker"><summary>Cambiar objetos <span>{selected.length}/3 elegidos</span></summary><p>Elige objetos que tengas a mano. Para cambiar uno, quítalo primero de la selección.</p><div className="mission-choices">{classroomChoices.map(id => { const word = wordById(id)!; const chosen = selected.includes(id); return <button key={id} type="button" aria-pressed={chosen} disabled={!chosen && selected.length === 3} className={chosen ? 'chosen' : ''} onClick={() => setSelected(old => chosen ? old.filter(item => item !== id) : [...old, id])}><span>{word.emoji}</span><span>{word.en}<small>{word.es}</small></span>{chosen ? <Check size={16}/> : null}</button>; })}</div></details>
    <div className="mission-start-row"><button className="primary" disabled={selected.length !== 3} onClick={() => onStart(selected)}><Volume2 size={18}/> Empezar y escuchar</button><p>10 puntos por objeto encontrado y 10 por ejercicio correcto.<br/>El audio tiene instrucciones escritas para que puedas seguir sin sonido.</p></div>
  </section>;
}

export function MissionBanner({ mission, onReplay, onNext, onReset }: { mission: ClassroomMission; onReplay: () => void; onNext: () => void; onReset: () => void }) {
  const [hint, setHint] = useState(false);
  const target = wordById(mission.targets[mission.index])!;
  const found = mission.phase === 'found';
  return <section className={`mission-banner ${found ? 'found' : ''}`} aria-label="Reto actual">
    <div className="mission-banner-top"><span><Flag size={16}/> Objeto {mission.index + 1} de 3</span><strong>{mission.points} puntos de misión</strong></div>
    <div className="mission-banner-body"><div><h2>{found ? `¡Encontraste ${target.en}!` : missionInstruction(mission)}</h2><p>{found ? '+10 puntos. Escucha la frase o continúa con el reto.' : 'Encuentra el objeto real y toca su etiqueta en la cámara.'}</p></div><button className="mission-audio" onClick={onReplay}><Volume2 size={19}/>{found ? 'Escuchar frase' : 'Escuchar reto'}</button></div>
    {mission.notice ? <p className="mission-notice" role="status">{mission.notice === 'not-visible' ? 'Ese objeto ya no está visible. Vuelve a apuntarle antes de seleccionarlo.' : `Ese objeto es ${wordById(mission.wrongWordId ?? '')?.en ?? 'otro objeto'}. El reto pide ${target.en}.`}</p> : null}
    {!found ? <button className="text-button mission-hint-button" aria-expanded={hint} onClick={() => setHint(v => !v)}>{hint ? 'Ocultar pista' : 'Ver pista en español'}</button> : null}
    {hint && !found ? <p className="mission-hint">Busca: <strong>{target.es.toLowerCase()}</strong>.</p> : null}
    <ol className="mission-targets" aria-label="Objetivos de la misión">{mission.targets.map((id, index) => { const word = wordById(id)!; const done = mission.found.includes(id); return <li key={id} className={`${done ? 'done' : ''} ${index === mission.index ? 'current' : ''}`}><span>{done ? <Check size={14}/> : index + 1}</span><span>{word.en}</span></li>; })}</ol>
    <div className="mission-banner-actions">{found ? <button className="primary" onClick={onNext}>{mission.index < 2 ? 'Siguiente objeto' : 'Empezar ejercicios'}<ArrowRight size={17}/></button> : null}<button className="text-button" onClick={onReset}>Elegir otros objetos</button></div>
  </section>;
}

export function MissionSummary({ mission, onReset, onExplore }: { mission: ClassroomMission; onReset: () => void; onExplore: () => void }) {
  const answers = Object.values(mission.answers);
  const correct = answers.filter(a => a.correct).length;
  const missed = answers.filter(a => !a.correct).map(a => wordById(a.wordId)!.en);
  return <section className="summary mission-summary"><div className="summary-icon"><Trophy size={40}/></div><p>Misión completada</p><h2>Exploraste tu aula en inglés.</h2><div className="summary-stats"><div><strong>{mission.points}</strong><span>puntos ganados de 60</span></div><div><strong>3/3</strong><span>objetos encontrados</span></div><div><strong>{correct}/3</strong><span>ejercicios correctos</span></div></div><div className="mission-summary-words">{mission.targets.map(id => { const w = wordById(id)!; return <span key={id}>{w.emoji} {w.en}</span>; })}</div><p>{missed.length ? `Para repasar: ${missed.join(', ')}.` : '¡Respondiste los tres ejercicios correctamente!'}</p><div className="mission-summary-actions"><button className="primary" onClick={onReset}><RotateCcw size={17}/> Repetir misión</button><button className="secondary" onClick={onExplore}>Explorar libremente <ArrowRight size={17}/></button></div></section>;
}
