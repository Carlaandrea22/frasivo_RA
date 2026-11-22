import { ArrowRight, Route } from 'lucide-react';
import { Card } from '../../shared/ui/Card';
import { practiceModeLabels, recommendationHref, recommendationReason, type PracticeMode, type practiceProgress } from './practiceProgress';

const modeColors = {
  interview: '#2b8067',
  investigation: '#5a75b8',
  ordering: '#d69832',
  'multiple-choice': '#b85d48',
  matching: '#44788e',
  'ubica-partes': '#785aa4',
  'senala-estructura': '#27889d',
  'relaciona-funcion': '#b7527c',
  'repaso-breve': '#687f38',
  'other-clinical': '#637775',
  'other-challenge': '#87725c',
} satisfies Record<PracticeMode, string>;

export function PracticeActivity({ modes, recommendation }: Pick<ReturnType<typeof practiceProgress>, 'modes' | 'recommendation'>) {
  const total = modes.reduce((sum, { count }) => sum + count, 0);
  const practiced = modes.filter(mode => mode.count > 0);
  let end = 0;
  const slices = practiced.map(({ kind, count }) => {
    const start = end;
    end += count;
    return `${modeColors[kind]} ${start / total * 100}% ${end / total * 100}%`;
  });

  return <Card className="progress-entry progress-activity">
    <h2>Prácticas por tipo de ejercicio</h2>
    {total === 0 ? <>
      <p>Completa un caso clínico o un reto de anatomía para ver tu distribución.</p>
      <a className="button button--secondary lumar-link progress-practice-link" href="#practicar">Ir a Practicar <ArrowRight size={16}/></a>
    </> : <div className="progress-activity-breakdown">
      <div className="progress-donut" aria-hidden="true" style={{ backgroundImage: `conic-gradient(${slices.join(', ')})` }}>
        <div><strong>{total}</strong><span>{total === 1 ? 'práctica' : 'prácticas'}</span></div>
      </div>
      <ul className="progress-activity-legend" aria-label="Distribución de prácticas">
        {practiced.map(({ kind, count }) => <li key={kind}>
          <i style={{ backgroundColor: modeColors[kind] }} aria-hidden="true"/>
          <span>{practiceModeLabels[kind]}</span>
          <strong>{count}</strong>
        </li>)}
      </ul>
    </div>}
    {recommendation && <div className="progress-recommendation">
      <Route size={21} aria-hidden="true"/>
      <div>
        <p className="progress-caption">Sugerencia de práctica</p>
        <h3>{practiceModeLabels[recommendation.kind]}</h3>
        <p>{recommendationReason(recommendation)}</p>
      </div>
      <a className="button button--secondary lumar-link progress-practice-link"
        href={recommendationHref(recommendation)}>
        Practicar este modo <ArrowRight size={16}/>
      </a>
    </div>}
  </Card>;
}
