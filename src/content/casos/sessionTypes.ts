import type { Revision } from '../types';

export interface InterviewResponse {
  patientEn: string;
  patientEs: string;
}

export interface InterviewRecallOption {
  id: string;
  textEn: string;
  textEs: string;
}

export type ClinicalTriple<T> = readonly [T, T, T];

export interface InterviewNode {
  id: string;
  promptEn: string;
  promptEs: string;
  patientEn: string;
  patientEs: string;
  recallPromptEn: string;
  recallPromptEs: string;
  recallCorrectId: string;
  recallOptions: ClinicalTriple<InterviewRecallOption>;
  nextIds?: ClinicalTriple<string>;
}

interface ClinicalCaseBase {
  id: string;
  titleEs: string;
  summaryEs: string;
  instructionsEs: string;
  structuresRelated: readonly string[];
  revision: Revision;
}

export interface InterviewCase extends ClinicalCaseBase {
  kind: 'interview';
  patientName: string;
  openingEn: string;
  roots: ClinicalTriple<string>;
  nodes: readonly InterviewNode[];
}

export interface OrderedAction {
  id: string;
  textEn: string;
}

export interface OrderingCase extends ClinicalCaseBase {
  kind: 'ordering';
  scenarioEn: string;
  actions: readonly [OrderedAction, OrderedAction, ...OrderedAction[]];
  explanationEn: string;
}

export interface ChoiceOption {
  id: string;
  textEn: string;
}

export interface MultipleChoiceCase extends ClinicalCaseBase {
  kind: 'multiple-choice';
  scenarioEn: string;
  promptEn: string;
  options: readonly [ChoiceOption, ChoiceOption, ChoiceOption, ...ChoiceOption[]];
  correctId: string;
  explanationEn: string;
}

export type ClinicalCase = InterviewCase | OrderingCase | MultipleChoiceCase;
