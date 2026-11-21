import type { CasoClinico, PreguntaAnamnesis, PreguntaInicio, PreguntaSeguimiento, Tres } from '../types';

const sentado = {
  id: 'sentado', pregunta: '¿Qué pasa después de estar sentado un rato?',
  respuesta: 'Cuando me levanto después de estar sentado con la rodilla doblada, me molesta al principio.',
  aporte: 'El dolor aparece tras mantener la rodilla flexionada.',
};
const cuclillas = {
  id: 'cuclillas', pregunta: '¿Qué sientes al agacharte?',
  respuesta: 'Al ponerme en cuclillas me duele la parte de adelante de la rodilla.',
  aporte: 'El dolor aumenta al flexionar la rodilla con carga.',
};
const derrame = {
  id: 'derrame', pregunta: '¿Has notado que la rodilla se hinche?',
  respuesta: 'No he notado que se hinche.',
  aporte: 'El paciente no refiere hinchazón visible.',
};
const reposo = {
  id: 'reposo', pregunta: '¿La molestia continúa cuando descansas?',
  respuesta: 'Cuando paro un rato, baja mucho. Si estoy acostado no me duele.',
  aporte: 'La molestia disminuye al dejar de cargar la rodilla.',
};
const bloqueo = {
  id: 'bloqueo', pregunta: '¿La rodilla se queda trabada al doblarla o estirarla?',
  respuesta: 'No, se mueve por completo. Lo que me frena a veces es el dolor.',
  aporte: 'El paciente conserva el movimiento y no refiere bloqueos.',
};

function seguimiento(pregunta: PreguntaAnamnesis, siguiente: Tres<PreguntaAnamnesis>): PreguntaSeguimiento {
  return { ...pregunta, siguiente };
}

const trauma = seguimiento({
  id: 'trauma', pregunta: '¿Recuerdas un golpe o un giro de la rodilla?',
  respuesta: 'No, no me golpeé ni torcí la rodilla.',
  aporte: 'El paciente no refiere un traumatismo ni un giro previo.',
}, [bloqueo, derrame, cuclillas]);

const carga = seguimiento({
  id: 'carga', pregunta: '¿Cambió cuánto caminas o entrenas estas semanas?',
  respuesta: 'Sí. Empecé a pasar más tiempo caminando y subiendo escaleras en el trabajo.',
  aporte: 'La frecuencia de actividades con carga aumentó antes de la consulta.',
}, [cuclillas, sentado, reposo]);

const descenso = seguimiento({
  id: 'descenso', pregunta: '¿También te molesta cuando bajas las escaleras?',
  respuesta: 'Sí, al bajar también noto el dolor frente a la rodilla.',
  aporte: 'El dolor se reproduce al descender escaleras.',
}, [reposo, sentado, bloqueo]);

const estabilidad = seguimiento({
  id: 'estabilidad', pregunta: '¿Has sentido que la rodilla te falla al apoyarte?',
  respuesta: 'No, puedo apoyarme. Solo me duele al doblarla con peso.',
  aporte: 'El paciente no refiere episodios de inestabilidad.',
}, [reposo, cuclillas, derrame]);

const primerTurno: Tres<PreguntaInicio> = [{
  id: 'inicio', pregunta: '¿Cómo comenzó la molestia?',
  respuesta: 'Empezó poco a poco hace unas tres semanas.',
  aporte: 'El inicio fue gradual.',
  siguiente: [trauma, carga, descenso],
}, {
  id: 'ubicacion', pregunta: '¿Dónde sientes el dolor?',
  respuesta: 'Aquí adelante, alrededor de la rótula.',
  aporte: 'El paciente sitúa el dolor alrededor de la rótula.',
  siguiente: [descenso, estabilidad, carga],
}, {
  id: 'impacto', pregunta: '¿Qué actividad de tu día se ha vuelto más difícil?',
  respuesta: 'Subir al segundo piso con las compras. En suelo plano puedo caminar.',
  aporte: 'Subir escalones con carga limita más que caminar en llano.',
  siguiente: [carga, estabilidad, trauma],
}];

export const casos: readonly CasoClinico[] = [{
  id: 'dolor-al-subir-escaleras',
  titulo: 'Dolor al subir escaleras',
  descripcion: 'Entrevista a una persona con dolor de rodilla durante sus actividades diarias.',
  paciente: {
    id: 'paciente-rodilla', rol: 'paciente', nombre: 'Alex',
    recursoVisual: { tipo: 'icono', referencia: 'usuario', provisional: true },
  },
  tutor: {
    id: 'tutor-entrevista', rol: 'tutor', nombre: 'Mar',
    recursoVisual: { tipo: 'icono', referencia: 'tutor', provisional: true },
  },
  motivoConsulta: 'Me duele por delante de la rodilla cuando subo escaleras. Empezó hace unas semanas y cada vez me cuesta más subir.',
  primerTurno,
  preguntaFinal: '¿Qué podría ser, doctor/a?',
  hipotesis: {
    correcta: { id: 'dolor-femoropatelar', texto: 'Dolor femoropatelar' },
    alternativas: [
      { id: 'menisco', texto: 'Lesión meniscal por giro', porQueEncajaMenos: 'El patrón de dolor anterior al cargar la rodilla orienta más al origen femoropatelar. Un giro o síntomas mecánicos apoyarían la alternativa meniscal.' },
      { id: 'luxacion', texto: 'Luxación de rótula', porQueEncajaMenos: 'La aparición gradual y el apoyo conservado encajan menos con un episodio de desplazamiento agudo de la rótula.' },
    ],
  },
  pistas: ['Ubica el dolor que describe el paciente.', 'Relaciona la subida de escalones con la flexión de rodilla bajo carga.'],
  explicacion: 'En este caso didáctico, el dolor anterior de inicio gradual que aparece al subir escaleras apoya la hipótesis de dolor femoropatelar. Una entrevista por sí sola no confirma el diagnóstico en una consulta real.',
  preguntasTutor: [
    { id: 'hallazgo', pregunta: '¿Qué dato influyó más en tu elección?' },
    { id: 'alternativa', pregunta: '¿Qué dato necesitarías para valorar mejor una lesión relacionada con un giro?',
      cuando: { hipotesisId: 'menisco' }, sugerencia: 'Contrasta los síntomas de un giro con el inicio gradual que relata el paciente.' },
    { id: 'antecedente', pregunta: '¿Qué pregunta adicional habría sido útil?',
      cuando: { preguntaOmitidaId: 'trauma' }, sugerencia: 'Explora si el dolor empezó después de un golpe o giro.' },
  ],
  recomendacionEntrevista: 'Tras precisar dónde duele, pregunta cuándo comenzó y si hubo un golpe o giro.',
  respuestaReferencia: 'La persona refiere dolor anterior de rodilla al subir escaleras desde hace semanas. La localización y el dolor al flexionarla con carga apoyan la hipótesis femoropatelar. Completaría la entrevista preguntando cómo comenzó y si hay episodios de bloqueo o inestabilidad.',
  estructurasRelacionadas: ['femur', 'patella'],
  revision: {
    estado: 'provisional',
    fuentes: [
      { titulo: 'AAOS · Patellofemoral Pain Syndrome', url: 'https://www.orthoinfo.org/bodypart/kneelower-leg/patellofemoral-pain-syndrome/' },
      { titulo: 'JOSPT · Patellofemoral Pain Clinical Practice Guideline', url: 'https://doi.org/10.2519/jospt.2019.0302' },
    ],
  },
}];
