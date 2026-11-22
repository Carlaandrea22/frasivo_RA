import type {
  ChoiceOption,
  ClinicalCase,
  ConversationNode,
  InvestigationCase,
  InterviewNode,
  InterviewRecallOption,
  InterviewResponse,
} from '../../content/casos/sessionTypes';

export type RandomSource = () => number;

function randomIndex(length: number, random: RandomSource): number {
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1, random);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function buildCaseSession(ids: readonly string[], random: RandomSource = Math.random): string[] {
  return shuffled([...new Set(ids)], random).slice(0, 5);
}

export function buildMixedCaseSession(cases: readonly ClinicalCase[], random: RandomSource = Math.random): string[] {
  const pool = shuffled(cases, random);
  const firstByKind = new Map<ClinicalCase['kind'], string>();
  for (const item of pool) {
    if (!firstByKind.has(item.kind)) firstByKind.set(item.kind, item.id);
  }
  const required = [...firstByKind.values()];
  const extras = pool.filter(item => firstByKind.get(item.kind) !== item.id).slice(0, 5 - required.length);
  return buildCaseSession([...required, ...extras.map(item => item.id)], random);
}

export interface RecallQuestion {
  promptEn: string;
  promptEs: string;
  correctId: string;
  options: readonly InterviewRecallOption[];
}

export interface InterviewExchange {
  prompt: InterviewNode;
  response: InterviewResponse;
  recall: RecallQuestion;
}

export function createInterviewExchange(
  prompt: InterviewNode,
  random: RandomSource = Math.random,
): InterviewExchange {
  const response = { patientEn: prompt.patientEn, patientEs: prompt.patientEs };
  const options = shuffled(prompt.recallOptions, random);
  return {
    prompt,
    response,
    recall: {
      promptEn: prompt.recallPromptEn,
      promptEs: prompt.recallPromptEs,
      correctId: prompt.recallCorrectId,
      options,
    },
  };
}

export function getInterviewChoices<Node extends ConversationNode>(
  item: { nodes: readonly Node[]; roots: readonly string[] },
  path: readonly string[],
): Node[] {
  if (path.length >= 3) return [];
  const nodeMap = new Map(item.nodes.map(node => [node.id, node]));
  let choiceIds: readonly string[] = item.roots;
  for (const selectedId of path) {
    if (!choiceIds.includes(selectedId)) return [];
    const selected = nodeMap.get(selectedId);
    if (!selected?.nextIds) return [];
    choiceIds = selected.nextIds;
  }
  return choiceIds.map(id => nodeMap.get(id)).filter((node): node is Node => !!node);
}

export function validateInterviewGraph(item: { roots: readonly string[]; nodes: readonly ConversationNode[] }) {
  const errors: string[] = [];
  const ids = item.nodes.map(node => node.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate-node-id');
  let pathCount = 0;

  const visit = (path: readonly string[]) => {
    const choices = getInterviewChoices(item, path);
    if (choices.length !== 3 || new Set(choices.map(choice => choice.id)).size !== 3 || choices.some(choice => path.includes(choice.id))) {
      errors.push(`turn-${path.length + 1}:${path.join('/') || 'root'}:${choices.length}`);
      return;
    }
    if (path.length === 2) {
      pathCount += choices.length;
      return;
    }
    for (const choice of choices) visit([...path, choice.id]);
  };

  visit([]);
  return { valid: errors.length === 0 && pathCount === 27, pathCount, errors };
}

export function scoreInvestigation(item: InvestigationCase, path: readonly string[], hypothesisId: string) {
  const foundIds = new Set(path.map(id => item.nodes.find(node => node.id === id)?.findingId));
  const findings = item.findings.filter(finding => foundIds.has(finding.id));
  const correct = Number(hypothesisId === item.preferredHypothesisId);
  return { findings, correct, errors: 1 - correct };
}

export type PerformanceLevel = 'strong' | 'partial' | 'review';

type GradedScore = { correct: number; errors: number; assisted?: number; hints?: number; retried?: boolean };
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

export function moveItem(items: readonly string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return [...items];
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export interface OrderingHintResult {
  order: string[];
  lockedIds: string[];
  hintedId?: string;
}

export function applyOrderingHint(
  order: readonly string[],
  expected: readonly string[],
  lockedIds: readonly string[],
  random: RandomSource = Math.random,
): OrderingHintResult {
  const limit = Math.min(3, Math.max(0, expected.length - 1));
  if (lockedIds.length >= limit) return { order: [...order], lockedIds: [...lockedIds] };
  const locked = new Set(lockedIds);
  const unlockedIndexes = expected.flatMap((id, index) => locked.has(id) ? [] : [index]);
  const incorrectIndexes = unlockedIndexes.filter(index => order[index] !== expected[index]);
  const candidates = incorrectIndexes.length ? incorrectIndexes : unlockedIndexes;
  if (!candidates.length) return { order: [...order], lockedIds: [...lockedIds] };
  const targetIndex = candidates[randomIndex(candidates.length, random)];
  const hintedId = expected[targetIndex];
  const fromIndex = order.indexOf(hintedId);
  if (fromIndex < 0 || locked.has(order[targetIndex])) return { order: [...order], lockedIds: [...lockedIds] };
  const nextOrder = [...order];
  [nextOrder[targetIndex], nextOrder[fromIndex]] = [nextOrder[fromIndex], nextOrder[targetIndex]];
  return {
    order: nextOrder,
    lockedIds: [...lockedIds, hintedId],
    hintedId,
  };
}

export function scoreOrderedActions(
  selected: readonly string[],
  expected: readonly string[],
  lockedIds: readonly string[] = [],
) {
  let correct = 0;
  let assisted = 0;
  const locked = new Set(lockedIds);
  for (let index = 0; index < selected.length; index += 1) {
    if (selected[index] !== expected[index]) continue;
    if (locked.has(selected[index])) assisted += 1;
    else correct += 1;
  }
  return {
    correct,
    errors: selected.length - correct - assisted,
    assisted,
    hints: lockedIds.length,
    complete: selected.length === expected.length,
  };
}

export function scoreMultipleChoice(selectedId: string, correctId: string) {
  return selectedId === correctId ? { correct: 1, errors: 0 } : { correct: 0, errors: 1 };
}

export function discardIncorrectChoice(
  options: readonly Pick<ChoiceOption, 'id'>[],
  correctId: string,
  selectedId: string | undefined,
  random: RandomSource = Math.random,
): string | undefined {
  const candidates = options.filter(option => option.id !== correctId && option.id !== selectedId);
  if (!candidates.length) return undefined;
  return candidates[randomIndex(candidates.length, random)].id;
}
