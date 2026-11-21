import type { CategoriaAnatomica, Estructura, Revision } from '../types';
import femur from '../../../assets/anatomy/body/sprites/femur_left.webp?url';

export const categorias = [
  { id: 'huesos', nombre: 'Huesos' },
  { id: 'musculos', nombre: 'Músculos' },
  { id: 'organos', nombre: 'Órganos' },
] satisfies { id: CategoriaAnatomica; nombre: string }[];

export const revisionFemur: Revision = {
  estado: 'provisional',
  fuentes: [
    { titulo: 'OpenStax · Bones of the Lower Limb', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-4-bones-of-the-lower-limb' },
    { titulo: 'BodyParts3D · Modelos anatómicos', url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html' },
  ],
};

export const estructuras: readonly Estructura[] = [{
  id: 'femur',
  categoria: 'huesos',
  nombreEs: 'Fémur',
  terminoEn: 'Femur',
  definicion: 'Hueso largo del muslo.',
  ubicacion: 'Ocupa el muslo, entre la cadera y la rodilla.',
  funcion: 'Soporta el peso y transmite fuerzas entre la cadera y la rodilla.',
  modelo: { assetId: 'body-bones', nodeId: 'femur_left' },
  miniatura: femur,
  partes: [
    { id: 'cabeza', nombreEs: 'Cabeza del fémur', terminoEn: 'Femoral head', ubicacion: 'Extremo proximal del fémur, en la cadera.', funcion: 'Se articula con el acetábulo de la pelvis.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del fémur', terminoEn: 'Femoral shaft', ubicacion: 'Porción central del fémur.', funcion: 'Transmite cargas y sirve de inserción a músculos del muslo.' },
    { id: 'condilos', nombreEs: 'Cóndilos femorales', terminoEn: 'Femoral condyles', ubicacion: 'Extremo distal del fémur, en la rodilla.', funcion: 'Forman superficies articulares con la tibia.' },
  ],
  relacionadas: ['pelvis', 'tibia', 'patella'],
  revision: revisionFemur,
}];
