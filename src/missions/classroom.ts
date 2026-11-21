import { createQuestions, recordAnswer, type Question } from '../learning';
import type { Progress } from '../storage';
import { wordById } from '../vocabulary';

export const classroomChoices = ['book', 'chair', 'backpack', 'laptop', 'bottle', 'mouse', 'keyboard', 'clock'];
export const defaultClassroomTargets = ['book', 'chair', 'backpack'];
export interface ClassroomMission {
  phase: 'ready' | 'finding' | 'found' | 'practice' | 'complete';
  targets: string[];
  index: number;
  found: string[];
  questions: Question[];
  answers: Record<string, { wordId: string; correct: boolean }>;
  points: number;
  notice: 'wrong-object' | 'not-visible' | null;
  wrongWordId?: string;
}
export type MissionEvent =
  | { type: 'start'; targets: string[] }
  | { type: 'select'; wordId: string; observed: boolean }
  | { type: 'next' }
  | { type: 'answer'; questionId: string; wordId: string; correct: boolean }
  | { type: 'finish' }
  | { type: 'reset' };
export interface MissionChange { state: ClassroomMission; pointDelta: number; answer?: { wordId: string; correct: boolean } }

export function createClassroomMission(targets = defaultClassroomTargets): ClassroomMission {
  if (targets.length !== 3 || new Set(targets).size !== 3 || targets.some(id => !classroomChoices.includes(id) || !wordById(id)?.label)) throw new Error('Elige tres objetos distintos del aula.');
  const kinds = ['identify', 'complete', 'match'] as const;
  const questions = targets.map((id, i) => createQuestions([id]).find(q => q.type === kinds[i])!);
  return { phase: 'ready', targets: [...targets], index: 0, found: [], questions, answers: {}, points: 0, notice: null };
}
export function transitionMission(state: ClassroomMission, event: MissionEvent): MissionChange {
  const changed = (next: ClassroomMission, pointDelta = 0, answer?: MissionChange['answer']): MissionChange => ({ state: next, pointDelta, answer });
  const noop = () => changed(state);
  if (event.type === 'reset') return changed(createClassroomMission(state.targets));
  if (event.type === 'start') return state.phase === 'ready' ? changed({ ...createClassroomMission(event.targets), phase: 'finding' }) : noop();
  if (event.type === 'select' && state.phase === 'finding') {
    if (!event.observed) return changed({ ...state, notice: 'not-visible' });
    if (event.wordId !== state.targets[state.index]) return changed({ ...state, notice: 'wrong-object', wrongWordId: event.wordId });
    return changed({ ...state, phase: 'found', found: [...state.found, event.wordId], points: state.points + 10, notice: null }, 10);
  }
  if (event.type === 'next' && state.phase === 'found') {
    return changed({ ...state, phase: state.index < 2 ? 'finding' : 'practice', index: Math.min(2, state.index + 1), notice: null });
  }
  if (event.type === 'answer' && state.phase === 'practice') {
    const question = state.questions.find(q => q.id === event.questionId && q.word.id === event.wordId);
    if (!question || state.answers[event.questionId]) return noop();
    const answer = { wordId: event.wordId, correct: event.correct };
    const points = event.correct ? 10 : 0;
    return changed({ ...state, answers: { ...state.answers, [event.questionId]: answer }, points: state.points + points }, points, answer);
  }
  if (event.type === 'finish' && state.phase === 'practice' && Object.keys(state.answers).length === 3) return changed({ ...state, phase: 'complete' });
  return noop();
}
export function applyMissionProgress(progress: Progress, change: MissionChange): Progress {
  const withAnswer = change.answer ? recordAnswer(progress, change.answer.wordId, change.answer.correct) : progress;
  const extra = change.pointDelta - (change.answer?.correct ? 10 : 0);
  return extra ? { ...withAnswer, points: withAnswer.points + extra } : withAnswer;
}
export function missionInstruction(state: ClassroomMission): string {
  return `Find a ${wordById(state.targets[state.index])!.en.toLowerCase()}.`;
}
