import { estructuras, revisionFemur } from '../anatomy/catalogo';
import { anotaciones } from '../anotaciones/anatomia';
import type { ModoReto, PreguntaReto, RespuestaReto, Reto } from '../types';

const modos = ['entrenamiento', 'evaluacion'] satisfies ModoReto[];
const revision = (id: string) => estructuras.find(item => item.id === id)!.revision;

const funcionesRodilla: readonly RespuestaReto[] = [
  { id: 'cubrir', texto: 'Mejorar la palanca del cuádriceps al extender la rodilla.' },
  { id: 'unir', texto: 'Soportar gran parte del peso entre la rodilla y el tobillo.' },
  { id: 'sostener', texto: 'Transmitir el peso entre la cadera y la rodilla.' },
];

const etiquetasFemur = anotaciones.filter(note => note.estructuraId === 'femur');
const nombresFemur = [...etiquetasFemur].reverse().map(note => ({
  id: note.parteId, texto: note.etiquetaEs, anotacionId: note.id,
}));
const explicacionesFemur = {
  cabeza: ['La cabeza del fémur se articula con la cadera.', 'La cabeza es el extremo redondeado que se articula con el acetábulo.'],
  cuerpo: ['Busca la zona larga entre los dos extremos.', 'El cuerpo del fémur es su porción central, entre la cabeza y los cóndilos.'],
  condilos: ['Los cóndilos se encuentran cerca de la rodilla.', 'Los cóndilos están en el extremo de la rodilla y se articulan con la tibia.'],
} as const;

function etiqueta(parte: keyof typeof explicacionesFemur, numero: number): PreguntaReto {
  const [pista, feedbackError] = explicacionesFemur[parte];
  return {
    id: `etiqueta-${parte}`, enunciado: `¿Qué parte señala el recuadro ${numero}?`, estructuraId: 'femur',
    respuestas: nombresFemur, correctaId: parte, pistas: [pista], feedbackError,
  };
}

const piezasCorazon = anotaciones.filter(note => note.estructuraId === 'heart');
const opcionesCorazon = piezasCorazon.map(note => ({ id: note.parteId, texto: note.etiquetaEs, nodeId: note.nodeId }));

function pieza(id: string, pista: string, feedbackError: string): PreguntaReto {
  const note = piezasCorazon.find(piece => piece.parteId === id)!;
  return {
    id: `toca-${id}`, enunciado: `Toca: ${note.etiquetaEs} · ${note.etiquetaEn}`, estructuraId: 'heart',
    respuestas: opcionesCorazon, correctaId: id, pistas: [pista], feedbackError,
  };
}

export const retos: readonly Reto[] = [
  {
    id: 'femur-funcion',
    titulo: 'El fémur en movimiento',
    tipo: 'relaciona-funcion',
    modos,
    estructurasRelacionadas: ['femur', 'tibia', 'patella'],
    preguntas: [
      {
        id: 'funcion-femur', enunciado: '¿Qué función cumple el fémur?', estructuraId: 'femur',
        respuestas: funcionesRodilla, correctaId: 'sostener',
        pistas: ['Fíjate qué articulación hay en cada extremo del fémur.'],
        feedbackError: 'El fémur ocupa el muslo y transmite el peso entre la cadera y la rodilla.',
      },
      {
        id: 'funcion-tibia', enunciado: '¿Qué función cumple la tibia?', estructuraId: 'tibia',
        respuestas: funcionesRodilla, correctaId: 'unir',
        pistas: ['Busca la estructura que se extiende entre la rodilla y el tobillo.'],
        feedbackError: 'La tibia está en la pierna, por debajo del fémur, y soporta una gran parte del peso.',
      },
      {
        id: 'funcion-patella', enunciado: '¿Qué función cumple la rótula?', estructuraId: 'patella',
        respuestas: funcionesRodilla, correctaId: 'cubrir',
        pistas: ['Piensa en el hueso que está por delante de la rodilla.'],
        feedbackError: 'La rótula se encuentra en el tendón del cuádriceps y mejora su palanca para extender la rodilla.',
      },
    ],
    revision: revisionFemur,
  },
  {
    id: 'partes-femur', titulo: 'Tres partes del fémur', tipo: 'ubica-partes', modos, estructurasRelacionadas: ['femur'],
    preguntas: [etiqueta('cabeza', 1), etiqueta('cuerpo', 2), etiqueta('condilos', 3)],
    revision: revisionFemur,
  },
  {
    id: 'corazon-3d', titulo: 'Explora el corazón en corte', tipo: 'senala-estructura', modos, estructurasRelacionadas: ['heart'],
    preguntas: [
      pieza('aorta', 'Busca el vaso que forma un arco en la parte superior del modelo.', 'La aorta sale del ventrículo izquierdo y forma un arco superior.'),
      pieza('mitral_valve', 'Está entre las dos cámaras izquierdas, a la derecha de la imagen frontal.', 'La válvula mitral separa la aurícula izquierda del ventrículo izquierdo.'),
      pieza('right_ventricle', 'Inspecciona la cámara inferior azul a la izquierda de la imagen frontal.', 'El ventrículo derecho impulsa sangre hacia los pulmones por el tronco pulmonar.'),
    ],
    revision: revision('heart'),
  },
  {
    id: 'repaso-musculos', titulo: 'Músculos en acción', tipo: 'repaso-breve', modos, estructurasRelacionadas: ['biceps_brachii', 'quadriceps_femoris'],
    preguntas: [
      {
        id: 'flexion-codo', enunciado: '¿Qué músculo ayuda a flexionar el codo?', estructuraId: 'biceps_brachii',
        respuestas: [
          { id: 'cuadriceps', texto: 'Cuádriceps femoral' },
          { id: 'biceps', texto: 'Bíceps braquial' },
          { id: 'vasto-medial', texto: 'Vasto medial' },
        ],
        correctaId: 'biceps', pistas: ['Piensa en el músculo de la cara anterior del brazo.'],
        feedbackError: 'El bíceps braquial actúa sobre el codo. El cuádriceps y su vasto medial actúan sobre la rodilla.',
      },
      {
        id: 'flexion-cadera', enunciado: '¿Qué parte del cuádriceps también ayuda a flexionar la cadera?', estructuraId: 'quadriceps_femoris',
        respuestas: [
          { id: 'recto', texto: 'Recto femoral' },
          { id: 'medial', texto: 'Vasto medial' },
          { id: 'lateral', texto: 'Vasto lateral' },
        ],
        correctaId: 'recto', pistas: ['Busca la porción que cruza tanto la cadera como la rodilla.'],
        feedbackError: 'El recto femoral cruza la cadera, a diferencia de los vastos, y puede ayudar a flexionarla.',
      },
    ],
    revision: {
      estado: 'provisional',
      fuentes: [revision('biceps_brachii').fuentes[0], revision('quadriceps_femoris').fuentes[0]],
    },
  },
];
