import { clinicalCases } from '../../content/casos/session';
import { clinicalModeLabels, type ClinicalCase } from '../../content/casos/sessionTypes';
import { retos } from '../../content/ejercicios/retos';
import { retoTypeLabels, type PreguntaReto, type Reto, type TipoReto } from '../../content/types';
import { tituloRetoParaEstructura } from '../retos/intentos';

type ClinicalMode = ClinicalCase['kind'];

export const quickDurations = {
  interview: 60,
  investigation: 60,
  ordering: 60,
  'multiple-choice': 15,
  matching: 60,
  'ubica-partes': 40,
  'senala-estructura': 45,
  'relaciona-funcion': 25,
  'repaso-breve': 20,
} satisfies Record<ClinicalMode | TipoReto, number>;

export type QuickActivity = { seconds: number; label: string } & (
  | { kind: 'clinical'; caseId: string }
  | { kind: 'anatomy'; reto: Reto }
);

const clinicalModes = Object.keys(clinicalModeLabels) as ClinicalMode[];
const anatomyModes = Object.keys(retoTypeLabels) as TipoReto[];

export function chooseQuickActivity(random = Math.random): QuickActivity {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  if (random() < .5) {
    const mode = pick(clinicalModes);
    const item = pick(clinicalCases.filter(entry => entry.kind === mode));
    return { kind: 'clinical', caseId: item.id, seconds: quickDurations[mode], label: clinicalModeLabels[mode] };
  }

  const mode = pick(anatomyModes);
  const byStructure = new Map<string, { reto: Reto; question: PreguntaReto }[]>();
  for (const reto of retos) {
    if (reto.tipo !== mode) continue;
    for (const question of reto.preguntas) {
      const choices = byStructure.get(question.estructuraId);
      if (choices) choices.push({ reto, question });
      else byStructure.set(question.estructuraId, [{ reto, question }]);
    }
  }
  const { reto, question } = pick(pick([...byStructure.values()]));
  return {
    kind: 'anatomy', seconds: quickDurations[mode], label: retoTypeLabels[mode],
    reto: { ...reto, titulo: tituloRetoParaEstructura(reto, question.estructuraId),
      estructurasRelacionadas: [question.estructuraId], preguntas: [question] },
  };
}
