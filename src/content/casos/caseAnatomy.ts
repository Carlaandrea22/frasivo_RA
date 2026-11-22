import brain from '../../../assets/anatomy/body/sprites/brain.webp?url';
import skull from '../../../assets/anatomy/body/sprites/skull.webp?url';
import stomach from '../../../assets/anatomy/body/sprites/stomach.webp?url';
import intestine from '../../../assets/anatomy/body/sprites/small_intestine.webp?url';
import lungs from '../../../assets/anatomy/body/sprites/lungs.webp?url';
import tibia from '../../../assets/anatomy/body/sprites/tibia_right.webp?url';
import type { ReferenciaModelo } from '../types';

export const caseAnatomy = {
  brain: { nombre: 'Cerebro', assetId: 'body-organs', nodeId: 'brain', imagen: brain },
  skull: { nombre: 'Cráneo', assetId: 'body-bones', nodeId: 'skull', imagen: skull },
  stomach: { nombre: 'Estómago', assetId: 'body-organs', nodeId: 'stomach', imagen: stomach },
  small_intestine: { nombre: 'Intestino delgado', assetId: 'body-organs', nodeId: 'small_intestine', imagen: intestine },
  lungs: { nombre: 'Pulmones', assetId: 'body-organs', nodeId: 'lungs', imagen: lungs },
  tibia_right: { nombre: 'Tibia derecha', assetId: 'body-bones', nodeId: 'tibia_right', imagen: tibia },
} satisfies Record<string, ReferenciaModelo & { nombre: string; imagen: string }>;

export type CaseAnatomyId = keyof typeof caseAnatomy;
