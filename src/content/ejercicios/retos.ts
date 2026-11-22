import { estructuras, revisionFemur } from '../anatomy/catalogo';
import { gruposEtiquetasCorazon } from '../anatomy/corazon';
import { anotaciones } from '../anotaciones/anatomia';
import type { ModoReto, PreguntaReto, RespuestaReto, Reto } from '../types';
import { preguntasRepasoAmpliacion } from './repasoAmpliacion';
import { preguntasRepasoHuesos } from './repasoHuesos';
import { preguntasRepasoMusculos } from './repasoMusculos';
import { preguntasRepasoOrganos } from './repasoOrganos';

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

function preguntasDePartes(estructuraId: string, ids?: readonly string[]) {
  const estructura = estructuras.find(item => item.id === estructuraId)!;
  const partes = estructura.partes.filter(parte => !ids || ids.includes(parte.id));
  const respuestas: readonly RespuestaReto[] = [...partes].reverse().map(parte => ({
    id: parte.id,
    texto: parte.nombreEs,
    anotacionId: anotaciones.find(note => note.estructuraId === estructuraId && note.parteId === parte.id)!.id,
  }));
  return partes.map((parte, index): PreguntaReto => ({
    id: `${estructuraId}-${parte.id}`, enunciado: `${estructura.nombreEs} · Recuadro ${index + 1}`,
    estructuraId, respuestas, correctaId: parte.id, pistas: [parte.ubicacion],
    feedbackError: `El recuadro señala: ${parte.nombreEs}. ${parte.ubicacion}`,
  }));
}

function retoDeModelos(
  id: string, titulo: string, tipo: Reto['tipo'],
  modelos: readonly [string, ...string[]], preguntasPorModelo: (estructuraId: string) => readonly PreguntaReto[],
): Reto {
  const [primera, ...otras] = modelos.flatMap(preguntasPorModelo);
  if (!primera) throw new Error(`Faltan las preguntas del reto ${id}`);
  const [fuente, ...fuentes] = revision(modelos[0]).fuentes;
  const porUrl = new Map(fuentes.map(item => [item.url, item]));
  for (const estructuraId of modelos.slice(1)) for (const item of revision(estructuraId).fuentes) {
    if (item.url !== fuente.url) porUrl.set(item.url, item);
  }
  return {
    id, titulo, tipo, modos, estructurasRelacionadas: modelos,
    preguntas: [primera, ...otras], revision: { estado: 'provisional', fuentes: [fuente, ...porUrl.values()] },
  };
}

type PartesPorModelo = Readonly<Record<string, readonly string[]>>;

function retoDeFunciones(id: string, titulo: string, modelos: readonly [string, ...string[]], partesPorModelo: PartesPorModelo = {}) {
  const elementos = modelos.flatMap(estructuraId => {
    const estructura = estructuras.find(item => item.id === estructuraId)!;
    const { nombreEs, ubicacion, funcion } = estructura;
    const partes = (partesPorModelo[estructuraId] ?? []).map(parteId => {
      const parte = estructura.partes.find(item => item.id === parteId);
      const anotacion = anotaciones.find(item => item.estructuraId === estructuraId && item.parteId === parteId);
      if (!parte || !anotacion) throw new Error(`Falta la parte ${parteId} de ${estructuraId} en ${id}`);
      return {
        id: anotacion.id, estructuraId, anotacionId: anotacion.id,
        nombreEs: parte.nombreEs, ubicacion: parte.ubicacion, funcion: parte.funcion,
      };
    });
    return [{ id: estructuraId, estructuraId, nombreEs, ubicacion, funcion, anotacionId: undefined }, ...partes];
  });
  const opciones: RespuestaReto[] = elementos.map(({ id, funcion, anotacionId }) => ({ id, texto: funcion, anotacionId })).reverse();
  return retoDeModelos(id, titulo, 'relaciona-funcion', modelos, estructuraId => elementos
    .filter(elemento => elemento.estructuraId === estructuraId)
    .map(({ id, nombreEs, ubicacion, funcion, anotacionId }) => ({
      id: `funcion-${id}`,
      enunciado: anotacionId ? nombreEs : `¿Qué función cumple ${nombreEs.toLocaleLowerCase('es')}?`,
      estructuraId, respuestas: opciones, correctaId: id,
      pistas: [ubicacion], feedbackError: `${ubicacion} ${funcion}`,
    })));
}

