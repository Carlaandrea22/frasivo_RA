import type { PreguntaReto } from '../types';

export const preguntasRepasoHuesos: readonly PreguntaReto[] = [
  {
    id: 'extremo-clavicular-del-esternon', estructuraId: 'clavicle',
    enunciado: '¿Qué parte de la clavícula se articula con el manubrio del esternón?',
    respuestas: [
      { id: 'acromial', texto: 'Extremo acromial' }, { id: 'esternal', texto: 'Extremo esternal' }, { id: 'cuerpo', texto: 'Cuerpo' },
    ],
    correctaId: 'esternal',
    pistas: ['Busca el extremo más cercano a la línea media del cuerpo.'],
    feedbackError: 'El extremo esternal se une al manubrio. El extremo acromial se une a la escápula.',
  },
  {
    id: 'articulacion-del-humero-con-la-escapula', estructuraId: 'scapula',
    enunciado: '¿Qué parte de la escápula recibe la cabeza del húmero?',
    respuestas: [
      { id: 'glenoidea', texto: 'Cavidad glenoidea' }, { id: 'acromion', texto: 'Acromion' }, { id: 'coracoides', texto: 'Apófisis coracoides' },
    ],
    correctaId: 'glenoidea',
    pistas: ['Busca una superficie cóncava en el ángulo lateral de la escápula.'],
    feedbackError: 'La cavidad glenoidea recibe la cabeza del húmero y con ella forma la articulación glenohumeral.',
  },
  {
    id: 'costillas-sin-union-anterior', estructuraId: 'ribs',
    enunciado: '¿Cómo se llaman las costillas de los pares 11 y 12, cuyos extremos anteriores son libres?',
    respuestas: [
      { id: 'verdaderas', texto: 'Costillas verdaderas' }, { id: 'flotantes', texto: 'Costillas flotantes' },
      { id: 'vertebrocondrales', texto: 'Costillas vertebrocondrales' },
    ],
    correctaId: 'flotantes',
    pistas: ['Son los dos pares más inferiores de la caja torácica.'],
    feedbackError: 'Las costillas flotantes se articulan con la columna por detrás y quedan libres por delante.',
  },
  {
    id: 'articulacion-de-la-mandibula', estructuraId: 'mandible',
    enunciado: '¿Qué parte de la mandíbula se articula con el hueso temporal?',
    respuestas: [
      { id: 'coronoides', texto: 'Proceso coronoides' }, { id: 'angulo', texto: 'Ángulo mandibular' }, { id: 'condilar', texto: 'Proceso condilar' },
    ],
    correctaId: 'condilar',
    pistas: ['Busca la proyección posterior del extremo superior de la rama mandibular.'],
    feedbackError: 'La cabeza del proceso condilar participa en la articulación temporomandibular.',
  },
  {
    id: 'carpo-proximal-del-lado-del-pulgar', estructuraId: 'hand',
    enunciado: '¿Qué carpo ocupa el extremo del lado del pulgar en la fila proximal?',
    respuestas: [
      { id: 'escafoides', texto: 'Escafoides' }, { id: 'semilunar', texto: 'Semilunar' }, { id: 'trapecio', texto: 'Trapecio' },
    ],
    correctaId: 'escafoides',
    pistas: ['Es un hueso alargado de la muñeca que se articula con el radio.'],
    feedbackError: 'El escafoides es el hueso más lateral de la fila proximal. El trapecio está en la fila distal.',
  },
  {
    id: 'hueso-del-talon', estructuraId: 'foot',
    enunciado: '¿Qué hueso forma el talón?',
    respuestas: [
      { id: 'astragalo', texto: 'Astrágalo' }, { id: 'calcaneo', texto: 'Calcáneo' }, { id: 'navicular', texto: 'Navicular' },
    ],
    correctaId: 'calcaneo',
    pistas: ['Busca el hueso grande que queda por debajo y detrás del astrágalo.'],
    feedbackError: 'El calcáneo forma el talón y se articula por arriba con el astrágalo.',
  },
  {
    id: 'aberturas-laterales-de-la-cervical', estructuraId: 'cervical_vertebra',
    enunciado: '¿Cómo se llaman las aberturas de las apófisis transversas de una vértebra cervical típica?',
    respuestas: [
      { id: 'vertebral', texto: 'Foramen vertebral' }, { id: 'intervertebrales', texto: 'Forámenes intervertebrales' },
      { id: 'transversos', texto: 'Forámenes transversos' },
    ],
    correctaId: 'transversos',
    pistas: ['Cada una de las dos proyecciones laterales tiene una abertura propia.'],
    feedbackError: 'Los forámenes transversos están a ambos lados de la vértebra. El foramen vertebral es la abertura central.',
  },
  {
    id: 'superficies-articulares-para-las-costillas', estructuraId: 'thoracic_lumbar_vertebrae',
    enunciado: 'Al comparar T7 y L3, ¿qué superficies de T7 se articulan con las costillas?',
    respuestas: [
      { id: 'costales', texto: 'Carillas costales' }, { id: 'espinosa', texto: 'Apófisis espinosa' }, { id: 'laminas', texto: 'Láminas del arco' },
    ],
    correctaId: 'costales',
    pistas: ['Busca las superficies articulares del cuerpo vertebral y de las apófisis transversas.'],
    feedbackError: 'Las carillas costales de T7 participan en las articulaciones con las costillas. L3 carece de estas superficies.',
  },
  {
    id: 'hueso-debajo-del-sacro', estructuraId: 'sacrum',
    enunciado: '¿Qué hueso se une al extremo inferior del sacro?',
    respuestas: [
      { id: 'lumbar', texto: 'Quinta vértebra lumbar' }, { id: 'ilion', texto: 'Ilion' }, { id: 'coccix', texto: 'Cóccix' },
    ],
    correctaId: 'coccix',
    pistas: ['Es el hueso pequeño que queda en el extremo de la columna.'],
    feedbackError: 'El cóccix se une al vértice inferior del sacro. La quinta vértebra lumbar se articula con la base del sacro por arriba.',
  },
  {
    id: 'hueso-que-sostiene-la-lengua', estructuraId: 'hyoid',
    enunciado: '¿Qué hueso del cuello da soporte a la lengua y participa en la deglución?',
    respuestas: [
      { id: 'hyoid', texto: 'Hioides' }, { id: 'mandible', texto: 'Mandíbula' }, { id: 'atlas', texto: 'Atlas' },
    ],
    correctaId: 'hyoid',
    pistas: ['Tiene forma de U y está suspendido por músculos y ligamentos.'],
    feedbackError: 'El hioides da inserción a músculos de la lengua y del cuello. Su movimiento se coordina con el de la laringe al tragar.',
  },
];
