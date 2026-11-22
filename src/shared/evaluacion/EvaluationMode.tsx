import { retoModeLabels, type ModoReto } from '../../content/types';
import { Segmented } from '../ui/Segmented';
import './evaluacion.css';

const modes = ['entrenamiento', 'evaluacion'] as const;

export function EvaluationMode({ mode, onChange, options = modes, evaluationDescription }: {
  mode: ModoReto;
  onChange: (mode: ModoReto) => void;
  options?: readonly ModoReto[];
  evaluationDescription: string;
}) {
  return <>
    <h2>Elige un modo</h2>
    <Segmented label="Modo de práctica" value={mode}
      options={options.map(id => ({ id, label: retoModeLabels[id] }))}
      onChange={id => {
        const selected = options.find(option => option === id);
        if (selected) onChange(selected);
      }}/>
    <p role="status">{mode === 'entrenamiento'
      ? 'Puedes usar las pistas disponibles y volver a intentarlo.'
      : evaluationDescription}</p>
  </>;
}
