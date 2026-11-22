export interface Fuente {
  titulo: string;
  url: string;
}

export interface Revision {
  estado: 'provisional' | 'en-revision' | 'revisado';
  fuentes: readonly [Fuente, ...Fuente[]];
  revisadoPor?: string;
  fecha?: string;
}

export interface Revisable {
  revision: Revision;
}

export type CategoriaAnatomica = 'huesos' | 'musculos' | 'organos';
export type Punto3D = readonly [x: number, y: number, z: number];
export type Tres<T> = readonly [T, T, T];

export interface ReferenciaModelo {
  assetId: string;
  nodeId: string;
}

export interface ParteAnatomica {
  id: string;
  nombreEs: string;
  terminoEn: string;
  ubicacion: string;
  funcion: string;
}

export interface Estructura extends Revisable {
  id: string;
  categoria: CategoriaAnatomica;
  nombreEs: string;
  terminoEn: string;
  definicion: string;
  ubicacion: string;
  funcion: string;
  modelo?: ReferenciaModelo;
  miniatura?: string;
  partes: readonly ParteAnatomica[];
  relacionadas: readonly string[];
}

export interface Anotacion extends Revisable {
  id: string;
  estructuraId: string;
  parteId: string;
  etiquetaEs: string;
  etiquetaEn: string;
  punto: Punto3D;
  nodeId: string;
}

export type TipoReto = 'ubica-partes' | 'senala-estructura' | 'relaciona-funcion' | 'repaso-breve';
export type ModoReto = 'entrenamiento' | 'evaluacion';

export const retoTypeLabels = {
  'ubica-partes': 'Ubica las partes',
  'senala-estructura': 'Señala la estructura',
  'relaciona-funcion': 'Relaciona estructura y función',
  'repaso-breve': 'Repaso breve',
} satisfies Record<TipoReto, string>;

export const retoModeLabels = {
  entrenamiento: 'Entrenamiento', evaluacion: 'Evaluación',
} satisfies Record<ModoReto, string>;

export interface RespuestaReto {
  id: string;
  texto: string;
  anotacionId?: string;
  nodeId?: string;
  feedbackError?: string;
}

export interface PreguntaReto {
  id: string;
  enunciado: string;
  estructuraId: string;
  respuestas: readonly RespuestaReto[];
  correctaId: string;
  pistas: readonly string[];
  feedbackError: string;
}

export interface Reto extends Revisable {
  id: string;
  titulo: string;
  tipo: TipoReto;
  modos: readonly ModoReto[];
  estructurasRelacionadas: readonly string[];
  preguntas: readonly [PreguntaReto, ...PreguntaReto[]];
}

export interface Personaje {
  id: string;
  rol: 'paciente' | 'tutor';
  nombre: string;
  recursoVisual: {
    tipo: 'icono' | 'imagen' | 'modelo-3d';
    referencia: string;
    provisional: boolean;
  };
}

export interface PreguntaAnamnesis {
  id: string;
  pregunta: string;
  respuesta: string;
  aporte: string;
}

export interface PreguntaSeguimiento extends PreguntaAnamnesis {
  siguiente: Tres<PreguntaAnamnesis>;
}

export interface PreguntaInicio extends PreguntaAnamnesis {
  siguiente: Tres<PreguntaSeguimiento>;
}

export interface Hipotesis {
  id: string;
  texto: string;
}

export interface HipotesisAlternativa extends Hipotesis {
  porQueEncajaMenos: string;
}

export interface PreguntaTutor {
  id: string;
  pregunta: string;
  cuando?: {
    hipotesisId?: string;
    preguntaOmitidaId?: string;
  };
  sugerencia?: string;
}

export interface CasoClinico extends Revisable {
  id: string;
  titulo: string;
  descripcion: string;
  paciente: Personaje & { rol: 'paciente' };
  tutor: Personaje & { rol: 'tutor' };
  motivoConsulta: string;
  primerTurno: Tres<PreguntaInicio>;
  preguntaFinal: string;
  hipotesis: {
    correcta: Hipotesis;
    alternativas: readonly [HipotesisAlternativa, HipotesisAlternativa];
  };
  pistas: readonly string[];
  explicacion: string;
  preguntasTutor: readonly PreguntaTutor[];
  recomendacionEntrevista: string;
  respuestaReferencia: string;
  estructurasRelacionadas: readonly string[];
}
