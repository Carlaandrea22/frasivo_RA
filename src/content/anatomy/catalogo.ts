import type { CategoriaAnatomica, Estructura, Revision } from '../types';
import { partesCorazon, revisionCorazon } from './corazon';

const thumbnails = import.meta.glob('./miniaturas/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const thumbnail = (id: string) => thumbnails[`./miniaturas/${id}.webp`];

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

const partesHuesos: Record<string, Estructura['partes']> = {
  tibia: [
    { id: 'condilos', nombreEs: 'Cóndilos tibiales', terminoEn: 'Tibial condyles', ubicacion: 'Extremo proximal, debajo del fémur.', funcion: 'Reciben las superficies articulares de los cóndilos femorales.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo de la tibia', terminoEn: 'Tibial shaft', ubicacion: 'Porción central de la tibia.', funcion: 'Transmite cargas y ofrece inserciones musculares.' },
    { id: 'maleolo', nombreEs: 'Maléolo medial', terminoEn: 'Medial malleolus', ubicacion: 'Extremo distal medial, en el tobillo.', funcion: 'Contribuye a la estabilidad de la articulación del tobillo.' },
  ],
  humerus: [
    { id: 'cabeza', nombreEs: 'Cabeza del húmero', terminoEn: 'Humeral head', ubicacion: 'Extremo proximal del húmero.', funcion: 'Se articula con la cavidad glenoidea de la escápula.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del húmero', terminoEn: 'Humeral shaft', ubicacion: 'Porción central del húmero.', funcion: 'Actúa como palanca y ofrece inserciones musculares.' },
    { id: 'troclea', nombreEs: 'Tróclea humeral', terminoEn: 'Humeral trochlea', ubicacion: 'Superficie articular medial del extremo distal.', funcion: 'Se articula con la ulna en el codo.' },
  ],
  radius: [
    { id: 'cabeza', nombreEs: 'Cabeza del radio', terminoEn: 'Radial head', ubicacion: 'Extremo proximal del radio, en el codo.', funcion: 'Participa en la articulación con el húmero y la ulna.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del radio', terminoEn: 'Radial shaft', ubicacion: 'Porción central del radio.', funcion: 'Participa en la rotación del antebrazo y transmite cargas.' },
    { id: 'estiloides', nombreEs: 'Apófisis estiloides', terminoEn: 'Radial styloid process', ubicacion: 'Extremo distal lateral del radio.', funcion: 'Ofrece inserción a ligamentos de la muñeca.' },
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
  miniatura: thumbnail('femur_left'),
  partes: [
    { id: 'cabeza', nombreEs: 'Cabeza del fémur', terminoEn: 'Femoral head', ubicacion: 'Extremo proximal del fémur, en la cadera.', funcion: 'Se articula con el acetábulo de la pelvis.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del fémur', terminoEn: 'Femoral shaft', ubicacion: 'Porción central del fémur.', funcion: 'Transmite cargas y sirve de inserción a músculos del muslo.' },
    { id: 'condilos', nombreEs: 'Cóndilos femorales', terminoEn: 'Femoral condyles', ubicacion: 'Extremo distal del fémur, en la rodilla.', funcion: 'Forman superficies articulares con la tibia.' },
  ],
  relacionadas: ['pelvis', 'tibia', 'patella'],
  revision: revisionFemur,
}, ...([
  ['tibia', 'Tibia', 'Tibia', 'tibia_left', 'Hueso medial de la pierna.', 'Entre la rodilla y el tobillo.', 'Soporta gran parte del peso en la pierna.', ['femur', 'patella']],
  ['humerus', 'Húmero', 'Humerus', 'humerus_left', 'Hueso largo del brazo.', 'Entre el hombro y el codo.', 'Actúa como palanca para los movimientos del brazo.', ['radius']],
  ['radius', 'Radio', 'Radius', 'radius_left', 'Hueso del antebrazo del lado del pulgar.', 'Entre el codo y la muñeca.', 'Participa en la pronación y supinación del antebrazo.', ['humerus']],
  ['pelvis', 'Hueso coxal', 'Hip bone', 'pelvis_left', 'Hueso de la cintura pélvica.', 'En la pelvis, articulado con el sacro y el fémur.', 'Transmite cargas al miembro inferior y protege órganos pélvicos.', ['femur']],
  ['patella', 'Rótula', 'Patella', 'patella_left', 'Hueso sesamoideo de la rodilla.', 'En el tendón del cuádriceps, delante de la rodilla.', 'Mejora la palanca del cuádriceps al extender la rodilla.', ['femur', 'tibia']],
] as const).map(([id, nombreEs, terminoEn, nodeId, definicion, ubicacion, funcion, relacionadas]): Estructura => ({
  id, categoria: 'huesos', nombreEs, terminoEn, definicion, ubicacion, funcion, relacionadas,
  modelo: { assetId: 'body-bones', nodeId }, miniatura: thumbnail(nodeId),
  partes: partesHuesos[id] ?? [],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'OpenStax · The Appendicular Skeleton', url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${['humerus','radius'].includes(id) ? '8-2-bones-of-the-upper-limb' : '8-4-bones-of-the-lower-limb'}` }] },
})), {
  id: 'heart', categoria: 'organos', nombreEs: 'Corazón', terminoEn: 'Heart',
  definicion: 'Órgano muscular que impulsa la sangre. Este modelo en corte es esquemático y simplifica la anatomía.',
  ubicacion: 'En el mediastino, entre los pulmones, detrás del esternón y sobre el diafragma.',
  funcion: 'Mantiene la circulación pulmonar y sistémica mediante sus contracciones.',
  modelo: { assetId: 'heart-cutaway', nodeId: 'Heart_|_15_selectable_structures' },
  miniatura: thumbnail('heart-cutaway'), partes: partesCorazon, relacionadas: ['lungs'], revision: revisionCorazon,
}, {
  id: 'lungs', categoria: 'organos', nombreEs: 'Pulmones', terminoEn: 'Lungs',
  definicion: 'Órganos respiratorios pares.', ubicacion: 'En el tórax, a ambos lados del mediastino.',
  funcion: 'Permiten intercambiar oxígeno y dióxido de carbono entre el aire y la sangre.',
  modelo: { assetId: 'body-organs', nodeId: 'lungs' }, miniatura: thumbnail('lungs'), partes: [], relacionadas: ['heart'],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'OpenStax · The Lungs', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs' }] },
}, ...([
  ['biceps_brachii', 'Bíceps braquial', 'Biceps brachii', 'biceps_brachii_left', 'Músculo anterior del brazo con dos cabezas.', 'En la cara anterior del brazo.', 'Flexiona el codo y supina el antebrazo.', ['humerus', 'radius']],
  ['quadriceps_femoris', 'Cuádriceps femoral', 'Quadriceps femoris', 'quadriceps_femoris_left', 'Grupo muscular anterior del muslo.', 'En la cara anterior del muslo.', 'Extiende la rodilla; el recto femoral también flexiona la cadera.', ['femur', 'patella']],
] as const).map(([id, nombreEs, terminoEn, nodeId, definicion, ubicacion, funcion, relacionadas]): Estructura => ({
  id, categoria: 'musculos', nombreEs, terminoEn, definicion, ubicacion, funcion, relacionadas,
  modelo: { assetId: 'body-muscles', nodeId }, miniatura: thumbnail(nodeId), partes: [],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'OpenStax · Appendicular muscles', url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${id === 'biceps_brachii' ? '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs' : '11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'}` }] },
}))];
