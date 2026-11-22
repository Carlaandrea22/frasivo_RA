import { readPracticeFormat, type PracticeFormat, type PracticeFormatFilter } from './practiceProgress';

const options = [
  { id: 'all', label: 'Todos' },
  { id: 'rapida', label: 'Solo rápidas' },
  { id: 'entrenamiento', label: 'Solo entrenamiento' },
  { id: 'evaluacion', label: 'Solo evaluaciones' },
] as const;

export function progressHref(screen: 'overview' | 'history', format: PracticeFormatFilter) {
  if (screen === 'history') return format === 'all' ? '#progreso/practicas' : `#progreso/practicas/${format}`;
  return format === 'all' ? '#progreso' : `#progreso/actividad/${format}`;
}

export function PracticeFormatSelect({ format, counts, onChange }: {
  format: PracticeFormatFilter;
  counts?: Readonly<Record<PracticeFormat, number>>;
  onChange: (format: PracticeFormatFilter) => void;
}) {
  return <label className="progress-format-select">
    Modalidad de práctica
    <select value={format} onChange={event => onChange(readPracticeFormat(event.target.value))}>
      {options.map(({ id, label }) => {
        const count = counts && (id === 'all' ? counts.rapida + counts.entrenamiento + counts.evaluacion : counts[id]);
        return <option key={id} value={id}>{label}{count !== undefined && ` (${count})`}</option>;
      })}
    </select>
  </label>;
}
