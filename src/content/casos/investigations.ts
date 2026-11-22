import type { ClinicalTriple, InvestigationCase, InvestigationNode } from './sessionTypes';

type Bilingual = readonly [es: string, en: string];

function question(
  id: string,
  [promptEs, promptEn]: Bilingual,
  [patientEs, patientEn]: Bilingual,
  nextIds?: ClinicalTriple<string>,
  findingId?: string,
): InvestigationNode {
  return { id, promptEs, promptEn, patientEs, patientEn, nextIds, findingId };
}

const instructionsEs = 'Haz tres preguntas y decide qué hipótesis investigarías primero con lo que averiguaste.';

export const investigationCases: readonly InvestigationCase[] = [{
  id: 'abdominal-investigation',
  kind: 'investigation',
  titleEs: 'Investigación · Dolor abdominal',
  summaryEs: 'Sigue las respuestas de Alex para decidir qué explorar primero.',
  instructionsEs,
  patientName: 'Alex',
  openingEs: 'Desde esta mañana me duele el estómago.',
  openingEn: 'My stomach has been hurting since this morning.',
  roots: ['meals', 'history', 'pain'],
  nodes: [
    question('meals', ['¿Crees que algo que comiste te cayó mal?', 'Do you think something you ate made you feel sick?'], ['No estoy seguro. Ayer comí fuera con una amiga.', 'I’m not sure. I ate out with a friend yesterday.'], ['shared-meal', 'new-food', 'symptoms']),
    question('history', ['¿Tienes alguna enfermedad conocida?', 'Do you have any known medical conditions?'], ['No que yo sepa. Tampoco tomo medicamentos todos los días.', 'None that I know of. I don’t take any daily medication either.'], ['medicine', 'previous', 'symptoms']),
    question('pain', ['¿Cómo se siente el dolor?', 'What does the pain feel like?'], ['Son retortijones que vienen y van.', 'It feels like cramps that come and go.'], ['symptoms', 'timing', 'location']),
    question('shared-meal', ['¿Tu amiga comió lo mismo que tú?', 'Did your friend eat the same thing as you?'], ['Sí, compartimos un plato. Esta mañana me dijo que también tenía diarrea.', 'Yes, we shared a dish. She told me this morning that she had diarrhea too.'], ['bowel', 'fever', 'fluids'], 'shared'),
    question('new-food', ['¿Qué fue distinto en esa comida?', 'What was different about that meal?'], ['Pedimos un plato que no había probado antes.', 'We ordered a dish I hadn’t tried before.'], ['companion', 'bowel', 'fluids']),
    question('symptoms', ['¿Qué otros síntomas has tenido?', 'What other symptoms have you had?'], ['Desde esta mañana he tenido diarrea y náuseas.', 'I’ve had diarrhea and nausea since this morning.'], ['companion', 'fever', 'fluids'], 'digestive'),
    question('medicine', ['¿Has tomado algún medicamento nuevo estos días?', 'Have you taken any new medicine recently?'], ['No, no he comenzado a tomar nada nuevo.', 'No, I haven’t started taking anything new.'], ['bowel', 'fever', 'appetite']),
    question('previous', ['¿Te había pasado algo parecido antes?', 'Has anything like this happened to you before?'], ['No, no recuerdo haber sentido estos retortijones antes.', 'No, I don’t remember having cramps like these before.'], ['bowel', 'fever', 'appetite']),
    question('timing', ['¿Qué estabas haciendo cuando empezó?', 'What were you doing when it started?'], ['Estaba preparándome para desayunar.', 'I was getting ready for breakfast.'], ['companion', 'bowel', 'appetite']),
    question('location', ['¿El dolor se queda en un punto?', 'Does the pain stay in one spot?'], ['No, lo siento repartido por el abdomen.', 'No, I feel it across my abdomen.'], ['bowel', 'fluids', 'appetite']),
    question('companion', ['¿Alguien que comió contigo se enfermó?', 'Did anyone who ate with you get sick?'], ['La amiga con la que compartí el plato también tiene diarrea.', 'The friend who shared my dish also has diarrhea.'], undefined, 'shared'),
    question('bowel', ['¿Has notado cambios al ir al baño?', 'Have you noticed any changes when going to the bathroom?'], ['Sí, esta mañana tuve diarrea y náuseas.', 'Yes, I had diarrhea and nausea this morning.'], undefined, 'digestive'),
    question('fever', ['¿Te has tomado la temperatura?', 'Have you checked your temperature?'], ['Todavía no, no tengo termómetro en casa.', 'Not yet. I don’t have a thermometer at home.']),
    question('fluids', ['¿Has podido beber agua?', 'Have you been able to drink water?'], ['Sí, he podido beber agua a sorbos.', 'Yes, I’ve been able to sip water.']),
    question('appetite', ['¿Cómo está tu apetito?', 'How is your appetite?'], ['Hoy no tengo muchas ganas de comer.', 'I don’t feel much like eating today.']),
  ],
  findings: [
    { id: 'shared', textEs: 'Otra persona que compartió el plato también tuvo diarrea.', textEn: 'Someone who shared the dish also had diarrhea.' },
    { id: 'digestive', textEs: 'Alex tuvo diarrea y náuseas junto con el dolor.', textEn: 'Alex had diarrhea and nausea along with the pain.' },
  ],
  hypotheses: [
    { id: 'medication', textEs: 'Un efecto de un medicamento reciente', textEn: 'A side effect from a new medication' },
    { id: 'foodborne', textEs: 'Una posible enfermedad transmitida por alimentos', textEn: 'A possible foodborne illness' },
    { id: 'muscle', textEs: 'Una molestia muscular tras un esfuerzo', textEn: 'Muscle soreness after physical exertion' },
  ],
  preferredHypothesisId: 'foodborne',
  debriefEs: 'Los síntomas digestivos y el antecedente de una comida compartida orientan la investigación. Haría falta más información para identificar la causa o atribuirla a un alimento concreto.',
  debriefEn: 'The digestive symptoms and the shared meal help guide the investigation. More information would be needed to identify the cause or link it to a specific food.',
  structuresRelated: ['stomach'],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'CDC · Food Poisoning Symptoms', url: 'https://www.cdc.gov/food-safety/signs-symptoms/index.html' }] },
}, {
  id: 'headache-investigation',
  kind: 'investigation',
  titleEs: 'Investigación · Dolor de cabeza',
  summaryEs: 'Reconstruye qué pasó antes de que empezara el dolor.',
  instructionsEs,
  patientName: 'Alex',
  openingEs: 'Me duele la cabeza desde ayer.',
  openingEn: 'I’ve had a headache since yesterday.',
  roots: ['exposure', 'sleep', 'onset'],
  nodes: [
    question('exposure', ['¿Estuviste cerca de pintura o productos de limpieza?', 'Were you around paint or cleaning products?'], ['No, ayer estuve casi todo el día fuera de casa.', 'No, I was out of the house most of yesterday.'], ['activity', 'medication', 'pain']),
    question('sleep', ['¿Dormiste bien anoche?', 'Did you sleep well last night?'], ['Dormí poco. Ya me dolía la cabeza cuando me acosté.', 'I didn’t sleep much. My head already hurt when I went to bed.'], ['before-bed', 'usual-sleep', 'pain']),
    question('onset', ['¿Qué estabas haciendo antes de que empezara?', 'What were you doing before it started?'], ['Estaba jugando fútbol con unos amigos.', 'I was playing soccer with some friends.'], ['impact', 'activity', 'pain']),
    question('impact', ['¿Te diste algún golpe en la cabeza?', 'Did you hit your head?'], ['Sí, choqué con otro jugador y me golpeé la cabeza al caer.', 'Yes, I collided with another player and hit my head when I fell.'], ['timing', 'concentration', 'location'], 'head-impact'),
    question('activity', ['¿Pasó algo fuera de lo común ayer?', 'Did anything unusual happen yesterday?'], ['Choqué con otro jugador y me golpeé la cabeza con el suelo.', 'I collided with another player and hit my head on the ground.'], ['timing', 'concentration', 'nausea'], 'head-impact'),
    question('before-bed', ['¿Cuánto tiempo antes de acostarte empezó el dolor?', 'How long before you went to bed did the pain start?'], ['Varias horas antes, poco después de caerme jugando fútbol.', 'Several hours before, shortly after I fell while playing soccer.'], ['fall-detail', 'concentration', 'location'], 'after-impact'),
    question('usual-sleep', ['¿Sueles tener dolores de cabeza cuando duermes poco?', 'Do you usually get headaches when you don’t sleep enough?'], ['No, normalmente no me pasa.', 'No, that doesn’t usually happen to me.'], ['fall-detail', 'timing', 'location']),
    question('medication', ['¿Empezaste a tomar algún medicamento nuevo?', 'Have you started taking any new medicine?'], ['No, no he tomado nada nuevo.', 'No, I haven’t taken anything new.'], ['fall-detail', 'concentration', 'nausea']),
    question('pain', ['¿Cómo describirías el dolor?', 'How would you describe the pain?'], ['Siento una presión que no se ha ido desde ayer.', 'It feels like pressure that hasn’t gone away since yesterday.'], ['timing', 'location', 'nausea']),
    question('fall-detail', ['¿Te golpeaste la cabeza ayer?', 'Did you hit your head yesterday?'], ['Sí, al caerme durante el partido.', 'Yes, when I fell during the game.'], undefined, 'head-impact'),
    question('timing', ['¿Qué pasó justo antes del primer dolor?', 'What happened just before you first felt the pain?'], ['Me caí jugando fútbol. La cabeza empezó a dolerme poco después.', 'I fell while playing soccer. My head started hurting shortly afterward.'], undefined, 'after-impact'),
    question('concentration', ['¿Has notado cambios al concentrarte?', 'Have you noticed any changes in your concentration?'], ['Hoy me costó seguir lo que estaba leyendo.', 'I had trouble following what I was reading today.']),
    question('location', ['¿En qué parte de la cabeza lo sientes?', 'Where on your head do you feel it?'], ['Lo siento sobre todo en un lado.', 'I mostly feel it on one side.']),
    question('nausea', ['¿Has sentido náuseas?', 'Have you felt nauseous?'], ['No, he podido comer con normalidad.', 'No, I’ve been able to eat normally.']),
  ],
  findings: [
    { id: 'head-impact', textEs: 'Alex se golpeó la cabeza durante el partido.', textEn: 'Alex hit his head during the game.' },
    { id: 'after-impact', textEs: 'El dolor apareció poco después de la caída.', textEn: 'The headache began shortly after the fall.' },
  ],
  hypotheses: [
    { id: 'lack-of-sleep', textEs: 'Un dolor por falta de sueño', textEn: 'A headache due to lack of sleep' },
    { id: 'chemical', textEs: 'Una reacción a una exposición química', textEn: 'A reaction to chemical exposure' },
    { id: 'head-injury', textEs: 'Una posible lesión relacionada con el golpe', textEn: 'A possible injury related to the impact' },
  ],
  preferredHypothesisId: 'head-injury',
  debriefEs: 'El golpe y el momento en que empezó el dolor orientan la evaluación hacia una posible lesión. Haría falta una valoración clínica para determinar qué ocurrió.',
  debriefEn: 'The impact and the timing of the headache point toward assessing a possible injury. A clinical evaluation would be needed to determine what happened.',
  structuresRelated: ['brain'],
  revision: { estado: 'provisional', fuentes: [{ titulo: 'CDC · Symptoms of Mild TBI and Concussion', url: 'https://www.cdc.gov/traumatic-brain-injury/signs-symptoms/index.html' }] },
}];
