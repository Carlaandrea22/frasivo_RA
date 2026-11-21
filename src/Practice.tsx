import { useId, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react';
import { checkAnswer, createQuestions, type Question } from './learning';
import type { Word } from './vocabulary';
interface Props { ids: string[]; onAnswer: (id: string, correct: boolean, questionId: string) => void; onExplore: () => void; questions?: Question[]; onFinish?: () => void }
export function Practice({ ids, onAnswer, onExplore, questions: suppliedQuestions, onFinish }: Props) {
  const [questions] = useState(() => suppliedQuestions ?? createQuestions(ids));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<Word[]>([]);
  const locked = useRef(false);
  const answerId = useId();
  if (!questions.length) return <section className="empty-practice"><span className="big-emoji">🌱</span><h2>Primero, descubre una palabra</h2><p>Escanea un objeto o elige vocabulario en la práctica manual.</p><button className="primary" onClick={onExplore}>Ir a explorar <ArrowRight size={18}/></button></section>;
  if (index >= questions.length) return <section className="summary"><div className="summary-icon"><Trophy size={40}/></div><p>Sesión terminada</p><h2>Un poco más de inglés,<br/>un mundo más grande.</h2><div className="summary-stats"><div><strong>{correct * 10}</strong><span>puntos ganados</span></div><div><strong>{Math.round(correct / questions.length * 100)}%</strong><span>respuestas correctas</span></div></div>{missed.length ? <p>Para repasar: {[...new Map(missed.map(w => [w.id, w])).values()].map(w => w.en).join(', ')}.</p> : <p>¡Respondiste todas correctamente!</p>}<button className="primary" onClick={onExplore}>Seguir explorando <ArrowRight size={18}/></button></section>;
  const q = questions[index];
  const submit = (value: string) => {
    if (locked.current || !value.trim()) return;
    locked.current = true;
    const right = checkAnswer(q, value);
    setAnswer(value); setResult(right); onAnswer(q.word.id, right, q.id);
    if (right) setCorrect(c => c + 1); else setMissed(m => [...m, q.word]);
  };
  return <section className="practice-card">
    <div className="practice-top"><span>{q.type === 'identify' ? 'Identifica el objeto' : q.type === 'complete' ? 'Completa la oración' : 'Relaciona las palabras'}</span><span>{index + 1} de {questions.length}</span></div>
    <progress value={index} max={questions.length} aria-label="Avance de la práctica"/>
    <div className="exercise-object" aria-label={q.word.es}>{q.word.emoji}</div>
    <h2>{q.prompt}</h2>
    <p>{q.type === 'identify' ? 'Elige el nombre en inglés.' : q.type === 'complete' ? `Escribe en inglés: ${q.word.es.toLowerCase()}.` : 'Relaciona la palabra en inglés con su traducción.'}</p>
    {q.type === 'complete' ? <form onSubmit={e => { e.preventDefault(); submit(answer); }}><label className="sr-only" htmlFor={answerId}>Palabra en inglés</label><input id={answerId} autoComplete="off" autoCapitalize="none" value={answer} disabled={result !== null} onChange={e => setAnswer(e.target.value)} placeholder="Escribe la palabra…"/><button className="primary" disabled={!answer.trim() || result !== null}>Comprobar <Check size={18}/></button></form> : <div className="answer-options">{q.options.map((option, i) => <button key={option} disabled={result !== null} className={`answer-option ${result !== null && option === q.answer ? 'correct' : result === false && option === answer ? 'incorrect' : ''}`} onClick={() => submit(option)}><span className="option-letter">{String.fromCharCode(65 + i)}</span>{option}{result !== null && option === q.answer ? <Check size={18}/> : null}</button>)}</div>}
    {result !== null ? <div className={`feedback ${result ? 'success' : 'retry'}`} role="status"><div>{result ? <Check size={20}/> : <X size={20}/>}<span><strong>{result ? '¡Bien hecho! +10 puntos' : `La respuesta es: ${q.answer}`}</strong><small>{q.word.example} — {q.word.translation}</small></span></div><button className="primary" onClick={() => { if (index + 1 === questions.length && onFinish) { onFinish(); return; } locked.current = false; setIndex(i => i + 1); setAnswer(''); setResult(null); }}>{index + 1 === questions.length ? 'Ver resumen' : 'Siguiente'} <ArrowRight size={18}/></button></div> : <div className="practice-note"><RotateCcw size={15}/> Equivocarse también es parte de aprender.</div>}
  </section>;
}
