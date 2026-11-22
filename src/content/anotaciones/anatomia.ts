import type { Anotacion } from '../types';
import { revisionFemur } from '../anatomy/catalogo';
import { estructuras } from '../anatomy/catalogo';
import { partesCorazon, revisionCorazon } from '../anatomy/corazon';
import puntosCorazon from './puntos-corazon.json';

export const anotaciones: readonly Anotacion[] = [
  { id: 'femur-cabeza', estructuraId: 'femur', parteId: 'cabeza', etiquetaEs: 'Cabeza del fémur', etiquetaEn: 'Femoral head', nodeId: 'femur_left', punto: [.083, .826, .104], revision: revisionFemur },
  { id: 'femur-cuerpo', estructuraId: 'femur', parteId: 'cuerpo', etiquetaEs: 'Cuerpo del fémur', etiquetaEn: 'Femoral shaft', nodeId: 'femur_left', punto: [.091, .61, .098], revision: revisionFemur },
  { id: 'femur-condilos', estructuraId: 'femur', parteId: 'condilos', etiquetaEs: 'Cóndilos femorales', etiquetaEn: 'Femoral condyles', nodeId: 'femur_left', punto: [.064, .394, .107], revision: revisionFemur },
  ...partesCorazon.map((parte): Anotacion => ({
    id: `heart-${parte.id}`, estructuraId: 'heart', parteId: parte.id,
    etiquetaEs: parte.nombreEs, etiquetaEn: parte.terminoEn, nodeId: parte.id,
    punto: puntosCorazon[parte.id as keyof typeof puntosCorazon] as [number,number,number], revision: revisionCorazon,
  })),
  ...([
    ['tibia', [[.071,.36,.105],[.061,.19,.095],[.04,.023,.09]]],
    ['humerus', [[.164,1.32,.085],[.194,1.18,.085],[.207,1.05,.078]]],
    ['radius', [[.232,1.027,.076],[.248,.925,.106],[.276,.821,.119]]],
  ] as const).flatMap(([id, points]) => {
    const item = estructuras.find(item => item.id === id)!;
    return item.partes.map((parte, index): Anotacion => ({
      id: `${id}-${parte.id}`, estructuraId: id, parteId: parte.id,
      etiquetaEs: parte.nombreEs, etiquetaEn: parte.terminoEn,
      nodeId: item.modelo!.nodeId, punto: points[index], revision: item.revision,
    }));
  }),
];
