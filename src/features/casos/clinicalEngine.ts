import type {
  ChoiceOption,
  InterviewCase,
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

export function getInterviewChoices(item: InterviewCase, path: readonly string[]): InterviewNode[] {
  if (path.length >= 3) return [];
  const nodeMap = new Map(item.nodes.map(node => [node.id, node]));
  let choiceIds: readonly string[] = item.roots;
  for (const selectedId of path) {
    if (!choiceIds.includes(selectedId)) return [];
    const selected = nodeMap.get(selectedId);
    if (!selected?.nextIds) return [];
    choiceIds = selected.nextIds;
  }
  return choiceIds.map(id => nodeMap.get(id)).filter((node): node is InterviewNode => !!node);
}

export function validateInterviewGraph(item: InterviewCase) {
  const errors: string[] = [];
  const ids = item.nodes.map(node => node.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate-node-id');
  let pathCount = 0;

  const visit = (path: readonly string[]) => {
    const choices = getInterviewChoices(item, path);
    if (choices.length !== 3) {
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

export type PerformanceLevel = 'strong' | 'partial' | 'review';

export function performanceLevel(score: { correct: number; errors: number; assisted?: number }): PerformanceLevel {
  const total = score.correct + score.errors + (score.assisted ?? 0);
  if (!total) return 'review';
  const ratio = score.correct / total;
  if (ratio >= .8) return 'strong';
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
  const incorrectIndexes = expected
    .map((id, index) => ({ id, index }))
    .filter(({ id, index }) => !locked.has(id) && order[index] !== id)
    .map(({ index }) => index);
  if (!incorrectIndexes.length) return { order: [...order], lockedIds: [...lockedIds] };
  const targetIndex = incorrectIndexes[randomIndex(incorrectIndexes.length, random)];
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
  options: readonly ChoiceOption[],
  correctId: string,
  selectedId: string | undefined,
  random: RandomSource = Math.random,
): string | undefined {
  const candidates = options.filter(option => option.id !== correctId && option.id !== selectedId);
  if (!candidates.length) return undefined;
  return candidates[randomIndex(candidates.length, random)].id;
}
