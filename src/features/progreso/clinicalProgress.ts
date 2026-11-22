import { clinicalCases } from '../../content/casos/session';
import { clinicalModeLabels, type ClinicalCase } from '../../content/casos/sessionTypes';
import type { ProgressEvent } from '../../shared/progreso';
import { isPerfectCase, scoreRatio, strongScoreRatio } from '../casos/clinicalEngine';

type Mode = ClinicalCase['kind'];
export const clinicalCatalog = new Map(clinicalCases.map(item => [item.id, item]));

export function clinicalProgress(events: readonly ProgressEvent[]) {
  const byMode = new Map<Mode, { kind: Mode; count: number; correct: number; errors: number }>(
    (Object.keys(clinicalModeLabels) as Mode[]).map(kind => [kind, { kind, count: 0, correct: 0, errors: 0 }]));
  let completed = 0;
  let perfect = 0;

  for (const event of events) {
    if (event.kind !== 'practice' || event.groupId !== 'clinical-cases') continue;
    completed += 1;
    if (isPerfectCase(event)) perfect += 1;
    const item = clinicalCatalog.get(event.activityId ?? event.itemId);
    const mode = item && byMode.get(item.kind);
    if (!mode) continue;
    mode.count += 1;
    mode.correct += event.correct + (event.assisted ?? 0);
    mode.errors += event.errors;
  }

  const modes = [...byMode.values()].map(mode => ({
    kind: mode.kind,
    count: mode.count,
    ratio: mode.correct + mode.errors > 0 ? scoreRatio(mode) : null,
  }));
  const weakest = modes.filter(mode => mode.ratio !== null && mode.ratio < strongScoreRatio)
    .sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0) || a.count - b.count)[0];
  const leastPracticed = [...modes].sort((a, b) => a.count - b.count)[0];
  const recommended = weakest ?? (modes.some(mode => mode.count > 0) ? leastPracticed : undefined);
  const toDisplayMode = ({ kind, count, ratio }: typeof modes[number]) => ({
    kind, count, accuracy: ratio === null ? null : Math.round(ratio * 100),
  });

  return {
    completed,
    perfect,
    perfectRate: completed ? Math.round(perfect / completed * 100) : 0,
    modes: modes.map(toDisplayMode),
    recommendation: recommended && { ...toDisplayMode(recommended), reason: weakest ? 'accuracy' as const : 'frequency' as const },
  };
}
