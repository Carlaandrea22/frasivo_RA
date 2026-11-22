export interface BodyPoint { x: number; y: number; z?: number; visibility?: number }
export type Matrix = [number, number, number, number, number, number];
export type AnatomyLayer = 'muscles' | 'bones' | 'organs';
export interface AnatomyPart {
  id: string;
  layer: AnatomyLayer;
  en: string;
  es: string;
  location: string;
  description: string;
  provisional?: boolean;
}

type VocabularyRow = [id: string, es: string, en: string, location: string, description: string, provisional?: true];

const vocabulary: Record<AnatomyLayer, VocabularyRow[]> = {
  bones: [
    ['skull', 'Cráneo', 'Skull', 'En la cabeza, alrededor del encéfalo.', 'Protege el encéfalo y sostiene la cara.'],
    ['mandible', 'Mandíbula', 'Mandible', 'En la parte inferior de la cara.', 'Sostiene los dientes inferiores y se mueve al masticar.'],
    ['clavicle', 'Clavícula', 'Clavicle', 'Entre el esternón y la escápula.', 'Conecta el hombro con el tronco.'],
    ['scapula', 'Escápula', 'Scapula', 'En la parte alta de la espalda, sobre las costillas.', 'Une el húmero y la clavícula y sirve de apoyo al movimiento del hombro.'],
    ['sternum', 'Esternón', 'Sternum', 'En el centro de la parte anterior del tórax.', 'Sostiene las uniones anteriores de varias costillas.'],
    ['ribs', 'Costillas', 'Ribs', 'Alrededor de la cavidad torácica.', 'Protegen órganos del tórax y se mueven al respirar.'],
    ['spine', 'Columna vertebral', 'Spine', 'Desde la base del cráneo hasta la pelvis.', 'Sostiene el tronco y protege la médula espinal.'],
    ['pelvis', 'Pelvis', 'Pelvis', 'En la base del tronco, entre las caderas.', 'Transmite el peso hacia las piernas.'],
    ['sacrum', 'Sacro', 'Sacrum', 'En la base de la columna, entre los dos huesos de la cadera.', 'Conecta la columna con la pelvis y transmite el peso hacia las caderas.'],
    ['humerus', 'Húmero', 'Humerus', 'Entre el hombro y el codo.', 'Forma parte de ambas articulaciones y transmite fuerzas en el brazo.'],
    ['radius', 'Radio', 'Radius', 'En el antebrazo, del lado del pulgar.', 'Participa en la rotación del antebrazo y en el apoyo de la muñeca.'],
    ['ulna', 'Cúbito', 'Ulna', 'En el antebrazo, del lado del meñique.', 'Contribuye a la estabilidad del codo.'],
    ['femur', 'Fémur', 'Femur', 'Entre la cadera y la rodilla.', 'Sostiene el peso y lo transmite a la pierna.'],
    ['patella', 'Rótula', 'Patella', 'Delante de la articulación de la rodilla.', 'Protege su parte anterior y mejora la palanca del cuádriceps.'],
    ['tibia', 'Tibia', 'Tibia', 'Entre la rodilla y el tobillo.', 'Es el principal hueso de carga de la pierna.'],
    ['fibula', 'Peroné', 'Fibula', 'En el lado externo de la pierna.', 'Da estabilidad al tobillo y permite inserciones musculares.'],
    ['carpals', 'Huesos del carpo', 'Carpals', 'En la muñeca.', 'Unen la mano al antebrazo y contribuyen a su movilidad.'],
    ['metacarpals', 'Metacarpianos', 'Metacarpals', 'Entre la muñeca y la base de los dedos.', 'Forman el armazón de la palma.'],
    ['hand_phalanges', 'Falanges de la mano', 'Hand phalanges', 'En los dedos de la mano.', 'Permiten la prensión y los movimientos finos.'],
    ['tarsals', 'Huesos del tarso', 'Tarsals', 'En el talón y la parte media del pie.', 'Transmiten cargas entre el tobillo y el resto del pie.'],
    ['metatarsals', 'Metatarsianos', 'Metatarsals', 'Entre el tarso y los dedos del pie.', 'Sostienen el antepié durante el apoyo y la marcha.'],
    ['foot_phalanges', 'Falanges del pie', 'Foot phalanges', 'En los dedos del pie.', 'Ayudan al equilibrio y al impulso al caminar.'],
  ],
  muscles: [
    ['pectoralis_major', 'Pectoral mayor', 'Pectoralis major', 'En la parte superficial y anterior del tórax.', 'Acerca el brazo al centro del cuerpo y lo gira hacia dentro.'],
    ['deltoid', 'Deltoides', 'Deltoid', 'Alrededor de la parte superior del hombro.', 'Eleva el brazo hacia el lado y ayuda a moverlo hacia delante y hacia atrás.'],
    ['biceps_brachii', 'Bíceps braquial', 'Biceps brachii', 'En la parte anterior del brazo.', 'Flexiona el codo y gira el antebrazo para orientar la palma hacia arriba.'],
    ['triceps_brachii', 'Tríceps braquial', 'Triceps brachii', 'En la parte posterior del brazo.', 'Extiende el codo.'],
    ['rectus_abdominis', 'Recto abdominal', 'Rectus abdominis', 'A ambos lados de la línea media anterior del abdomen.', 'Flexiona el tronco y ayuda a contener el abdomen.'],
    ['external_oblique', 'Oblicuo externo', 'External oblique', 'En los costados superficiales del abdomen.', 'Ayuda a girar y flexionar el tronco.'],
    ['quadriceps_femoris', 'Cuádriceps femoral', 'Quadriceps femoris', 'En la parte anterior del muslo.', 'Sus cuatro músculos extienden la rodilla.'],
    ['sartorius', 'Sartorio', 'Sartorius', 'Cruza en diagonal la cara anterior del muslo.', 'Colabora al flexionar la cadera y la rodilla.'],
    ['gastrocnemius', 'Gastrocnemio', 'Gastrocnemius', 'En la parte superficial de la pantorrilla.', 'Eleva el talón y ayuda a flexionar la rodilla.'],
    ['tibialis_anterior', 'Tibial anterior', 'Tibialis anterior', 'En la parte anterior y lateral de la tibia.', 'Eleva la punta del pie hacia la pierna.'],
    ['thenar_eminence', 'Eminencia tenar', 'Thenar eminence', 'En el relieve de la palma bajo el pulgar.', 'Sus músculos mueven el pulgar y ayudan a oponerlo a los dedos.', true],
    ['hypothenar_eminence', 'Eminencia hipotenar', 'Hypothenar eminence', 'En el relieve de la palma bajo el meñique.', 'Sus músculos mueven el meñique y ahuecan la palma.', true],
    ['dorsal_interossei', 'Interóseos dorsales', 'Dorsal interossei', 'Entre los huesos metacarpianos.', 'Separan los dedos y colaboran al flexionar sus bases.', true],
    ['flexor_tendons', 'Tendones flexores', 'Flexor tendons', 'En la cara palmar de la muñeca, la mano y los dedos.', 'Transmiten la fuerza de los músculos que flexionan los dedos.', true],
    ['extensor_tendons', 'Tendones extensores', 'Extensor tendons', 'En el dorso de la mano y los dedos.', 'Transmiten la fuerza de los músculos que extienden los dedos.', true],
    ['frontalis', 'Frontal', 'Frontalis', 'En la frente.', 'Eleva las cejas y arruga la frente.', true],
    ['orbicularis_oculi', 'Orbicular de los ojos', 'Orbicularis oculi', 'Alrededor de cada órbita.', 'Cierra los párpados.', true],
    ['orbicularis_oris', 'Orbicular de la boca', 'Orbicularis oris', 'Alrededor de los labios.', 'Cierra y proyecta los labios.', true],
    ['zygomaticus_major', 'Cigomático mayor', 'Zygomaticus major', 'Del pómulo a la comisura de los labios.', 'Eleva la comisura al sonreír.', true],
    ['masseter', 'Masetero', 'Masseter', 'A ambos lados de la mandíbula, bajo el pómulo.', 'Eleva la mandíbula al masticar.', true],
    ['temporalis', 'Temporal', 'Temporalis', 'En la sien, por encima del arco cigomático.', 'Eleva la mandíbula y ayuda a llevarla hacia atrás.', true],
    ['buccinator', 'Buccinador', 'Buccinator', 'En la pared muscular de la mejilla.', 'Mantiene la mejilla contra los dientes al masticar.', true],
    ['sternocleidomastoid', 'Esternocleidomastoideo', 'Sternocleidomastoid', 'A ambos lados del cuello, del esternón y la clavícula a la base del cráneo.', 'Inclina la cabeza y la gira hacia el lado contrario.', true],
    ['serratus_anterior', 'Serrato anterior', 'Serratus anterior', 'Entre las costillas laterales y la escápula.', 'Mantiene la escápula contra el tórax y ayuda a elevar el brazo.', true],
    ['trapezius', 'Trapecio', 'Trapezius', 'En la nuca y la parte superior y media de la espalda.', 'Eleva, aproxima y gira la escápula.', true],
    ['brachioradialis', 'Braquiorradial', 'Brachioradialis', 'En el borde lateral del antebrazo.', 'Flexiona el codo, especialmente con la mano en posición de dar un apretón.', true],
    ['forearm_flexors', 'Flexores del antebrazo', 'Forearm flexors', 'En la parte anterior del antebrazo.', 'Flexionan la muñeca o los dedos, según el músculo.', true],
    ['forearm_extensors', 'Extensores del antebrazo', 'Forearm extensors', 'En la parte posterior del antebrazo.', 'Extienden la muñeca o los dedos, según el músculo.', true],
    ['adductors', 'Aductores', 'Hip adductors', 'En la parte interna del muslo.', 'Acercan el muslo a la línea media del cuerpo.', true],
    ['latissimus_dorsi', 'Dorsal ancho', 'Latissimus dorsi', 'En la parte media e inferior de la espalda.', 'Lleva el brazo hacia atrás y hacia el cuerpo.', true],
    ['gluteus_maximus', 'Glúteo mayor', 'Gluteus maximus', 'En la parte superficial y posterior de la cadera.', 'Extiende la cadera al levantarse o subir escalones.', true],
    ['hamstrings', 'Isquiotibiales', 'Hamstrings', 'En la parte posterior del muslo.', 'Flexionan la rodilla y ayudan a extender la cadera.', true],
  ],
  organs: [
    ['brain', 'Cerebro', 'Brain', 'En la cavidad craneal.', 'Procesa información y coordina funciones como el movimiento, la memoria y el lenguaje.'],
    ['lungs', 'Pulmones', 'Lungs', 'Dentro del tórax, a ambos lados del corazón.', 'Intercambian oxígeno y dióxido de carbono con la sangre.'],
    ['heart', 'Corazón', 'Heart', 'Entre los pulmones, por detrás del esternón y algo hacia la izquierda.', 'Impulsa la sangre hacia los pulmones y el resto del cuerpo.'],
    ['liver', 'Hígado', 'Liver', 'Bajo el diafragma, principalmente del lado derecho.', 'Procesa nutrientes y produce bilis.'],
    ['stomach', 'Estómago', 'Stomach', 'En la zona superior izquierda del abdomen.', 'Mezcla los alimentos con los jugos digestivos.'],
    ['small_intestine', 'Intestino delgado', 'Small intestine', 'En gran parte del centro y la parte inferior del abdomen.', 'Absorbe la mayor parte de los nutrientes.'],
    ['large_intestine', 'Intestino grueso', 'Large intestine', 'Rodea parte del intestino delgado dentro del abdomen.', 'Absorbe agua y contribuye a formar las heces.'],
    ['kidneys', 'Riñones', 'Kidneys', 'En la pared posterior del abdomen, a ambos lados de la columna.', 'Filtran la sangre y producen orina.'],
    ['trachea', 'Tráquea', 'Trachea', 'Entre la laringe y la división en los dos bronquios principales.', 'Conduce el aire hacia los pulmones y desde ellos.', true],
    ['thyroid_gland', 'Tiroides', 'Thyroid gland', 'En la parte anterior del cuello, a los lados de la tráquea.', 'Produce hormonas que ayudan a regular el metabolismo.', true],
    ['urinary_bladder', 'Vejiga', 'Urinary bladder', 'Dentro de la pelvis, por detrás del pubis.', 'Almacena la orina hasta la micción.', true],
  ],
};

