import type { PreguntaReto } from '../types';

export const preguntasRepasoMusculos: readonly PreguntaReto[] = [
  {
    id: 'origen-clavicular-del-pectoral', estructuraId: 'pectoralis_major',
    enunciado: '¿Qué porción del pectoral mayor nace de la clavícula?',
    respuestas: [
      { id: 'abdominal', texto: 'Porción abdominal' }, { id: 'clavicular', texto: 'Porción clavicular' },
      { id: 'esternocostal', texto: 'Porción esternocostal' },
    ],
    correctaId: 'clavicular',
    pistas: ['Busca las fibras superiores del pectoral mayor, cerca del hombro.'],
    feedbackError: 'La porción clavicular se origina en la parte medial de la clavícula. Desde allí, sus fibras se dirigen hacia el húmero.',
  },
  {
    id: 'fibras-superiores-del-trapecio', estructuraId: 'trapezius',
    enunciado: '¿Qué porción del trapecio se dirige desde la nuca hacia la parte lateral de la clavícula?',
    respuestas: [
      { id: 'descendente', texto: 'Porción descendente' }, { id: 'transversa', texto: 'Porción transversa' },
      { id: 'ascendente', texto: 'Porción ascendente' },
    ],
    correctaId: 'descendente',
    pistas: ['Sigue las fibras más altas desde la parte posterior del cuello hacia el hombro.'],
    feedbackError: 'Las fibras de la porción descendente parten de la nuca y se insertan en el tercio lateral de la clavícula.',
  },
  {
    id: 'extension-del-brazo-desde-la-espalda', estructuraId: 'latissimus_dorsi',
    enunciado: '¿Qué músculo ancho de la espalda ayuda a llevar el brazo hacia atrás?',
    respuestas: [
      { id: 'trapezius', texto: 'Trapecio' }, { id: 'pectoralis_major', texto: 'Pectoral mayor' },
      { id: 'latissimus_dorsi', texto: 'Dorsal ancho' },
    ],
    correctaId: 'latissimus_dorsi',
    pistas: ['Busca el músculo grande que asciende desde la zona media e inferior de la espalda hasta el húmero.'],
    feedbackError: 'El dorsal ancho conecta el tronco con el húmero y ayuda a extender el brazo en la articulación del hombro.',
  },
  {
    id: 'rotacion-de-la-cabeza-al-lado-opuesto', estructuraId: 'sternocleidomastoid',
    enunciado: '¿Qué músculo superficial del cuello ayuda a girar la cara hacia el lado opuesto al contraerse de un solo lado?',
    respuestas: [
      { id: 'sternocleidomastoid', texto: 'Esternocleidomastoideo' }, { id: 'splenius_capitis', texto: 'Esplenio de la cabeza' },
      { id: 'longissimus_capitis', texto: 'Longísimo de la cabeza' },
    ],
    correctaId: 'sternocleidomastoid',
    pistas: ['Este músculo une el esternón y la clavícula con una zona del cráneo situada detrás de la oreja.'],
    feedbackError: 'Si el esternocleidomastoideo izquierdo se contrae por sí solo, ayuda a girar la cara hacia la derecha.',
  },
  {
    id: 'flexion-anterior-del-tronco', estructuraId: 'rectus_abdominis',
    enunciado: '¿Qué músculo anterior, situado a ambos lados de la línea alba, ayuda a flexionar el tronco?',
    respuestas: [
      { id: 'diaphragm', texto: 'Diafragma' }, { id: 'rectus_abdominis', texto: 'Recto del abdomen' },
      { id: 'external_oblique', texto: 'Oblicuo externo del abdomen' },
    ],
    correctaId: 'rectus_abdominis',
    pistas: ['Busca las dos bandas verticales en el centro de la pared abdominal.'],
    feedbackError: 'El recto del abdomen se extiende entre el pubis y la parte inferior del tórax. Al contraerse, ayuda a acercarlos.',
  },
  {
    id: 'capa-superficial-del-flanco', estructuraId: 'external_oblique',
    enunciado: '¿Qué músculo constituye la capa más superficial de la pared lateral del abdomen?',
    respuestas: [
      { id: 'transversus_abdominis', texto: 'Transverso del abdomen' }, { id: 'internal_oblique', texto: 'Oblicuo interno del abdomen' },
      { id: 'external_oblique', texto: 'Oblicuo externo del abdomen' },
    ],
    correctaId: 'external_oblique',
    pistas: ['Sus fibras bajan desde las costillas hacia la línea media, en la dirección de las manos al meterlas en los bolsillos.'],
    feedbackError: 'El oblicuo externo cubre al oblicuo interno. El transverso ocupa la capa más profunda.',
  },
  {
    id: 'diafragma-durante-la-inspiracion', estructuraId: 'diaphragm',
    enunciado: 'Al contraerse el diafragma durante la inspiración, ¿qué hace su centro tendinoso?',
    respuestas: [
      { id: 'desciende', texto: 'Desciende' }, { id: 'asciende', texto: 'Asciende' },
      { id: 'fijo', texto: 'Se queda a la misma altura' },
    ],
    correctaId: 'desciende',
    pistas: ['Piensa en cómo aumenta el espacio disponible para los pulmones.'],
    feedbackError: 'La contracción del diafragma baja su centro tendinoso y aumenta el volumen de la cavidad torácica.',
  },
  {
    id: 'extension-de-cadera-en-la-region-glutea', estructuraId: 'gluteus_maximus',
    enunciado: '¿Qué músculo superficial de la nalga ayuda a extender la cadera al subir un escalón?',
    respuestas: [
      { id: 'gluteus_medius', texto: 'Glúteo medio' }, { id: 'gluteus_maximus', texto: 'Glúteo mayor' },
      { id: 'gluteus_minimus', texto: 'Glúteo menor' },
    ],
    correctaId: 'gluteus_maximus',
    pistas: ['Busca el más grande y superficial de los tres glúteos.'],
    feedbackError: 'El glúteo mayor contribuye a enderezar la cadera al subir un escalón o al levantarse de una silla.',
  },
  {
    id: 'musculo-del-grupo-isquiotibial', estructuraId: 'hamstrings',
    enunciado: '¿Cuál de estos músculos forma parte del grupo isquiotibial?',
    respuestas: [
      { id: 'sartorius', texto: 'Sartorio' }, { id: 'rectus_femoris', texto: 'Recto femoral' },
      { id: 'semitendinoso', texto: 'Semitendinoso' },
    ],
    correctaId: 'semitendinoso',
    pistas: ['Busca un músculo de la cara posterior del muslo con un tendón largo.'],
    feedbackError: 'El semitendinoso es uno de los isquiotibiales. Ayuda a flexionar la rodilla y a extender la cadera.',
  },
  {
    id: 'movimiento-del-tibial-anterior', estructuraId: 'tibialis_anterior',
    enunciado: '¿Qué movimiento hace el tibial anterior cuando levantas la punta del pie hacia la espinilla?',
    respuestas: [
      { id: 'plantar', texto: 'Flexión plantar del tobillo' }, { id: 'eversion', texto: 'Eversión del pie' },
      { id: 'dorsiflexion', texto: 'Dorsiflexión del tobillo' },
    ],
    correctaId: 'dorsiflexion',
    pistas: ['Fíjate si el dorso del pie se acerca a la cara anterior de la pierna.'],
    feedbackError: 'La dorsiflexión acerca el dorso del pie a la pierna. El tibial anterior participa en ese movimiento y en la inversión del pie.',
  },
];
