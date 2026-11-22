export type PerformanceLevel = 'strong' | 'partial' | 'review';

export type GradedScore = { correct: number; errors: number; assisted?: number; hints?: number; retried?: boolean };
export const strongScoreRatio = .8;

export function scoreRatio(score: GradedScore) {
  const correct = score.correct + (score.assisted ?? 0);
  const total = correct + score.errors;
  return total > 0 ? correct / total : 0;
}

export function isPerfectCase(score: GradedScore) {
  return !score.retried && scoreRatio(score) === 1;
}

export function isPerfectWithoutHints(score: GradedScore) {
  return isPerfectCase(score) && !score.assisted && !score.hints;
}

export function performanceLevel(score: GradedScore): PerformanceLevel {
  const ratio = scoreRatio(score);
  if (ratio >= strongScoreRatio) return 'strong';
  if (ratio >= .5) return 'partial';
  return 'review';
}
