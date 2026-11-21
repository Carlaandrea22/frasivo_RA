import { softwareTerms, type SoftwareTermId } from '../objects/catalog';
import type { CareerId } from '../profile/profile';

export interface CareerTerm {
  id: string; en: string; es: string; phonetic: string; meaning: string;
  example: string; translation: string; definition: string; emoji: string;
  sceneId?: SoftwareTermId; metaphor?: string;
}
const softwareDefinitions = [
  'An indexed structure that stores elements in an ordered sequence.',
  'A last-in, first-out structure: the most recently added item is removed first.',
  'A first-in, first-out structure for tasks waiting to be processed.',
  'A sequence of instructions that can be scheduled within a process.',
  'A place for project code and, with version control, its change history.',
  'The process of making an application version available in a target environment.',
  'A structure and set of tools that guide how an application is built.',
  'Software that processes a request between other components or stages.',
  'A mechanism that allows a derived class to reuse or specialize a base class.',
  'A component, library, or service that another component needs to function.',
];
const systems: CareerTerm[] = softwareTerms.map((term, i) => ({ ...term, sceneId: term.id, definition: softwareDefinitions[i], emoji: ['🧩', '📚', '🚶', '🧵', '🗂️', '🚀', '🏗️', '🔗', '🌳', '⚙️'][i] }));
type Entry = [id: string, en: string, es: string, phonetic: string, emoji: string, meaning: string, example: string, translation: string, definition: string];
const entries = (rows: Entry[]): CareerTerm[] => rows.map(([id, en, es, phonetic, emoji, meaning, example, translation, definition]) => ({ id, en, es, phonetic, emoji, meaning, example, translation, definition }));
const medicine = entries([
  ['heart', 'Heart', 'Corazón', '/hɑːrt/', '🫀', 'Órgano muscular que bombea sangre por el cuerpo.', 'The heart pumps blood through the body.', 'El corazón bombea sangre por el cuerpo.', 'The muscular organ that pumps blood through the circulatory system.'],
  ['brain', 'Brain', 'Cerebro', '/breɪn/', '🧠', 'Órgano del sistema nervioso que procesa información y coordina funciones del cuerpo.', 'The brain processes sensory information.', 'El cerebro procesa información sensorial.', 'The organ of the central nervous system that processes information and coordinates body functions.'],
  ['lungs', 'Lungs', 'Pulmones', '/lʌŋz/', '🫁', 'Órganos respiratorios donde ocurre el intercambio de oxígeno y dióxido de carbono con la sangre.', 'The lungs exchange gases with the blood.', 'Los pulmones intercambian gases con la sangre.', 'The paired respiratory organs in the chest where gases are exchanged with the blood.'],
  ['liver', 'Liver', 'Hígado', '/ˈlɪvər/', '🩺', 'Órgano que procesa nutrientes y produce bilis, entre otras funciones.', 'The liver produces bile.', 'El hígado produce bilis.', 'The large abdominal organ that processes nutrients and produces bile.'],
  ['kidney', 'Kidney', 'Riñón', '/ˈkɪdni/', '🩺', 'Órgano que filtra la sangre y contribuye a regular agua y sales mediante la formación de orina.', 'Each kidney filters the blood.', 'Cada riñón filtra la sangre.', 'One of the paired organs that filter blood and produce urine.'],
  ['stomach', 'Stomach', 'Estómago', '/ˈstʌmək/', '🩺', 'Órgano digestivo que mezcla los alimentos con sus secreciones para ayudar a descomponerlos.', 'The stomach mixes food with digestive juices.', 'El estómago mezcla los alimentos con jugos digestivos.', 'The muscular digestive organ that mixes food with gastric juices.'],
  ['skull', 'Skull', 'Cráneo', '/skʌl/', '💀', 'Conjunto de huesos de la cabeza que protege el encéfalo y forma la estructura de la cara.', 'The skull protects the brain.', 'El cráneo protege el cerebro.', 'The bony structure of the head that protects the central nervous tissue and supports the face.'],
  ['nephron', 'Nephron', 'Nefrona', '/ˈnefrɑːn/', '🔬', 'Unidad funcional microscópica del riñón que filtra sangre y participa en la formación de orina.', 'The nephron includes a glomerulus and a tubule.', 'La nefrona incluye un glomérulo y un túbulo.', 'The microscopic functional unit of the kidney, consisting of a filtering structure and a tubule.'],
  ['alveoli', 'Alveoli', 'Alvéolos pulmonares', '/ælˈviːəlaɪ/', '🔬', 'Pequeños sacos de aire pulmonares donde se intercambian gases con los capilares. Alveoli es plural de alveolus.', 'The alveoli exchange oxygen and carbon dioxide.', 'Los alvéolos intercambian oxígeno y dióxido de carbono.', 'The tiny air sacs in the respiratory organs where oxygen and carbon dioxide are exchanged with capillaries.'],
  ['cochlea', 'Cochlea', 'Cóclea', '/ˈkɑːkliə/', '👂', 'Estructura en espiral del oído interno que participa en transformar vibraciones en señales nerviosas para la audición.', 'The cochlea contains sensory hair cells.', 'La cóclea contiene células ciliadas sensoriales.', 'The spiral-shaped structure in the inner ear that contains sensory hair cells involved in hearing.'],
]);
const gastronomy = entries([
  ['knife', 'Knife', 'Cuchillo', '/naɪf/', '🔪', 'Utensilio con hoja y mango utilizado para cortar ingredientes.', 'Use a knife to slice the vegetables.', 'Usa un cuchillo para cortar las verduras en rodajas.', 'A kitchen utensil with a blade and handle used for cutting ingredients.'],
  ['whisk', 'Whisk', 'Batidor de varillas', '/wɪsk/', '🥣', 'Utensilio de varillas que permite mezclar ingredientes e incorporar aire.', 'Beat the eggs with a whisk.', 'Bate los huevos con un batidor de varillas.', 'A wire utensil used to beat ingredients and incorporate air into a mixture.'],
  ['cutting-board', 'Cutting board', 'Tabla de cortar', '/ˈkʌtɪŋ bɔːrd/', '🔪', 'Superficie de trabajo sobre la que se cortan o preparan ingredientes.', 'Place the onion on the cutting board.', 'Coloca la cebolla sobre la tabla de cortar.', 'A flat work surface used to support ingredients while they are being cut.'],
  ['saucepan', 'Saucepan', 'Cacerola', '/ˈsɔːspæn/', '🍲', 'Recipiente de cocina de paredes altas, normalmente con mango, usado para cocinar líquidos y salsas.', 'Heat the sauce in a saucepan.', 'Calienta la salsa en una cacerola.', 'A deep cooking vessel, usually with a handle, used for heating liquids and sauces.'],
  ['rolling-pin', 'Rolling pin', 'Rodillo de cocina', '/ˈroʊlɪŋ pɪn/', '🥐', 'Utensilio cilíndrico que se utiliza para extender masas.', 'Flatten the dough with a rolling pin.', 'Extiende la masa con un rodillo de cocina.', 'A cylindrical kitchen tool used to flatten and shape dough.'],
  ['spatula', 'Spatula', 'Espátula', '/ˈspætʃələ/', '🍳', 'Utensilio de hoja o pala plana para mezclar, extender o mover alimentos, según su diseño.', 'Fold the mixture gently with a spatula.', 'Integra la mezcla suavemente con una espátula.', 'A flat kitchen utensil used to fold mixtures, spread ingredients, or move food.'],
  ['colander', 'Colander', 'Escurridor', '/ˈkɑːləndər/', '🥬', 'Recipiente perforado que permite escurrir el líquido de los alimentos.', 'Drain the pasta in a colander.', 'Escurre la pasta en un escurridor.', 'A perforated bowl used to drain liquid from cooked or washed food.'],
  ['mandoline', 'Mandoline', 'Mandolina de cocina', '/ˌmændəˈliːn/', '🥒', 'Utensilio con cuchilla fija para producir cortes de grosor uniforme.', 'The mandoline makes uniform slices.', 'La mandolina produce rodajas uniformes.', 'A slicing tool with a fixed blade that produces pieces of a consistent thickness.'],
  ['immersion-blender', 'Immersion blender', 'Batidora de inmersión', '/ɪˈmɜːrʒən ˈblendər/', '🥣', 'Aparato con cuchillas en el extremo que mezcla o tritura directamente dentro de un recipiente.', 'Blend the soup with an immersion blender.', 'Tritura la sopa con una batidora de inmersión.', 'A handheld motorized appliance that blends ingredients directly inside their container.'],
  ['bain-marie', 'Bain-marie', 'Baño maría', '/ˌbæn məˈriː/', '🍮', 'Método o equipo donde un recipiente se calienta de manera indirecta mediante agua caliente.', 'Cook the custard in a bain-marie.', 'Cocina la crema al baño maría.', 'An indirect heating arrangement in which a food container is placed in a hot-water bath.'],
]);
export const careerTerms = (career: CareerId): readonly CareerTerm[] => ({ medicine, gastronomy, systems })[career];