export const anatomyLayerNames: Record<AnatomyLayer, string> = { bones: 'Huesos', muscles: 'Músculos', organs: 'Órganos' };
export const anatomyParts: AnatomyPart[] = (Object.keys(vocabulary) as AnatomyLayer[]).flatMap(layer =>
  vocabulary[layer].map(([id, es, en, location, description, provisional]) => ({ id, layer, es, en, location, description, provisional })));

function visible(p: BodyPoint | undefined): p is BodyPoint {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= -.1 && p.x <= 1.1 && p.y >= -.1 && p.y <= 1.1 && (p.visibility ?? 0) >= .6;
}
// SVG local units: trunk is 100 × 100, limbs run from (0,0) to (0,100).
// Camera and SVG share the exact video aspect ratio, with no cropping/mirroring.
export function torsoTransform(points: BodyPoint[]): Matrix | null {
  const left = points[12], right = points[11], hl = points[24], hr = points[23];
  if (![left, right, hl, hr].every(visible)) return null;
  const dx = right.x - left.x, dy = right.y - left.y;
  const vx = (hl.x + hr.x - left.x - right.x) / 2, vy = (hl.y + hr.y - left.y - right.y) / 2;
  if (Math.abs(dx * vy - dy * vx) < .003) return null;
  return [dx * 10, dy * 10, vx * 10, vy * 10, left.x * 1000, left.y * 1000];
}
export function segmentTransform(points: BodyPoint[], from: number, to: number): Matrix | null {
  const a = points[from], b = points[to];
  if (!visible(a) || !visible(b)) return null;
  const dx = (b.x - a.x) * 10, dy = (b.y - a.y) * 10;
  if (Math.hypot(dx, dy) < .15) return null;
  return [dy, -dx, dx, dy, a.x * 1000, a.y * 1000];
}
export const demoPose: BodyPoint[] = Array.from({ length: 33 }, () => ({ x: .5, y: .1, visibility: 0 }));
for (const [i, x, y] of [[0,.5,.12],[7,.55,.115],[8,.45,.115],[11,.62,.24],[12,.38,.24],[13,.7,.4],[14,.3,.4],[15,.75,.56],[16,.25,.56],[23,.58,.53],[24,.42,.53],[25,.6,.73],[26,.4,.73],[27,.62,.94],[28,.38,.94]]) demoPose[i] = { x, y, visibility: 1 };