function retoDeUbicar(id: string, titulo: string, modelos: readonly [string, ...string[]]) {
  return retoDeModelos(id, titulo, 'ubica-partes', modelos, estructuraId =>
    preguntasDePartes(estructuraId, estructuraId === 'heart' ? gruposEtiquetasCorazon[0].partes : undefined));
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

const preguntasCorazon = [
  pieza('aorta', 'Busca el vaso que forma un arco en la parte superior del modelo.', 'La aorta sale del ventrículo izquierdo y forma un arco superior.'),
  pieza('mitral_valve', 'Está entre las dos cámaras izquierdas, a la derecha de la imagen frontal.', 'La válvula mitral separa la aurícula izquierda del ventrículo izquierdo.'),
  pieza('right_ventricle', 'Inspecciona la cámara inferior azul a la izquierda de la imagen frontal.', 'El ventrículo derecho impulsa sangre hacia los pulmones por el tronco pulmonar.'),
] satisfies [PreguntaReto, ...PreguntaReto[]];

function preguntasDeSenalar(estructuraId: string): readonly PreguntaReto[] {
  if (estructuraId === 'heart') return preguntasCorazon;
  const estructura = estructuras.find(item => item.id === estructuraId)!;
  const notas = anotaciones.filter(note => note.estructuraId === estructuraId);
  const respuestas = notas.map(note => ({ id: note.parteId, texto: note.etiquetaEs, nodeId: note.nodeId }));
  // The deep heads can be studied with labels but are difficult to tap directly.
  const partesTocables = estructura.partes.filter(parte => parte.id !== 'vasto_intermedio'
    && !(estructuraId === 'triceps_brachii' && parte.id === 'cabeza_medial'));
  return partesTocables.map(parte => ({
    id: `toca-${estructuraId}-${parte.id}`, enunciado: `Toca: ${parte.nombreEs} · ${parte.terminoEn}`,
    estructuraId, respuestas, correctaId: parte.id, pistas: [parte.ubicacion],
    feedbackError: `${parte.ubicacion} ${parte.funcion}`,
  }));
}

const recorridosAmpliacion = [
  { id: 'huesos-ampliacion', titulo: 'Cúbito, peroné y esternón', modelos: ['ulna', 'fibula', 'sternum'] },
  { id: 'musculos-ampliacion', titulo: 'Deltoides, tríceps y gastrocnemio', modelos: ['deltoid', 'triceps_brachii', 'gastrocnemius'] },
  { id: 'organos-ampliacion', titulo: 'Estómago y riñones', modelos: ['stomach', 'kidneys'] },
  { id: 'hombro-torax', titulo: 'Clavícula, escápula y costillas', modelos: ['clavicle', 'scapula', 'ribs'] },
  { id: 'mano-pie', titulo: 'Huesos de la mano y el pie', modelos: ['hand', 'foot'] },
  { id: 'cabeza-cuello-columna', titulo: 'Mandíbula, hioides y columna', modelos: ['mandible', 'hyoid', 'cervical_vertebra', 'thoracic_lumbar_vertebrae', 'sacrum'] },
  { id: 'hombro-espalda-cuello', titulo: 'Músculos del hombro, la espalda y el cuello', modelos: ['pectoralis_major', 'trapezius', 'latissimus_dorsi', 'sternocleidomastoid'] },
  { id: 'abdomen-respiracion', titulo: 'Músculos del abdomen y la respiración', modelos: ['rectus_abdominis', 'external_oblique', 'diaphragm'] },
  { id: 'digestion-superior', titulo: 'Páncreas, vesícula biliar y esófago', modelos: ['pancreas', 'gallbladder', 'esophagus'] },
  { id: 'vias-respiratorias', titulo: 'Laringe, tráquea y bronquios principales', modelos: ['trachea_bronchi', 'larynx'] },
  { id: 'via-urinaria', titulo: 'Vías urinarias y suprarrenales', modelos: ['urinary_bladder', 'ureters', 'adrenal_glands'] },
  { id: 'organos-linfoides', titulo: 'Bazo y timo', modelos: ['spleen', 'thymus'] },
  { id: 'craneo-columna', titulo: 'Cráneo y columna vertebral', modelos: ['skull', 'spine'] },
  { id: 'cerebro-digestion', titulo: 'Cerebro, hígado e intestinos', modelos: ['brain', 'liver', 'small_intestine', 'large_intestine'] },
  { id: 'cadera-muslo-pierna', titulo: 'Músculos de la cadera, el muslo y la pierna', modelos: ['gluteus_maximus', 'hamstrings', 'tibialis_anterior'] },
] as const;

const preguntasRepasoRecorridos = [...preguntasRepasoAmpliacion, ...preguntasRepasoHuesos, ...preguntasRepasoMusculos, ...preguntasRepasoOrganos];

const partesParaRelacionar: Readonly<Partial<Record<string, PartesPorModelo>>> = {
  'craneo-columna': { skull: ['mandibula'], spine: ['atlas', 'axis', 'coccix'] },
};

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
    preguntas: preguntasCorazon,
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
  {
    id: 'repaso-huesos', titulo: 'Huesos y articulaciones', tipo: 'repaso-breve', modos,
    estructurasRelacionadas: ['tibia', 'radius', 'pelvis', 'humerus'],
    preguntas: [
      {
        id: 'peso-pierna', enunciado: '¿Qué hueso soporta gran parte del peso entre la rodilla y el tobillo?', estructuraId: 'tibia',
        respuestas: [{ id: 'rotula', texto: 'Rótula' }, { id: 'femur', texto: 'Fémur' }, { id: 'tibia', texto: 'Tibia' }],
        correctaId: 'tibia', pistas: ['Busca el hueso largo de la pierna, por debajo de la rodilla.'],
        feedbackError: 'La tibia soporta gran parte del peso en la pierna. El fémur está en el muslo y la rótula está delante de la rodilla.',
      },
      {
        id: 'lado-pulgar', enunciado: 'En posición anatómica, ¿qué hueso del antebrazo queda del lado del pulgar?', estructuraId: 'radius',
        respuestas: [{ id: 'radio', texto: 'Radio' }, { id: 'ulna', texto: 'Ulna' }, { id: 'humero', texto: 'Húmero' }],
        correctaId: 'radio', pistas: ['El húmero está en el brazo, por encima del codo.'],
        feedbackError: 'El radio queda del lado del pulgar en posición anatómica. La ulna queda del lado del meñique.',
      },
      {
        id: 'cavidad-cadera', enunciado: '¿Qué cavidad del hueso coxal recibe la cabeza del fémur?', estructuraId: 'pelvis',
        respuestas: [{ id: 'pubis', texto: 'Pubis' }, { id: 'acetabulo', texto: 'Acetábulo' }, { id: 'ilion', texto: 'Ilion' }],
        correctaId: 'acetabulo', pistas: ['Busca en la cara lateral del hueso coxal, donde se forma la articulación de la cadera.'],
        feedbackError: 'El acetábulo es la cavidad donde encaja la cabeza del fémur. Allí confluyen el ilion, el isquion y el pubis.',
      },
      {
        id: 'parte-codo', enunciado: '¿Qué parte del húmero se articula con la ulna en el codo?', estructuraId: 'humerus',
        respuestas: [{ id: 'cabeza', texto: 'Cabeza del húmero' }, { id: 'cuerpo', texto: 'Cuerpo del húmero' }, { id: 'troclea', texto: 'Tróclea humeral' }],
        correctaId: 'troclea', pistas: ['Está en el extremo más cercano al codo.'],
        feedbackError: 'La tróclea humeral forma parte del extremo distal del húmero y se articula con la ulna.',
      },
    ],
    revision: { estado: 'provisional', fuentes: [revision('tibia').fuentes[0], revision('radius').fuentes[0], revision('pelvis').fuentes[0]] },
  },
  {
    id: 'repaso-organos', titulo: 'Corazón y respiración', tipo: 'repaso-breve', modos,
    estructurasRelacionadas: ['heart', 'lungs'],
    preguntas: [
      {
        id: 'camara-aorta', enunciado: '¿Qué cámara del corazón impulsa sangre hacia la aorta?', estructuraId: 'heart',
        respuestas: [{ id: 'ad', texto: 'Aurícula derecha' }, { id: 'vi', texto: 'Ventrículo izquierdo' }, { id: 'vd', texto: 'Ventrículo derecho' }],
        correctaId: 'vi', pistas: ['La aorta sale de una cámara inferior del lado izquierdo.'],
        feedbackError: 'El ventrículo izquierdo impulsa sangre hacia la aorta. El ventrículo derecho la impulsa hacia el tronco pulmonar.',
      },
      {
        id: 'lobulos-derechos', enunciado: '¿Cuántos lóbulos tiene el pulmón derecho?', estructuraId: 'lungs',
        respuestas: [{ id: 'dos', texto: 'Dos' }, { id: 'cuatro', texto: 'Cuatro' }, { id: 'tres', texto: 'Tres' }],
        correctaId: 'tres', pistas: ['En el lado derecho hay un lóbulo medio, además del superior y el inferior.'],
        feedbackError: 'El pulmón derecho tiene un lóbulo superior, uno medio y uno inferior. El izquierdo tiene dos.',
      },
      {
        id: 'intercambio-gases', enunciado: '¿Qué función cumplen los pulmones?', estructuraId: 'lungs',
        respuestas: [
          { id: 'gases', texto: 'Intercambiar oxígeno y dióxido de carbono entre el aire y la sangre.' },
          { id: 'aorta', texto: 'Bombear sangre hacia la aorta.' },
          { id: 'valvulas', texto: 'Evitar el retroceso de sangre entre las cámaras cardíacas.' },
        ],
        correctaId: 'gases', pistas: ['Piensa en qué gases entran y salen del cuerpo al respirar.'],
        feedbackError: 'Los pulmones permiten el intercambio de gases. El bombeo y las válvulas corresponden al corazón.',
      },
    ],
    revision: { estado: 'provisional', fuentes: [revision('heart').fuentes[0], revision('lungs').fuentes[0]] },
  },
  retoDeUbicar('partes-huesos', 'Cinco huesos del atlas', ['tibia', 'humerus', 'radius', 'pelvis', 'patella']),
  retoDeUbicar('partes-musculos', 'Partes del bíceps y el cuádriceps', ['biceps_brachii', 'quadriceps_femoris']),
  retoDeUbicar('partes-organos', 'Partes del corazón y los pulmones', ['heart', 'lungs']),
  retoDeModelos('senala-huesos', 'Señala partes de los huesos', 'senala-estructura', ['femur', 'tibia', 'humerus', 'radius', 'pelvis', 'patella'], preguntasDeSenalar),
  retoDeModelos('senala-musculos', 'Señala partes del bíceps y el cuádriceps', 'senala-estructura', ['biceps_brachii', 'quadriceps_femoris'], preguntasDeSenalar),
  retoDeModelos('senala-organos', 'Señala partes del corazón y los pulmones', 'senala-estructura', ['heart', 'lungs'], preguntasDeSenalar),
  retoDeFunciones('funcion-huesos', 'Cadera, brazo y antebrazo', ['pelvis', 'humerus', 'radius']),
  retoDeFunciones('funcion-musculos', 'Bíceps y cuádriceps', ['biceps_brachii', 'quadriceps_femoris']),
  retoDeFunciones('funcion-organos', 'Corazón y pulmones', ['heart', 'lungs']),
  ...recorridosAmpliacion.flatMap(({ id, titulo, modelos }) => [
    retoDeUbicar(`partes-${id}`, titulo, modelos),
    retoDeModelos(`senala-${id}`, titulo, 'senala-estructura', modelos, preguntasDeSenalar),
    retoDeFunciones(`funcion-${id}`, titulo, modelos, partesParaRelacionar[id]),
    retoDeModelos(`repaso-${id}`, titulo, 'repaso-breve', modelos, estructuraId =>
      preguntasRepasoRecorridos.filter(pregunta => pregunta.estructuraId === estructuraId)),
  ]),
];
