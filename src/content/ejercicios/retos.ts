import { revisionFemur } from '../anatomy/catalogo';
import type { Reto } from '../types';

export const retos: readonly Reto[] = [{
  id: 'femur-funcion',
  titulo: 'El fémur en movimiento',
  tipo: 'relaciona-funcion',
  modos: ['entrenamiento', 'evaluacion'],
  estructurasRelacionadas: ['femur'],
  preguntas: [{
    id: 'funcion-femur',
    enunciado: '¿Qué función cumple el fémur?',
    estructuraId: 'femur',
    respuestas: [
      { id: 'sostener', texto: 'Transmitir el peso entre la cadera y la rodilla.' },
      { id: 'cubrir', texto: 'Cubrir la parte anterior de la rodilla.', feedbackError: 'Esa posición corresponde a la rótula.' },
      { id: 'unir', texto: 'Unir la rodilla con el tobillo.', feedbackError: 'La tibia recorre la pierna entre la rodilla y el tobillo.' },
    ],
    correctaId: 'sostener',
    pistas: ['Fíjate qué articulación hay en cada extremo del fémur.'],
    feedbackError: 'Ubica primero el fémur en el muslo y sigue cómo pasa el peso desde la cadera a la rodilla.',
  }],
  revision: revisionFemur,
}];
