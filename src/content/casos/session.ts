import { investigationCases } from './investigations';
import { matchingCases } from './matchingCases';
import { interviewRevision, nodeFactory } from './interviewNodes';
import { additionalInterviewCases } from './readings';
import { additionalMultipleChoiceCases, additionalOrderingCases } from './shortCases';
import type { ClinicalCase, InterviewNode } from './sessionTypes';

const knee = nodeFactory('Alex');
const kneeNodes: readonly InterviewNode[] = [
  knee('k-onset', ['When did the pain begin?', '¿Cuándo empezó el dolor?'], ['It began gradually about three weeks ago.', 'Empezó poco a poco hace unas tres semanas.'], ['About three weeks ago', 'Hace unas tres semanas'], [['Last night', 'Anoche'], ['About one year ago', 'Hace aproximadamente un año']], ['k-injury', 'k-change', 'k-progress']),
  knee('k-location', ['Where exactly do you feel the pain?', '¿Dónde sientes exactamente el dolor?'], ['I feel it at the front of my knee, around the kneecap.', 'Lo siento delante de la rodilla, alrededor de la rótula.'], ['At the front, around the kneecap', 'Delante, alrededor de la rótula'], [['Behind the knee', 'Detrás de la rodilla'], ['In the ankle', 'En el tobillo']], ['k-touch', 'k-spread', 'k-swelling']),
  knee('k-trigger', ['Which activities make it hurt more?', '¿Qué actividades hacen que duela más?'], ['Squatting and going down stairs make it worse.', 'Ponerse en cuclillas y bajar escaleras lo empeoran.'], ['Squatting and going down stairs', 'Ponerse en cuclillas y bajar escaleras'], [['Lying in bed', 'Estar acostado'], ['Moving the ankle', 'Mover el tobillo']], ['k-stairs', 'k-rest', 'k-sitting']),

  knee('k-injury', ['Did you fall or twist your knee before it started?', '¿Te caíste o te torciste la rodilla antes de que empezara?'], ['No. I do not remember any fall or sudden twist.', 'No. No recuerdo ninguna caída ni giro brusco.'], ['There was no fall or sudden twist', 'No hubo caída ni giro brusco'], [['He fell while running', 'Se cayó mientras corría'], ['He twisted it playing football', 'Se la torció jugando fútbol']], ['k-locking', 'k-stability', 'k-swelling-detail']),
  knee('k-change', ['Did your routine change before the pain began?', '¿Cambió tu rutina antes de que empezara el dolor?'], ['Yes. I started using the stairs much more often at work.', 'Sí. Empecé a usar las escaleras mucho más en el trabajo.'], ['He began using stairs more often', 'Empezó a usar más las escaleras'], [['He stopped walking completely', 'Dejó de caminar por completo'], ['He began swimming every morning', 'Empezó a nadar cada mañana']], ['k-running', 'k-relief', 'k-history']),
  knee('k-progress', ['Has the pain changed during these three weeks?', '¿Ha cambiado el dolor durante estas tres semanas?'], ['It is a little stronger now, especially after a busy day.', 'Ahora es un poco más fuerte, especialmente después de un día ocupado.'], ['It had become a little stronger', 'Se había vuelto un poco más fuerte'], [['It disappeared completely', 'Desapareció por completo'], ['It moved to the other knee', 'Pasó a la otra rodilla']], ['k-night', 'k-rating', 'k-relief']),
  knee('k-touch', ['Is the area painful when you touch it?', '¿Duele la zona cuando la tocas?'], ['It is slightly tender around the lower edge of the kneecap.', 'Está un poco sensible alrededor del borde inferior de la rótula.'], ['Near the lower edge of the kneecap', 'Cerca del borde inferior de la rótula'], [['Behind the calf', 'Detrás de la pantorrilla'], ['Over the ankle', 'Sobre el tobillo']], ['k-swelling-detail', 'k-rating', 'k-history']),
  knee('k-spread', ['Does the pain travel anywhere else?', '¿El dolor se extiende a otra zona?'], ['No. It stays around the front of the knee.', 'No. Se queda alrededor de la parte delantera de la rodilla.'], ['It stayed at the front of the knee', 'Se quedaba delante de la rodilla'], [['It travelled to the foot', 'Se extendía hasta el pie'], ['It travelled to the lower back', 'Se extendía hasta la zona lumbar']], ['k-numbness', 'k-stability', 'k-night']),
  knee('k-swelling', ['Have you noticed any swelling?', '¿Has notado hinchazón?'], ['No, it has not looked swollen.', 'No, no se ha visto hinchada.'], ['He had not noticed swelling', 'No había notado hinchazón'], [['It swelled every morning', 'Se hinchaba cada mañana'], ['It was very swollen after a fall', 'Se hinchó mucho después de una caída']], ['k-swelling-detail', 'k-history', 'k-locking']),
  knee('k-stairs', ['Is it worse going up or down stairs?', '¿Es peor al subir o al bajar escaleras?'], ['Going down is worse, although going up also hurts.', 'Bajar es peor, aunque subir también duele.'], ['Going down stairs was worse', 'Bajar escaleras era peor'], [['Going up only', 'Solo subir'], ['Neither direction', 'Ninguna dirección']], ['k-running', 'k-rating', 'k-stability']),
  knee('k-rest', ['What happens when you rest?', '¿Qué ocurre cuando descansas?'], ['The pain settles after I stop putting weight on it for a while.', 'El dolor disminuye después de dejar de cargar peso durante un rato.'], ['The pain decreased', 'El dolor disminuía'], [['The pain became much stronger', 'El dolor se hacía mucho más fuerte'], ['The knee became numb', 'La rodilla se adormecía']], ['k-night', 'k-relief', 'k-rating']),
  knee('k-sitting', ['Does sitting with your knee bent affect it?', '¿Le afecta estar sentado con la rodilla doblada?'], ['Yes. It aches when I stand after sitting for a long time.', 'Sí. Me duele al levantarme después de estar sentado mucho tiempo.'], ['It hurt when he stood after sitting', 'Dolía al levantarse después de estar sentado'], [['It hurt only while sleeping', 'Dolía solo mientras dormía'], ['Sitting removed the pain', 'Sentarse quitaba el dolor']], ['k-locking', 'k-relief', 'k-rating']),

  knee('k-locking', ['Does your knee ever lock or get stuck?', '¿La rodilla se bloquea o se queda trabada?'], ['No, I can bend and straighten it fully.', 'No, puedo doblarla y estirarla por completo.'], ['He could bend and straighten it', 'Podía doblarla y estirarla'], [['It stayed locked', 'Se quedaba bloqueada'], ['Only the ankle moved', 'Solo se movía el tobillo']]),
  knee('k-stability', ['Does the knee feel as if it might give way?', '¿Sientes que la rodilla podría fallarte?'], ['No. It feels stable when I stand on it.', 'No. Se siente estable cuando me apoyo.'], ['It felt stable when standing', 'Se sentía estable al apoyarse'], [['It gave way every day', 'Fallaba todos los días'], ['He could not stand', 'No podía ponerse de pie']]),
  knee('k-swelling-detail', ['Does it become swollen later in the day?', '¿Se hincha al final del día?'], ['No, I have not seen it swell in the evening either.', 'No, tampoco la he visto hincharse por la tarde.'], ['He did not notice swelling', 'No notaba hinchazón'], [['It swelled every evening', 'Se hinchaba cada tarde'], ['It swelled only in the morning', 'Se hinchaba solo por la mañana']]),
  knee('k-night', ['Does the pain wake you at night?', '¿El dolor te despierta por la noche?'], ['No. I sleep normally and notice it with activity.', 'No. Duermo normalmente y lo noto con la actividad.'], ['He slept normally', 'Dormía normalmente'], [['It woke him every night', 'Lo despertaba cada noche'], ['He could not fall asleep', 'No podía dormirse']]),
  knee('k-rating', ['How strong is the pain from zero to ten?', '¿Qué tan fuerte es el dolor del cero al diez?'], ['It is about six out of ten when I squat.', 'Es aproximadamente seis de diez cuando me pongo en cuclillas.'], ['Six out of ten', 'Seis de diez'], [['Two out of ten', 'Dos de diez'], ['Ten out of ten', 'Diez de diez']]),
  knee('k-relief', ['Have you tried anything that helps?', '¿Has probado algo que ayude?'], ['Rest and a cold pack make it feel better.', 'El descanso y una compresa fría hacen que mejore.'], ['Rest and a cold pack helped', 'Ayudaban el descanso y una compresa fría'], [['Running faster helped', 'Ayudaba correr más rápido'], ['Keeping it bent helped', 'Ayudaba mantenerla doblada']]),
  knee('k-running', ['Can you run with the pain?', '¿Puedes correr con el dolor?'], ['I can, but it becomes uncomfortable after a few minutes.', 'Puedo, pero se vuelve incómodo después de unos minutos.'], ['Running became uncomfortable', 'Correr se volvía incómodo'], [['Running removed the pain', 'Correr quitaba el dolor'], ['Running caused numbness', 'Correr causaba adormecimiento']]),
  knee('k-numbness', ['Have you felt numbness or tingling?', '¿Has sentido adormecimiento u hormigueo?'], ['No, I have not felt either of those.', 'No, no he sentido ninguno de los dos.'], ['There was no numbness or tingling', 'No había adormecimiento ni hormigueo'], [['The foot was numb', 'El pie estaba adormecido'], ['Both legs tingled', 'Ambas piernas hormigueaban']]),
  knee('k-history', ['Has this happened before?', '¿Te había ocurrido antes?'], ['I had a mild episode last year, but it went away quickly.', 'Tuve un episodio leve el año pasado, pero desapareció rápido.'], ['There was a mild episode last year', 'Hubo un episodio leve el año pasado'], [['There was no previous episode', 'No hubo un episodio anterior'], ['There was a fracture yesterday', 'Hubo una fractura ayer']]),
];

