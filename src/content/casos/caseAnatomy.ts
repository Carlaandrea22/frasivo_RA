import { estructuras } from '../anatomy/catalogo';
import { anotaciones } from '../anotaciones/anatomia';
import type { Punto3D } from '../types';

export interface CaseAnatomyRegion {
  structureId: string;
  partId: string;
  contextEs: string;
  contextEn: string;
}

// The lung model separates the lobes. This point locates the entrance to the
// branching airways without highlighting any one lobe as the source.
const bronchialEntrance: Punto3D = [0, 1.29, .105];

export function resolveCaseAnatomy({ structureId, partId }: CaseAnatomyRegion) {
  const structure = estructuras.find(item => item.id === structureId);
  if (!structure?.modelo || !structure.miniatura) return;

  const { nombreEs: name, modelo: model, miniatura: image } = structure;
  if (structureId === 'lungs' && partId === 'bronquios') {
    return {
      name, model, image,
      partEs: 'Bronquios',
      partEn: 'Bronchi',
      anchor: { id: partId, nodeId: model.nodeId, point: bronchialEntrance },
      selectedNodeId: null,
    };
  }

  const note = anotaciones.find(item => item.estructuraId === structureId && item.parteId === partId);
  if (!note) return;
  return {
    name, model, image,
    partEs: note.etiquetaEs,
    partEn: note.etiquetaEn,
    anchor: { id: partId, nodeId: note.nodeId, point: note.punto },
    selectedNodeId: note.nodeId,
  };
}
