import { ArrowRight, Route } from 'lucide-react';
import { clinicalModeLabels } from '../../content/casos/sessionTypes';
import { Card } from '../../shared/ui/Card';
import type { clinicalProgress } from './clinicalProgress';

const modeColors = {
  interview: '#2b8067',
  investigation: '#5a75b8',
  ordering: '#d69832',
  'multiple-choice': '#b85d48',
} as const;

export function ClinicalActivity({ modes, recommendation }: Pick<ReturnType<typeof clinicalProgress>, 'modes' | 'recommendation'>) {
  const total = modes.reduce((sum, { count }) => sum + count, 0);
  let end = 0;
  const slices = modes.filter(mode => mode.count > 0).map(({ kind, count }) => {
    const start = end;
    end += count;
    return `${modeColors[kind]} ${start / total * 100}% ${end / total * 100}%`;
  });

  return <Card className="progress-entry progress-activity">
    <h2>Casos por tipo de ejercicio</h2>
    {total === 0 ? <>
      <p>Completa un caso para empezar a ver qué tipos practicas.</p>
      <a className="button button--secondary lumar-link progress-practice-link" href="#practicar/casos">Ir a casos clínicos <ArrowRight size={16}/></a>
    </> : <div className="progress-activity-breakdown">
      <div className="progress-donut" aria-hidden="true" style={{ backgroundImage: `conic-gradient(${slices.join(', ')})` }}>
        <div><strong>{total}</strong><span>{total === 1 ? 'caso' : 'casos'}</span></div>
      </div>
      <ul className="progress-activity-legend" aria-label="Casos realizados por modo">
        {modes.map(({ kind, count }) => <li key={kind}>
          <i style={{ backgroundColor: modeColors[kind] }} aria-hidden="true"/>
          <span>{clinicalModeLabels[kind]}</span>
          <strong>{count}</strong>
        </li>)}
      </ul>
    </div>}
    {recommendation && <div className="progress-recommendation">
      <Route size={21} aria-hidden="true"/>
      <div>
        <p className="progress-caption">Sugerencia de práctica</p>
        <h3>{clinicalModeLabels[recommendation.kind]}</h3>
        <p>{recommendation.reason === 'accuracy'
          ? `Tu promedio más bajo está en este modo, con ${recommendation.accuracy}% de aciertos.`
          : recommendation.count ? 'Es uno de los modos que menos has practicado.' : 'Todavía puedes explorar este modo por primera vez.'}</p>
      </div>
      <a className="button button--secondary lumar-link progress-practice-link" href="#practicar/casos">Ir a casos clínicos <ArrowRight size={16}/></a>
    </div>}
  </Card>;
}
