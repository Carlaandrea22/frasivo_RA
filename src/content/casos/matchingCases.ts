import type { ChoiceOption, MatchingCase, MatchingPatient } from './sessionTypes';

const cause = (id: string, textEs: string, textEn: string): ChoiceOption => ({ id, textEs, textEn });

const patient = (id: string, name: string, [textEs, textEn]: readonly [string, string], correctId: string,
  [explanationEs, explanationEn]: readonly [string, string]): MatchingPatient =>
  ({ id, name, textEs, textEn, correctId, explanationEs, explanationEn });

const base = {
  kind: 'matching',
  summaryEs: 'Usa el contexto de cada paciente para elegir el desencadenante más probable.',
  instructionsEs: 'Conecta cada caso con la causa que mejor encaja con las pistas.',
  structuresRelated: [],
} as const;

export const matchingCases: readonly MatchingCase[] = [{
  ...base, id: 'matching-daily', titleEs: 'Empareja · Tres pistas cotidianas',
  patients: [
    patient('alex', 'Alex', ['Me dieron náuseas al leer durante un viaje con muchas curvas. Al bajarme me sentí mejor.', 'I felt nauseated while reading on a winding trip. I felt better after getting out.'], 'motion',
      ['Las náuseas aparecieron durante el movimiento y cedieron al terminar el trayecto.', 'The nausea started during motion and eased once the ride ended.']),
    patient('mariana', 'Mariana', ['Me duelen ambos muslos al bajar escaleras. Empezó al día siguiente de mi primera clase de sentadillas.', 'Both thighs hurt when I go downstairs. It started the day after my first squat class.'], 'exercise',
      ['El dolor en los músculos trabajados apareció al día siguiente de un ejercicio nuevo.', 'The muscles used in an unfamiliar exercise became sore the following day.']),
    patient('juan', 'Juan', ['Me costó dormirme las noches que tomé bebidas energéticas con cafeína al acostarme. En las otras noches dormí como siempre.', 'I struggled to fall asleep on nights when I had caffeinated energy drinks at bedtime. On the other nights I slept as usual.'], 'caffeine',
      ['La dificultad para dormir coincide con el consumo de cafeína cerca de la hora de acostarse.', 'Trouble falling asleep coincides with caffeine consumption close to bedtime.']),
  ],
  causes: [cause('caffeine', 'Cafeína cerca de la hora de dormir', 'Caffeine close to bedtime'),
    cause('exercise', 'Dolor muscular tardío por ejercicio nuevo', 'Delayed soreness after unfamiliar exercise'),
    cause('motion', 'Mareo por movimiento', 'Motion sickness')],
  revision: { estado: 'provisional', fuentes: [
    { titulo: 'CDC · Motion Sickness', url: 'https://www.cdc.gov/yellow-book/hcp/travel-air-sea/motion-sickness.html' },
    { titulo: 'ACSM · Delayed-onset muscle soreness', url: 'https://www.acsm.org/docs/default-source/publications-files/intro-to-exsci-3_sample-chapter-3.pdf' },
    { titulo: 'Journal of Clinical Sleep Medicine · Caffeine and sleep', url: 'https://pubmed.ncbi.nlm.nih.gov/24235903/' },
  ] },
}, {
  ...base, id: 'matching-exposures', titleEs: 'Empareja · Después de la exposición',
  patients: [
    patient('lia', 'Lía', ['Tras editar en la computadora por horas, siento arenilla y sequedad en los ojos. Mejora al apartarme de la pantalla.', 'After hours of editing on my computer, my eyes feel gritty and dry. They feel better away from the screen.'], 'screen',
      ['La sequedad aparece con el uso prolongado de la pantalla y mejora durante los descansos.', 'Dryness appears after prolonged screen use and improves during breaks.']),
    patient('nico', 'Nico', ['Horas después de estar al sol, tengo los hombros rojos y sensibles justo donde no los cubría la camiseta.', 'Hours after being in the sun, my shoulders are red and tender right where my shirt did not cover them.'], 'sun',
      ['El enrojecimiento y la sensibilidad siguen el límite de la piel expuesta al sol.', 'Redness and tenderness follow the outline of the sun-exposed skin.']),
    patient('eva', 'Eva', ['En primavera me da picor en la nariz, estornudo y me lloran los ojos cada vez que cortan el césped cerca.', 'In spring, my nose itches, I sneeze, and my eyes water whenever grass is cut nearby.'], 'pollen',
      ['Los estornudos y el picor nasal coinciden con una exposición repetida al césped en primavera.', 'Sneezing and nasal itching coincide with repeated exposure to grass in spring.']),
  ],
  causes: [cause('pollen', 'Reacción al polen', 'Reaction to pollen'),
    cause('screen', 'Sequedad asociada al uso prolongado de pantalla', 'Dryness associated with prolonged screen use'),
    cause('sun', 'Quemadura solar', 'Sunburn')],
  revision: { estado: 'provisional', fuentes: [
    { titulo: 'American Academy of Ophthalmology · Computer Usage', url: 'https://www.aao.org/eye-health/treatments/computer-usage' },
    { titulo: 'MedlinePlus · Sunburn', url: 'https://medlineplus.gov/ency/article/003227.htm' },
    { titulo: 'NHS · Hay fever', url: 'https://www.nhs.uk/conditions/hay-fever/' },
  ] },
}, {
  ...base, id: 'matching-outdoors', titleEs: 'Empareja · Pistas de un viaje',
  patients: [
    patient('ana', 'Ana', ['Al aterrizar el avión se me tapó un oído y sentí presión. Se destapó después de tragar saliva.', 'As the plane landed, one ear felt blocked and under pressure. It cleared after I swallowed.'], 'pressure',
      ['La molestia empezó con el cambio de altitud y cedió al equilibrarse la presión al tragar.', 'The discomfort began with the altitude change and eased when swallowing equalized the pressure.']),
    patient('bruno', 'Bruno', ['Después de caminar con botas nuevas tengo una ampolla de líquido claro justo donde me rozaba el talón.', 'After walking in new boots, I have a clear fluid-filled blister right where the boot rubbed my heel.'], 'friction',
      ['La ampolla apareció exactamente en la zona de roce repetido del calzado.', 'The blister appeared exactly where the shoe rubbed repeatedly.']),
    patient('sara', 'Sara', ['Después de sudar mucho y beber poca agua en una caminata, tengo sed, la boca seca y orino menos que de costumbre.', 'After sweating heavily and drinking little water on a hike, I am thirsty, my mouth is dry, and I urinate less than usual.'], 'dehydration',
      ['La pérdida de líquidos con poca reposición coincide con sed y menor cantidad de orina.', 'Fluid loss with little replacement coincides with thirst and less urination.']),
  ],
  causes: [cause('dehydration', 'Pérdida de líquidos con poca reposición', 'Fluid loss with little replacement'),
    cause('pressure', 'Cambio de presión durante el vuelo', 'Pressure change during the flight'),
    cause('friction', 'Roce repetido del calzado', 'Repeated rubbing from footwear')],
  revision: { estado: 'provisional', fuentes: [
    { titulo: 'MedlinePlus · Ear barotrauma', url: 'https://medlineplus.gov/ency/article/001064.htm' },
    { titulo: 'NHS · Blisters', url: 'https://www.nhs.uk/conditions/blisters/' },
    { titulo: 'NHS · Dehydration', url: 'https://www.nhs.uk/conditions/dehydration/' },
  ] },
}];
