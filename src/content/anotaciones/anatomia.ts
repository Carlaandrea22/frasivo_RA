import type { Anotacion } from '../types';
import { revisionFemur } from '../anatomy/catalogo';

export const anotaciones: readonly Anotacion[] = [
  { id: 'femur-cabeza', estructuraId: 'femur', parteId: 'cabeza', etiquetaEs: 'Cabeza del fémur', etiquetaEn: 'Femoral head', nodeId: 'femur_left', punto: [.083, .826, .104], revision: revisionFemur },
  { id: 'femur-cuerpo', estructuraId: 'femur', parteId: 'cuerpo', etiquetaEs: 'Cuerpo del fémur', etiquetaEn: 'Femoral shaft', nodeId: 'femur_left', punto: [.091, .61, .098], revision: revisionFemur },
  { id: 'femur-condilos', estructuraId: 'femur', parteId: 'condilos', etiquetaEs: 'Cóndilos femorales', etiquetaEn: 'Femoral condyles', nodeId: 'femur_left', punto: [.064, .394, .107], revision: revisionFemur },
];
