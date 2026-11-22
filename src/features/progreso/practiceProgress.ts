import { casos } from '../../content/casos/rodilla';
import { clinicalCases } from '../../content/casos/session';
import { clinicalModeLabels } from '../../content/casos/sessionTypes';
import { retos } from '../../content/ejercicios/retos';
import { retoTypeLabels } from '../../content/types';
import type { PracticeEvent, PracticeSessionMode, ProgressEvent } from '../../shared/progreso';
import { isPerfectCase, scoreRatio, strongScoreRatio } from '../casos/clinicalEngine';
import { retoTuvoReintentos, tituloResultadoReto } from '../retos/intentos';

export type PracticeGroup = 'clinical' | 'challenge';
export const practiceGroupLabels = { clinical: 'Casos clínicos', challenge: 'Retos de anatomía' } satisfies Record<PracticeGroup, string>;

export type PracticeFormat = PracticeSessionMode | 'rapida';
export type PracticeFormatFilter = PracticeFormat | 'all';
export const practiceFormatLabels: Record<PracticeFormat, string> = {
  entrenamiento: 'Entrenamiento',
  evaluacion: 'Evaluación',
  rapida: 'Práctica rápida',
};

export function practiceFormat(event: PracticeEvent): PracticeFormat {
  if (event.quick) return 'rapida';
  if (event.context?.kind === 'reto') return event.context.mode;
  return event.mode ?? 'entrenamiento';
}

export function readPracticeFormat(value?: string): PracticeFormatFilter {
  return value === 'rapida' || value === 'entrenamiento' || value === 'evaluacion' ? value : 'all';
}

export const practiceModeLabels = {
  ...clinicalModeLabels,
  ...retoTypeLabels,
  'other-clinical': 'Otros casos clínicos',
  'other-challenge': 'Otros retos de anatomía',
};
export type PracticeMode = keyof typeof practiceModeLabels;

const groupModes: Record<PracticeGroup, readonly PracticeMode[]> = {
  clinical: [...Object.keys(clinicalModeLabels) as (keyof typeof clinicalModeLabels)[], 'other-clinical'],
  challenge: [...Object.keys(retoTypeLabels) as (keyof typeof retoTypeLabels)[], 'other-challenge'],
};

export const clinicalCatalog = new Map(clinicalCases.map(item => [item.id, item]));
export const challengeCatalog = new Map(retos.map(item => [item.id, item]));
const previousCaseTitles = new Map(casos.map(item => [item.id, item.titulo]));

export const practiceId = (event: PracticeEvent) => event.activityId ?? event.itemId;

export function practiceGroup(event: PracticeEvent): PracticeGroup | undefined {
  if (event.context?.kind === 'reto') return 'challenge';
  if (event.groupId === 'clinical-cases') return 'clinical';
  if (challengeCatalog.has(practiceId(event))) return 'challenge';
}

export function practiceTitle(event: PracticeEvent) {
  const id = practiceId(event);
  const reto = challengeCatalog.get(id);
  if (reto) return tituloResultadoReto(reto, event);
  return clinicalCatalog.get(id)?.titleEs ?? previousCaseTitles.get(id) ?? 'Actividad registrada';
}

interface ModeTotals { kind: PracticeMode; group: PracticeGroup; count: number; correct: number; errors: number }

export function practiceProgress(events: readonly ProgressEvent[], filter: PracticeFormatFilter = 'all') {
  const totals = { clinical: 0, challenge: 0 };
  const formats = { entrenamiento: 0, evaluacion: 0, rapida: 0 };
  const byMode = new Map<PracticeMode, ModeTotals>();
  for (const group of ['clinical', 'challenge'] as const) {
    for (const kind of groupModes[group]) byMode.set(kind, { kind, group, count: 0, correct: 0, errors: 0 });
  }
  let perfect = 0;

  for (const event of events) {
    if (event.kind !== 'practice') continue;
    const group = practiceGroup(event);
    if (!group) continue;
    const format = practiceFormat(event);
    formats[format] += 1;
    if (filter !== 'all' && filter !== format) continue;
    totals[group] += 1;
    const id = practiceId(event);
    const reto = group === 'challenge' ? challengeCatalog.get(id) : undefined;
    if (isPerfectCase(event) && (!reto || !retoTuvoReintentos(reto, event))) perfect += 1;
    const kind = group === 'clinical' ? clinicalCatalog.get(id)?.kind ?? 'other-clinical'
      : reto?.tipo ?? 'other-challenge';
    const mode = byMode.get(kind)!;
    mode.count += 1;
    mode.correct += event.correct + (event.assisted ?? 0);
    mode.errors += event.errors;
  }

  const modes = [...byMode.values()].map(mode => ({
    kind: mode.kind, group: mode.group, count: mode.count,
    ratio: mode.correct + mode.errors > 0 ? scoreRatio(mode) : null,
  }));
  const available = modes.filter(({ kind }) => kind !== 'other-clinical' && kind !== 'other-challenge');
  const weakest = available.filter(mode => mode.ratio !== null && mode.ratio < strongScoreRatio)
    .sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0) || a.count - b.count)[0];
  const leastPracticed = available.sort((a, b) => a.count - b.count)[0];
  const completed = totals.clinical + totals.challenge;
  const recommended = weakest ?? (completed > 0 ? leastPracticed : undefined);
  const toDisplayMode = ({ kind, group, count, ratio }: typeof modes[number]) => ({
    kind, group, count, accuracy: ratio === null ? null : Math.round(ratio * 100),
  });

  return {
    ...totals, completed, perfect, formats,
    perfectRate: completed ? Math.round(perfect / completed * 100) : 0,
    modes: modes.map(toDisplayMode),
    recommendation: recommended && { ...toDisplayMode(recommended), reason: weakest ? 'accuracy' as const : 'frequency' as const },
  };
}

type Recommendation = NonNullable<ReturnType<typeof practiceProgress>['recommendation']>;

export function recommendationHref({ group, kind }: Pick<Recommendation, 'group' | 'kind'>, format?: PracticeFormatFilter) {
  return `#practicar/${group === 'clinical' ? 'casos' : 'retos'}/modo/${kind}${format === 'evaluacion' ? '/evaluacion' : ''}`;
}

export function recommendationReason(recommendation: Recommendation) {
  if (recommendation.reason === 'accuracy') return `Tu promedio más bajo está en este modo, con ${recommendation.accuracy}% de aciertos.`;
  return recommendation.count ? 'Es uno de los modos que menos has practicado.' : 'Todavía puedes explorar este modo por primera vez.';
}
