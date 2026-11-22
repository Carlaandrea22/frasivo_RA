import type { PreguntaReto } from '../types';

export const preguntasRepasoAmpliacion: readonly PreguntaReto[] = [
  {
    id: 'punta-del-codo', estructuraId: 'ulna',
    enunciado: '¿Qué parte del cúbito forma la punta del codo y recibe el tendón del tríceps?',
    respuestas: [
      { id: 'cuerpo', texto: 'Cuerpo del cúbito' },
      { id: 'olecranon', texto: 'Olécranon' },
      { id: 'cabeza', texto: 'Cabeza del cúbito' },
    ],
    correctaId: 'olecranon',
    pistas: ['Busca la prominencia posterior del cúbito, cerca del húmero.'],
    feedbackError: 'El olécranon es la prominencia que se palpa detrás del codo. Ahí se inserta el tendón del tríceps.',
  },
  {
    id: 'parte-externa-del-tobillo', estructuraId: 'fibula',
    enunciado: '¿Qué parte del peroné forma la prominencia ósea de la cara externa del tobillo?',
    respuestas: [
      { id: 'maleolo', texto: 'Maléolo lateral' },
      { id: 'cabeza', texto: 'Cabeza del peroné' },
      { id: 'cuerpo', texto: 'Cuerpo del peroné' },
    ],
    correctaId: 'maleolo',
    pistas: ['Busca el extremo inferior del peroné, cerca del pie.'],
    feedbackError: 'El maléolo lateral está en el extremo inferior del peroné y ayuda a estabilizar el tobillo.',
  },
  {
    id: 'parte-superior-del-esternon', estructuraId: 'sternum',
    enunciado: '¿Cómo se llama la parte superior y ancha del esternón?',
    respuestas: [
      { id: 'xifoides', texto: 'Apófisis xifoides' },
      { id: 'cuerpo', texto: 'Cuerpo del esternón' },
      { id: 'manubrio', texto: 'Manubrio' },
    ],
    correctaId: 'manubrio',
    pistas: ['Es la parte del esternón que se articula con las clavículas.'],
    feedbackError: 'El manubrio ocupa el extremo superior del esternón. El cuerpo es la parte central y la apófisis xifoides es el extremo inferior.',
  },
  {
    id: 'elevacion-lateral-del-brazo', estructuraId: 'deltoid',
    enunciado: '¿Qué porción del deltoides ayuda a elevar el brazo hacia el lado?',
    respuestas: [
      { id: 'clavicular', texto: 'Porción clavicular' },
      { id: 'acromial', texto: 'Porción acromial' },
      { id: 'espinal', texto: 'Porción espinal' },
    ],
    correctaId: 'acromial',
    pistas: ['Es la porción que nace en el acromion, en el lado del hombro.'],
    feedbackError: 'La porción acromial ayuda a separar el brazo del tronco hacia el lado.',
  },
  {
    id: 'insercion-del-triceps', estructuraId: 'triceps_brachii',
    enunciado: '¿En qué hueso se inserta el tendón del tríceps braquial?',
    respuestas: [
      { id: 'radius', texto: 'Radio' },
      { id: 'humerus', texto: 'Húmero' },
      { id: 'ulna', texto: 'Cúbito' },
    ],
    correctaId: 'ulna',
    pistas: ['El tendón se fija en el olécranon, detrás del codo.'],
    feedbackError: 'El tríceps se inserta en el olécranon del cúbito. Al contraerse, tira de él y extiende el codo.',
  },
  {
    id: 'movimiento-de-puntillas', estructuraId: 'gastrocnemius',
    enunciado: '¿Qué movimiento ayuda a realizar el gastrocnemio al ponerte de puntillas?',
    respuestas: [
      { id: 'talon', texto: 'Levantar el talón' },
      { id: 'punta', texto: 'Levantar la punta del pie' },
      { id: 'rodilla', texto: 'Extender la rodilla' },
    ],
    correctaId: 'talon',
    pistas: ['El músculo tira del talón por medio del tendón de Aquiles.'],
    feedbackError: 'El gastrocnemio ayuda a levantar el talón al ponerte de puntillas. Ese movimiento del tobillo se llama flexión plantar.',
  },
  {
    id: 'salida-del-estomago', estructuraId: 'stomach',
    enunciado: '¿Qué región del estómago se comunica con el duodeno?',
    respuestas: [
      { id: 'cardias', texto: 'Cardias' },
      { id: 'pilorica', texto: 'Región pilórica' },
      { id: 'fondo', texto: 'Fondo gástrico' },
    ],
    correctaId: 'pilorica',
    pistas: ['Busca la salida hacia el intestino delgado.'],
    feedbackError: 'La región pilórica conduce al duodeno. El cardias comunica el estómago con el esófago.',
  },
  {
    id: 'altura-del-rinon-derecho', estructuraId: 'kidneys',
    enunciado: '¿Por qué el riñón derecho suele estar un poco más bajo que el izquierdo?',
    respuestas: [
      { id: 'estomago', texto: 'Por la posición del estómago.' },
      { id: 'corazon', texto: 'Por la posición del corazón.' },
      { id: 'higado', texto: 'Por la posición del hígado.' },
    ],
    correctaId: 'higado',
    pistas: ['Piensa en el órgano grande que ocupa la parte superior derecha del abdomen.'],
    feedbackError: 'El hígado ocupa espacio por encima del riñón derecho, que suele quedar un poco más abajo que el izquierdo.',
  },
];
