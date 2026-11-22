import type { Revision } from '../types';
import type { CaseAnatomyRegion } from './caseAnatomy';

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

export interface ConversationNode extends InterviewResponse {
  id: string;
  promptEn: string;
  promptEs: string;
  nextIds?: ClinicalTriple<string>;
}

export interface InterviewNode extends ConversationNode {
  recallPromptEn: string;
  recallPromptEs: string;
  recallCorrectId: string;
  recallOptions: ClinicalTriple<InterviewRecallOption>;
}

interface ClinicalCaseBase {
  id: string;
  titleEs: string;
  summaryEs: string;
  instructionsEs: string;
  structuresRelated: readonly string[];
  revision: Revision;
}

interface ConversationCaseBase<Node extends ConversationNode> extends ClinicalCaseBase {
  patientName: string;
  openingEn: string;
  openingEs: string;
  roots: ClinicalTriple<string>;
  nodes: readonly Node[];
}

export interface InterviewCase extends ConversationCaseBase<InterviewNode> {
  kind: 'interview';
}

export interface InvestigationNode extends ConversationNode {
  findingId?: string;
}

export interface InvestigationCase extends ConversationCaseBase<InvestigationNode> {
  kind: 'investigation';
  anatomy: readonly [CaseAnatomyRegion, ...CaseAnatomyRegion[]];
  findings: readonly [InterviewRecallOption, InterviewRecallOption];
  hypotheses: ClinicalTriple<InterviewRecallOption>;
  preferredHypothesisId: string;
  debriefEs: string;
  debriefEn: string;
}

export interface OrderedAction {
  id: string;
  textEs: string;
  textEn: string;
}

export interface OrderingCase extends ClinicalCaseBase {
  kind: 'ordering';
  scenarioEs: string;
  scenarioEn: string;
  actions: readonly [OrderedAction, OrderedAction, ...OrderedAction[]];
  explanationEs: string;
  explanationEn: string;
}

export interface ChoiceOption {
  id: string;
  textEs: string;
  textEn: string;
}

export interface MultipleChoiceCase extends ClinicalCaseBase {
  kind: 'multiple-choice';
  scenarioEs: string;
  scenarioEn: string;
  promptEs: string;
  promptEn: string;
  options: readonly [ChoiceOption, ChoiceOption, ChoiceOption, ...ChoiceOption[]];
  correctId: string;
  explanationEs: string;
  explanationEn: string;
}

export interface MatchingPatient extends ChoiceOption {
  name: string;
  correctId: string;
  explanationEs: string;
  explanationEn: string;
}

export interface MatchingCase extends ClinicalCaseBase {
  kind: 'matching';
  patients: ClinicalTriple<MatchingPatient>;
  causes: ClinicalTriple<ChoiceOption>;
}

export type ClinicalCase = InterviewCase | InvestigationCase | OrderingCase | MultipleChoiceCase | MatchingCase;

export const clinicalModeLabels = {
  interview: 'Conversación y comprensión',
  investigation: 'Investigación clínica',
  ordering: 'Ordenar actuaciones',
  'multiple-choice': 'Selección múltiple',
  matching: 'Relaciona síntomas y causas',
} satisfies Record<ClinicalCase['kind'], string>;