const shoulder = nodeFactory('Sam');
const shoulderNodes: readonly InterviewNode[] = [
  shoulder('s-onset', ['When did the discomfort begin?', '¿Cuándo empezó la molestia?'], ['It started two days after I changed my gym routine.', 'Empezó dos días después de cambiar mi rutina del gimnasio.'], ['Two days after changing the gym routine', 'Dos días después de cambiar la rutina del gimnasio'], [['Before joining the gym', 'Antes de ir al gimnasio'], ['Immediately after a fall', 'Inmediatamente después de una caída']], ['s-gym', 's-gradual', 's-previous']),
  shoulder('s-location', ['Where do you feel the discomfort?', '¿Dónde sientes la molestia?'], ['It is mostly on the outside of my right shoulder.', 'Está principalmente en la parte externa de mi hombro derecho.'], ['On the outside of the right shoulder', 'En la parte externa del hombro derecho'], [['In the left wrist', 'En la muñeca izquierda'], ['In the lower back', 'En la zona lumbar']], ['s-spread', 's-touch', 's-side']),
  shoulder('s-movement', ['Which movement bothers you most?', '¿Qué movimiento te molesta más?'], ['Lifting my arm above my head is the hardest.', 'Levantar el brazo por encima de la cabeza es lo más difícil.'], ['Lifting the arm above the head', 'Levantar el brazo por encima de la cabeza'], [['Bending the knee', 'Doblar la rodilla'], ['Turning the ankle', 'Girar el tobillo']], ['s-range', 's-weakness-check', 's-work']),

  shoulder('s-gym', ['What new exercise did you start?', '¿Qué ejercicio nuevo empezaste?'], ['I started doing overhead presses with heavier weights.', 'Empecé a hacer press por encima de la cabeza con más peso.'], ['Heavier overhead presses', 'Press por encima de la cabeza con más peso'], [['Long-distance running', 'Carrera de larga distancia'], ['Leg presses only', 'Solo prensa de piernas']], ['s-rating', 's-weakness', 's-rest']),
  shoulder('s-gradual', ['Did it start suddenly or gradually?', '¿Empezó de repente o poco a poco?'], ['It came on gradually, not during one specific repetition.', 'Apareció poco a poco, no durante una repetición específica.'], ['It started gradually', 'Empezó poco a poco'], [['It started suddenly', 'Empezó de repente'], ['It followed a direct fall', 'Siguió a una caída directa']], ['s-swelling', 's-night', 's-rest']),
  shoulder('s-previous', ['Have you had this problem before?', '¿Habías tenido este problema antes?'], ['No, this is the first time my shoulder has felt like this.', 'No, es la primera vez que mi hombro se siente así.'], ['It was the first time', 'Era la primera vez'], [['It happened every month', 'Ocurría cada mes'], ['It followed an old fracture', 'Siguió a una fractura antigua']], ['s-history', 's-night', 's-rating']),
  shoulder('s-spread', ['Does the discomfort travel down your arm?', '¿La molestia baja por el brazo?'], ['No. It stays near the outside of my shoulder.', 'No. Se queda cerca de la parte externa del hombro.'], ['It stayed near the shoulder', 'Se quedaba cerca del hombro'], [['It reached the fingers', 'Llegaba hasta los dedos'], ['It moved to the other arm', 'Pasaba al otro brazo']], ['s-numbness', 's-weakness', 's-night']),
  shoulder('s-touch', ['Is the area tender when you touch it?', '¿La zona está sensible al tocarla?'], ['It is a little tender on the outer side.', 'Está un poco sensible en la parte externa.'], ['The outer side was tender', 'La parte externa estaba sensible'], [['The wrist was tender', 'La muñeca estaba sensible'], ['The lower back was tender', 'La zona lumbar estaba sensible']], ['s-swelling', 's-rating', 's-history']),
  shoulder('s-side', ['Is it only your right shoulder?', '¿Es solo el hombro derecho?'], ['Yes. My left shoulder feels normal.', 'Sí. Mi hombro izquierdo se siente normal.'], ['The left shoulder felt normal', 'El hombro izquierdo se sentía normal'], [['Both shoulders hurt', 'Dolían ambos hombros'], ['Only the left shoulder hurt', 'Solo dolía el hombro izquierdo']], ['s-numbness', 's-night', 's-rest']),
  shoulder('s-range', ['Can you raise the arm all the way?', '¿Puedes levantar el brazo por completo?'], ['Yes, but the last part of the movement is painful.', 'Sí, pero la última parte del movimiento duele.'], ['The final part was painful', 'La parte final dolía'], [['The arm did not move', 'El brazo no se movía'], ['There was no discomfort', 'No había molestia']], ['s-weakness', 's-rating', 's-rest']),
  shoulder('s-weakness-check', ['Does the arm feel weak when you lift something?', '¿El brazo se siente débil al levantar algo?'], ['It feels tired, but I can still hold a light bag.', 'Se siente cansado, pero todavía puedo sostener una bolsa ligera.'], ['He could still hold a light bag', 'Todavía podía sostener una bolsa ligera'], [['He could not hold anything', 'No podía sostener nada'], ['He could only hold a heavy case', 'Solo podía sostener una maleta pesada']], ['s-weakness', 's-work', 's-rating']),
  shoulder('s-work', ['Does it affect your work or daily tasks?', '¿Afecta tu trabajo o tus tareas diarias?'], ['Reaching a high shelf is difficult, but desk work is fine.', 'Alcanzar una repisa alta es difícil, pero trabajar en el escritorio está bien.'], ['Reaching a high shelf was difficult', 'Alcanzar una repisa alta era difícil'], [['Desk work was impossible', 'Trabajar en el escritorio era imposible'], ['Walking was difficult', 'Caminar era difícil']], ['s-rest', 's-night', 's-history']),

  shoulder('s-rating', ['How strong is it from zero to ten?', '¿Qué tan fuerte es del cero al diez?'], ['It is about seven out of ten when I lift the arm high.', 'Es aproximadamente siete de diez cuando levanto mucho el brazo.'], ['Seven out of ten', 'Siete de diez'], [['Three out of ten', 'Tres de diez'], ['Ten out of ten at rest', 'Diez de diez en reposo']]),
  shoulder('s-weakness', ['Have you dropped anything because of weakness?', '¿Has dejado caer algo por debilidad?'], ['No. I have not dropped anything.', 'No. No he dejado caer nada.'], ['He had not dropped anything', 'No había dejado caer nada'], [['He dropped several cups', 'Dejó caer varias tazas'], ['He dropped a heavy box', 'Dejó caer una caja pesada']]),
  shoulder('s-rest', ['Does resting the shoulder help?', '¿Descansar el hombro ayuda?'], ['Yes. It improves when I avoid overhead movement.', 'Sí. Mejora cuando evito movimientos por encima de la cabeza.'], ['Avoiding overhead movement helped', 'Ayudaba evitar movimientos por encima de la cabeza'], [['Heavier weights helped', 'Ayudaba levantar más peso'], ['Sleeping on it helped', 'Ayudaba dormir sobre ese lado']]),
  shoulder('s-swelling', ['Have you noticed swelling or redness?', '¿Has notado hinchazón o enrojecimiento?'], ['No, I have not noticed either one.', 'No, no he notado ninguno de los dos.'], ['There was no swelling or redness', 'No había hinchazón ni enrojecimiento'], [['There was swelling and redness', 'Había hinchazón y enrojecimiento'], ['There was redness only', 'Había solo enrojecimiento']]),
  shoulder('s-night', ['Does it disturb your sleep?', '¿Interrumpe tu sueño?'], ['It wakes me if I roll onto my right side.', 'Me despierta si giro sobre el lado derecho.'], ['Rolling onto the right side woke him', 'Girar sobre el lado derecho lo despertaba'], [['The left side woke him', 'El lado izquierdo lo despertaba'], ['A headache woke him', 'Un dolor de cabeza lo despertaba']]),
  shoulder('s-history', ['Have you ever injured that shoulder?', '¿Te has lesionado ese hombro antes?'], ['No, I have never had a significant injury there.', 'No, nunca he tenido una lesión importante ahí.'], ['There was no significant previous injury', 'No había una lesión previa importante'], [['There was a fracture last year', 'Hubo una fractura el año pasado'], ['There was a dislocation last week', 'Hubo una luxación la semana pasada']]),
  shoulder('s-numbness', ['Do you have numbness or tingling in the arm?', '¿Tienes adormecimiento u hormigueo en el brazo?'], ['No, the sensation in my arm and hand feels normal.', 'No, la sensibilidad del brazo y la mano se siente normal.'], ['Sensation felt normal', 'La sensibilidad se sentía normal'], [['The hand was numb', 'La mano estaba adormecida'], ['Every finger tingled', 'Todos los dedos hormigueaban']]),
];

