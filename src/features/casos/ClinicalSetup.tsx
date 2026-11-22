import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { categorias } from '../../content/anatomy/catalogo';
import type { ClinicalCase } from '../../content/casos/sessionTypes';
import type { CategoriaAnatomica, ModoReto } from '../../content/types';
import { EvaluationMode } from '../../shared/evaluacion/EvaluationMode';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { casesForTopic } from './clinicalEngine';

type Topic = CategoriaAnatomica | 'aleatorio';
const topics = [{ id: 'aleatorio', nombre: 'Aleatorio' }, ...categorias] as const;

export function ClinicalSetup({ title, cases, defaultCount, onBack, onStart }: {
  title: string;
  cases: readonly ClinicalCase[];
  defaultCount: number;
  onBack: () => void;
  onStart: (cases: readonly ClinicalCase[], count: number, mode: ModoReto) => void;
}) {
  const limit = Math.min(10, cases.length);
  const counts = [...new Set([1, 2, 3, 5, 10, limit])].filter(count => count > 0 && count <= limit)
    .sort((a, b) => a - b);
  const [count, setCount] = useState(Math.min(defaultCount, limit));
  const [topic, setTopic] = useState<Topic>('aleatorio');
  const [mode, setMode] = useState<ModoReto>('entrenamiento');
  const heading = useRef<HTMLHeadingElement>(null);
  const pool = casesForTopic(cases, topic);
  const available = Math.min(count, pool.length);
  const shortage = available > 0 && available < count;

  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="lumar-page clinical-home">
    <header>
      <Button variant="text" className="clinical-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true"/> Volver a Casos clínicos
      </Button>
      <h1 tabIndex={-1} ref={heading}>{title}</h1>
    </header>
    <Card className="evaluation-config">
      <h2>¿Qué quieres practicar?</h2>
      <label className="evaluation-select">Cantidad de casos
        <select value={count} onChange={event => setCount(Number(event.target.value))}>
          {counts.map(value => <option key={value} value={value}>{value} {value === 1 ? 'caso' : 'casos'}</option>)}
        </select>
      </label>
      <label className="evaluation-select">Tema
        <select value={topic} onChange={event => {
          const selected = topics.find(option => option.id === event.target.value);
          if (selected) setTopic(selected.id);
        }}>
          {topics.map(option => <option key={option.id} value={option.id}>{option.nombre}</option>)}
        </select>
      </label>
      <p className="evaluation-availability" role="status" hidden={!shortage && available > 0}>
        {shortage ? (available === 1 ? 'Hay 1 caso disponible para este tema.' : `Hay ${available} casos disponibles para este tema.`)
          : 'No hay casos de este tipo para el tema. Elige otro tema o Aleatorio.'}
      </p>
      <EvaluationMode mode={mode} onChange={setMode} evaluationDescription="Sin pistas. Verás la corrección al comprobar cada caso."/>
      <Button className="evaluation-start" disabled={!available} onClick={() => onStart(pool, available, mode)}>
        {shortage ? (available === 1 ? 'Hacer el caso disponible' : `Hacer los ${available} casos disponibles`) : 'Empezar práctica'}
      </Button>
    </Card>
  </section>;
}
