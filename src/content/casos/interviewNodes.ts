import type { Revision } from '../types';
import type { ClinicalTriple, InterviewNode } from './sessionTypes';

type Pair = readonly [english: string, spanish: string];

export function nodeFactory(patientName: string) {
  return (
    id: string,
    prompt: Pair,
    patient: Pair,
    correct: Pair,
    alternatives: readonly [Pair, Pair],
    nextIds?: ClinicalTriple<string>,
  ): InterviewNode => ({
    id,
    promptEn: prompt[0],
    promptEs: prompt[1],
    patientEn: patient[0],
    patientEs: patient[1],
    recallPromptEn: `What did ${patientName} say in response?`,
    recallPromptEs: `¿Qué respondió ${patientName}?`,
    recallCorrectId: `${id}-correct`,
    recallOptions: [
      { id: `${id}-correct`, textEn: correct[0], textEs: correct[1] },
      { id: `${id}-alt-1`, textEn: alternatives[0][0], textEs: alternatives[0][1] },
      { id: `${id}-alt-2`, textEn: alternatives[1][0], textEs: alternatives[1][1] },
    ],
    nextIds,
  });
}

export const interviewRevision = {
  estado: 'provisional',
  fuentes: [{ titulo: 'WHO–ICRC · Basic Emergency Care: SAMPLE history', url: 'https://www.who.int/publications/i/item/basic-emergency-care-approach-to-the-acutely-ill-and-injured' }],
} satisfies Revision;