export const clinicalCases: readonly ClinicalCase[] = [{
  id: 'knee-conversation', kind: 'interview', titleEs: 'Entrevista · Dolor de rodilla',
  summaryEs: 'Habla con Alex y recuerda los detalles que te cuente.',
  instructionsEs: 'Elige una pregunta en cada turno. Al final responderás sobre lo que leíste.',
  patientName: 'Alex', openingEn: 'My right knee hurts whenever I squat.',
  openingEs: 'Me duele la rodilla derecha cada vez que me pongo en cuclillas.',
  roots: ['k-onset', 'k-location', 'k-trigger'], nodes: kneeNodes,
  structuresRelated: ['femur', 'patella'], revision: interviewRevision,
}, {
  id: 'shoulder-conversation', kind: 'interview', titleEs: 'Entrevista · Molestia en el hombro',
  summaryEs: 'Pregunta a Sam por su molestia y comprueba cuánto entendiste.',
  instructionsEs: 'Completa tres turnos de conversación y luego responde las preguntas de comprensión.',
  patientName: 'Sam', openingEn: 'My right shoulder has been bothering me when I move my arm.',
  openingEs: 'Me molesta el hombro derecho cuando muevo el brazo.',
  roots: ['s-onset', 's-location', 's-movement'], nodes: shoulderNodes,
  structuresRelated: [], revision: interviewRevision,
}, {
  id: 'primary-assessment-order', kind: 'ordering', titleEs: 'Orden clínico · Evaluación inicial',
  summaryEs: 'Ordena los cinco pasos de una evaluación inicial sistemática.',
  instructionsEs: 'Reordena las acciones según la secuencia educativa indicada.',
  scenarioEs: 'Un paciente que no responde llega a urgencias. Ordena los pasos de la evaluación inicial.',
  scenarioEn: 'An unresponsive patient arrives at the emergency unit. Put the primary assessment steps in order.',
  actions: [
    { id: 'airway', textEs: 'Evalúa y asegura la vía aérea.', textEn: 'Assess and manage the airway.' },
    { id: 'breathing', textEs: 'Evalúa la respiración y la ventilación.', textEn: 'Assess breathing and ventilation.' },
    { id: 'circulation', textEs: 'Evalúa la circulación y controla las hemorragias graves.', textEn: 'Assess circulation and control major bleeding.' },
    { id: 'disability', textEs: 'Evalúa el estado neurológico.', textEn: 'Assess neurological disability.' },
    { id: 'exposure', textEs: 'Expón al paciente según sea necesario y prevén la hipotermia.', textEn: 'Expose as needed and prevent hypothermia.' },
  ],
  explanationEs: 'La secuencia ABCDE revisa la vía aérea, la respiración, la circulación, el estado neurológico y la exposición del paciente.',
  explanationEn: 'The systematic sequence is Airway, Breathing, Circulation, Disability and Exposure: ABCDE.',
  structuresRelated: [],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'WHO–ICRC · Basic Emergency Care', url: 'https://www.who.int/publications/i/item/basic-emergency-care-approach-to-the-acutely-ill-and-injured' }] },
}, {
  id: 'seizure-first-aid-order', kind: 'ordering', titleEs: 'Orden clínico · Convulsión',
  summaryEs: 'Reconoce una secuencia segura de primeros auxilios.',
  instructionsEs: 'Reordena las acciones según la secuencia educativa indicada.',
  scenarioEs: 'Una persona está teniendo una convulsión generalizada. Ordena las actuaciones de primeros auxilios según la secuencia del ejercicio.',
  scenarioEn: 'A person is having a generalized seizure. Put these first-aid actions in the learning sequence.',
  actions: [
    { id: 'stay', textEs: 'Mantén la calma y quédate con la persona.', textEn: 'Stay calm and remain with the person.' },
    { id: 'clear', textEs: 'Aparta los objetos cercanos que puedan causar lesiones.', textEn: 'Remove nearby objects that could cause injury.' },
    { id: 'protect', textEs: 'Pon algo blando bajo la cabeza y afloja la ropa apretada alrededor del cuello.', textEn: 'Cushion the head and loosen tight clothing around the neck.' },
    { id: 'side', textEs: 'Coloca a la persona suavemente de lado.', textEn: 'Turn the person gently onto one side.' },
    { id: 'time', textEs: 'Mide cuánto dura la convulsión y pide ayuda de emergencia cuando esté indicado.', textEn: 'Time the seizure and seek emergency help when indicated.' },
  ],
  explanationEs: 'Protege a la persona, evita sujetarla y no le pongas nada en la boca. Algunas medidas de protección se pueden hacer al mismo tiempo.',
  explanationEn: 'Keep the person safe, do not restrain them and do not put anything in their mouth. Some protective actions may happen at the same time.',
  structuresRelated: [],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'CDC · First Aid for Seizures', url: 'https://www.cdc.gov/epilepsy/first-aid-for-seizures/' }] },
}, {
  id: 'anaphylaxis-choice', kind: 'multiple-choice', titleEs: 'Decisión clínica · Reacción alérgica',
  summaryEs: 'Selecciona la actuación de primera línea en un contexto profesional.',
  instructionsEs: 'Lee la situación y elige la mejor respuesta.',
  scenarioEs: 'Un paciente presenta ronchas generalizadas, silbidos al respirar y dificultad para respirar poco después de comer maní.',
  scenarioEn: 'A patient develops widespread hives, wheezing and difficulty breathing shortly after eating peanuts.',
  promptEs: 'Para un profesional sanitario capacitado, ¿qué medicamento es el tratamiento de primera línea ante una posible anafilaxia?',
  promptEn: 'For a trained healthcare provider, which medicine is the first-line treatment for suspected anaphylaxis?',
  options: [
    { id: 'adrenaline', textEs: 'Adrenalina intramuscular', textEn: 'Intramuscular adrenaline' },
    { id: 'antibiotic', textEs: 'Un antibiótico por vía oral', textEn: 'An oral antibiotic' },
    { id: 'paracetamol', textEs: 'Paracetamol', textEn: 'Paracetamol' },
  ],
  correctId: 'adrenaline',
  explanationEs: 'La adrenalina intramuscular es el tratamiento de primera línea para la anafilaxia. También se requiere ayuda de emergencia y una evaluación continua.',
  explanationEn: 'Intramuscular adrenaline is the first-line treatment for anaphylaxis. Emergency help and continued assessment are also required.',
  structuresRelated: [],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'Resuscitation Council UK · Emergency treatment of anaphylaxis', url: 'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis/emergency-treatment-anaphylactic-reactions' }] },
}, ...investigationCases, ...additionalInterviewCases, ...additionalOrderingCases, ...additionalMultipleChoiceCases, ...matchingCases];
