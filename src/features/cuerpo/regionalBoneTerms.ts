import type { AnatomyPart } from './anatomy';

interface RegionalTerm extends AnatomyPart {
  location: string;
  function: string;
}

function term(id: string, es: string, en: string, location: string, purpose: string): RegionalTerm {
  return { id, es, en, layer: 'bones', location, function: purpose, description: purpose };
}

const fingers = {
  thumb: ['pulgar', 'thumb'],
  index: ['índice', 'index finger'],
  middle: ['medio', 'middle finger'],
  ring: ['anular', 'ring finger'],
  little: ['meñique', 'little finger'],
};
const phalanges = {
  proximal: ['proximal', 'Proximal', 'En la base del dedo, cerca de la palma.'],
  middle: ['media', 'Middle', 'Entre las otras dos falanges del dedo.'],
  distal: ['distal', 'Distal', 'En la punta del dedo.'],
};

export const regionalBoneTerms: RegionalTerm[] = [
  term('carpals', 'Carpos', 'Carpals', 'En la muñeca.', 'Distribuyen la carga entre el antebrazo y la mano.'),
  term('metacarpals', 'Metacarpianos', 'Metacarpals', 'Entre la muñeca y la base de los dedos.', 'Forman la estructura de la palma.'),
  term('hand_phalanges', 'Falanges', 'Phalanges', 'En los dedos de la mano.', 'Permiten flexionar los dedos y agarrar objetos.'),
  term('thumb', 'Pulgar', 'Thumb', 'En el primer dedo de la mano.', 'Se opone a los otros dedos para sujetar objetos.'),
  ...Object.entries(fingers).flatMap(([digit, [name, english]]) =>
    Object.entries(phalanges).filter(([segment]) => digit !== 'thumb' || segment !== 'middle')
      .map(([segment, [label, englishLabel, location]]) =>
        term(`phalanx_${digit}_${segment}`, `Falange ${label} del ${name}`, `${englishLabel} phalanx of the ${english}`,
          location, 'Forma parte del segmento óseo que mueve el dedo.'))),
  term('skull', 'Cráneo', 'Skull', 'En la cabeza.', 'Protege el encéfalo y sostiene la cara.'),
  term('mandible', 'Mandíbula', 'Mandible', 'En la parte inferior de la cara.', 'Sostiene los dientes inferiores y se mueve al masticar.'),
  term('frontal', 'Frontal', 'Frontal bone', 'En la frente y el techo de las órbitas.', 'Protege la parte anterior del encéfalo.'),
  term('parietal', 'Parietal', 'Parietal bone', 'En el techo y los lados superiores del cráneo.', 'Forma parte de la bóveda que protege el encéfalo.'),
  term('temporal', 'Temporal', 'Temporal bone', 'En el lado del cráneo, cerca del oído.', 'Aloja partes del oído y se articula con la mandíbula.'),
  term('maxilla', 'Maxilar', 'Maxilla', 'En la parte superior de la boca y debajo de las órbitas.', 'Sostiene los dientes superiores.'),
  term('zygomatic', 'Cigomático', 'Zygomatic bone', 'En el pómulo y el borde lateral de la órbita.', 'Da forma al pómulo y contribuye a la órbita.'),
  term('nasal', 'Nasal', 'Nasal bone', 'En el puente de la nariz.', 'Sostiene la parte superior de la nariz.'),
  term('cervical', 'Vértebras cervicales', 'Cervical vertebrae', 'En la columna del cuello.', 'Sostienen la cabeza y protegen la médula espinal.'),
  term('calcaneus', 'Calcáneo', 'Calcaneus', 'En el talón.', 'Soporta parte del peso y recibe el tendón de Aquiles.'),
  term('talus', 'Astrágalo', 'Talus', 'Entre la tibia y el calcáneo.', 'Transmite el peso de la pierna al pie en el tobillo.'),
  term('tarsals', 'Tarsos', 'Tarsals', 'En la parte posterior y media del pie.', 'Transmiten la carga hacia el antepié.'),
  term('metatarsals', 'Metatarsianos', 'Metatarsals', 'Entre el tarso y los dedos del pie.', 'Forman el antepié y distribuyen el peso al caminar.'),
  term('foot_phalanges', 'Falanges', 'Phalanges', 'En los dedos del pie.', 'Ayudan al equilibrio y al impulso al caminar.'),
];

export const regionalMainTerms = {
  hand: ['carpals', 'metacarpals', 'hand_phalanges', 'thumb'],
  head: ['skull', 'mandible', 'frontal', 'temporal', 'zygomatic', 'cervical'],
  foot: ['calcaneus', 'talus', 'tarsals', 'metatarsals', 'foot_phalanges'],
};
