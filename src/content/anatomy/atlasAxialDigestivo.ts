import type { Estructura, ParteAnatomica, Revision } from '../types';

export const partesAxialesDigestivas = {
  skull: [
    { id: 'frontal', nombreEs: 'Frontal', terminoEn: 'Frontal bone', ubicacion: 'En la frente y por encima de las órbitas.', funcion: 'Forma la parte anterior de la bóveda craneal y el techo de las órbitas.' },
    { id: 'parietales', nombreEs: 'Parietales', terminoEn: 'Parietal bones', ubicacion: 'A ambos lados de la parte superior del cráneo.', funcion: 'Forman gran parte del techo y de los lados de la cavidad craneal.' },
    { id: 'temporales', nombreEs: 'Temporales', terminoEn: 'Temporal bones', ubicacion: 'A los lados de la base del cráneo, alrededor de los oídos.', funcion: 'Alojan estructuras del oído y se articulan con la mandíbula.' },
    { id: 'occipital', nombreEs: 'Occipital', terminoEn: 'Occipital bone', ubicacion: 'Detrás y debajo del cráneo. Gira el modelo para verlo.', funcion: 'Rodea el foramen magno, por donde el tronco encefálico se continúa con la médula espinal.' },
    { id: 'cigomaticos', nombreEs: 'Cigomáticos', terminoEn: 'Zygomatic bones', ubicacion: 'En los pómulos y en el borde lateral de las órbitas.', funcion: 'Dan forma a los pómulos y contribuyen a la pared lateral de cada órbita.' },
    { id: 'maxilares', nombreEs: 'Maxilares', terminoEn: 'Maxillae', ubicacion: 'En el centro de la cara, por encima de los dientes superiores.', funcion: 'Sostienen los dientes superiores y forman la parte anterior del paladar duro.' },
    { id: 'mandibula', nombreEs: 'Mandíbula', terminoEn: 'Mandible', ubicacion: 'En la parte inferior de la cara. Se une a los temporales a ambos lados, delante de los oídos.', funcion: 'Sostiene los dientes inferiores y se mueve al masticar y hablar.' },
  ],
  spine: [
    { id: 'atlas', nombreEs: 'Atlas (C1)', terminoEn: 'Atlas vertebra', ubicacion: 'Primera vértebra cervical, justo debajo del cráneo y encima del axis.', funcion: 'Sostiene el cráneo y permite inclinar la cabeza hacia delante y hacia atrás.' },
    { id: 'axis', nombreEs: 'Axis (C2)', terminoEn: 'Axis vertebra', ubicacion: 'Segunda vértebra cervical, entre el atlas y C3.', funcion: 'Su apófisis odontoides sirve de pivote para girar la cabeza junto con el atlas.' },
    { id: 'cervical', nombreEs: 'Región cervical', terminoEn: 'Cervical spine', ubicacion: 'En el cuello. Este resaltado abarca C3 a C7. El atlas y el axis se seleccionan por separado.', funcion: 'Sostiene la cabeza y permite movimientos del cuello.' },
    { id: 'toracica', nombreEs: 'Región torácica', terminoEn: 'Thoracic spine', ubicacion: 'En la parte media de la espalda, a la altura de las costillas.', funcion: 'Sus vértebras se articulan con las costillas y sostienen la caja torácica.' },
    { id: 'lumbar', nombreEs: 'Región lumbar', terminoEn: 'Lumbar spine', ubicacion: 'En la espalda baja, por encima del sacro.', funcion: 'Soporta cargas del tronco y permite movimientos como inclinarse hacia delante.' },
    { id: 'sacro', nombreEs: 'Sacro', terminoEn: 'Sacrum', ubicacion: 'Entre los dos huesos coxales, debajo de la región lumbar.', funcion: 'Transmite el peso de la columna hacia la pelvis.' },
    { id: 'coccix', nombreEs: 'Cóccix', terminoEn: 'Coccyx', ubicacion: 'Extremo inferior de la columna, debajo del sacro.', funcion: 'Sirve de inserción a músculos y ligamentos del suelo pélvico.' },
  ],
  brain: [
    { id: 'hemisferio_derecho', nombreEs: 'Hemisferio derecho', terminoEn: 'Right cerebral hemisphere', ubicacion: 'Mitad derecha de la parte superior del encéfalo.', funcion: 'Participa en la percepción, el pensamiento y el control de movimientos, principalmente del lado izquierdo del cuerpo.' },
    { id: 'hemisferio_izquierdo', nombreEs: 'Hemisferio izquierdo', terminoEn: 'Left cerebral hemisphere', ubicacion: 'Mitad izquierda de la parte superior del encéfalo.', funcion: 'Participa en la percepción, el pensamiento y el control de movimientos, principalmente del lado derecho del cuerpo.' },
    { id: 'cerebelo', nombreEs: 'Cerebelo', terminoEn: 'Cerebellum', ubicacion: 'Debajo de los hemisferios y detrás del tronco encefálico.', funcion: 'Coordina los movimientos y contribuye al equilibrio y la postura.' },
    { id: 'tronco', nombreEs: 'Tronco encefálico', terminoEn: 'Brainstem', ubicacion: 'En la base del encéfalo, en continuidad con la médula espinal.', funcion: 'Conduce señales entre el encéfalo y la médula y participa en funciones automáticas como la respiración.' },
  ],
  liver: [
    { id: 'derecha', nombreEs: 'Porción hepática derecha', terminoEn: 'Right hemiliver', ubicacion: 'En el lado derecho anatómico. La vista frontal lo muestra a la izquierda de la pantalla.', funcion: 'Su tejido procesa nutrientes y produce bilis. Recibe ramas derechas de la irrigación hepática.' },
    { id: 'izquierda', nombreEs: 'Porción hepática izquierda', terminoEn: 'Left hemiliver', ubicacion: 'Se extiende hacia el lado izquierdo, cerca del estómago.', funcion: 'Su tejido comparte las funciones del hígado y recibe ramas izquierdas de la irrigación hepática.' },
    { id: 'caudado', nombreEs: 'Lóbulo caudado', terminoEn: 'Caudate lobe', ubicacion: 'En la cara posterior del hígado, cerca de la vena cava inferior. Gira el modelo para verlo.', funcion: 'Su tejido participa en el metabolismo y en la producción de bilis.' },
  ],
  small_intestine: [
    { id: 'duodeno', nombreEs: 'Duodeno', terminoEn: 'Duodenum', ubicacion: 'Primer tramo del intestino delgado, después del estómago.', funcion: 'Recibe el contenido del estómago junto con bilis y secreciones pancreáticas que ayudan a digerirlo.' },
    { id: 'yeyuno', nombreEs: 'Yeyuno', terminoEn: 'Jejunum', ubicacion: 'Tramo intermedio, entre el duodeno y el íleon.', funcion: 'Absorbe buena parte de los nutrientes resultantes de la digestión.' },
    { id: 'ileon', nombreEs: 'Íleon', terminoEn: 'Ileum', ubicacion: 'Último tramo, conectado con el ciego por la unión ileocecal.', funcion: 'Continúa la absorción y recupera sales biliares antes de pasar el contenido al intestino grueso.' },
  ],
  large_intestine: [
    { id: 'ciego', nombreEs: 'Ciego', terminoEn: 'Cecum', ubicacion: 'Bolsa inicial del intestino grueso, en la parte inferior derecha del abdomen.', funcion: 'Recibe el contenido del íleon junto a la unión ileocecal.' },
    { id: 'ascendente', nombreEs: 'Colon ascendente', terminoEn: 'Ascending colon', ubicacion: 'Sube por el lado derecho del abdomen desde el ciego.', funcion: 'Desplaza el contenido hacia el colon transverso mientras continúa la absorción de agua.' },
    { id: 'transverso', nombreEs: 'Colon transverso', terminoEn: 'Transverse colon', ubicacion: 'Cruza el abdomen de derecha a izquierda.', funcion: 'Transporta el contenido hacia el colon descendente y sigue absorbiendo agua y sales.' },
    { id: 'descendente', nombreEs: 'Colon descendente', terminoEn: 'Descending colon', ubicacion: 'Baja por el lado izquierdo del abdomen.', funcion: 'Conduce el contenido hacia el colon sigmoide.' },
    { id: 'sigmoide', nombreEs: 'Colon sigmoide', terminoEn: 'Sigmoid colon', ubicacion: 'Tramo curvo en la parte inferior izquierda del abdomen y la pelvis.', funcion: 'Conduce las heces desde el colon descendente hasta el recto.' },
    { id: 'recto', nombreEs: 'Recto', terminoEn: 'Rectum', ubicacion: 'Tramo de la pelvis que sigue al colon sigmoide.', funcion: 'Almacena temporalmente las heces antes de la evacuación.' },
  ],
} satisfies Record<string, readonly ParteAnatomica[]>;

function fuente(titulo: string, pagina: string): Revision {
  return { estado: 'provisional', fuentes: [{ titulo: `OpenStax · ${titulo}`, url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${pagina}` }] };
}

const revisionIntestinos = fuente('The Small and Large Intestines', '23-5-the-small-and-large-intestines');

export const estructurasAxialesDigestivas = [
  {
    id: 'skull', categoria: 'huesos', nombreEs: 'Cráneo', terminoEn: 'Skull',
    definicion: 'Conjunto de huesos de la cabeza. El modelo permite seleccionar la mandíbula y otros seis grupos óseos.',
    ubicacion: 'En la cabeza, por encima de la columna cervical.',
    funcion: 'Protege el encéfalo y da soporte a las órbitas y a los huesos de la cara.',
    modelo: { assetId: 'body-bones-regions', nodeId: 'skull' },
    partes: partesAxialesDigestivas.skull, relacionadas: ['spine', 'brain'],
    revision: fuente('The Skull', '7-2-the-skull'),
  },
  {
    id: 'spine', categoria: 'huesos', nombreEs: 'Columna vertebral', terminoEn: 'Vertebral column',
    definicion: 'Eje óseo segmentado del tronco. El modelo abarca desde el atlas hasta el cóccix.',
    ubicacion: 'En la línea media de la espalda, entre el cráneo y la pelvis.',
    funcion: 'Sostiene el tronco, permite mover la espalda y protege la médula espinal.',
    modelo: { assetId: 'body-bones-regions', nodeId: 'spine' },
    partes: partesAxialesDigestivas.spine, relacionadas: ['skull', 'pelvis'],
    revision: fuente('The Vertebral Column', '7-3-the-vertebral-column'),
  },
  {
    id: 'brain', categoria: 'organos', nombreEs: 'Cerebro', terminoEn: 'Brain',
    definicion: 'El modelo muestra el encéfalo, con ambos hemisferios cerebrales, el cerebelo y el tronco encefálico.',
    ubicacion: 'Dentro del cráneo, en continuidad con la médula espinal.',
    funcion: 'Integra la información sensorial, dirige movimientos y participa en funciones como la memoria y la respiración.',
    modelo: { assetId: 'organ-regions', nodeId: 'brain' },
    partes: partesAxialesDigestivas.brain, relacionadas: ['skull', 'spine'],
    revision: fuente('The Central Nervous System', '13-2-the-central-nervous-system'),
  },
  {
    id: 'liver', categoria: 'organos', nombreEs: 'Hígado', terminoEn: 'Liver',
    definicion: 'Órgano glandular del abdomen. El modelo permite distinguir dos porciones funcionales y el lóbulo caudado.',
    ubicacion: 'En la parte superior del abdomen, sobre todo a la derecha, debajo del diafragma.',
    funcion: 'Procesa los nutrientes que llegan por la sangre y produce bilis para ayudar a digerir las grasas.',
    modelo: { assetId: 'organ-regions', nodeId: 'liver' },
    partes: partesAxialesDigestivas.liver, relacionadas: ['stomach', 'small_intestine'],
    revision: fuente('Accessory Organs in Digestion', '23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder'),
  },
  {
    id: 'small_intestine', categoria: 'organos', nombreEs: 'Intestino delgado', terminoEn: 'Small intestine',
    definicion: 'Tramo largo y plegado del tubo digestivo, dividido en duodeno, yeyuno e íleon.',
    ubicacion: 'En el abdomen, entre el estómago y el intestino grueso.',
    funcion: 'Completa gran parte de la digestión y absorbe la mayoría de los nutrientes de los alimentos.',
    modelo: { assetId: 'organ-regions', nodeId: 'small_intestine' },
    partes: partesAxialesDigestivas.small_intestine, relacionadas: ['stomach', 'liver', 'large_intestine'],
    revision: revisionIntestinos,
  },
  {
    id: 'large_intestine', categoria: 'organos', nombreEs: 'Intestino grueso', terminoEn: 'Large intestine',
    definicion: 'Tramo final del tubo digestivo. El modelo muestra el ciego, cuatro tramos del colon y el recto.',
    ubicacion: 'Rodea gran parte del intestino delgado y desciende a la pelvis.',
    funcion: 'Absorbe parte del agua y las sales restantes, y forma y almacena las heces.',
    modelo: { assetId: 'organ-regions', nodeId: 'large_intestine' },
    partes: partesAxialesDigestivas.large_intestine, relacionadas: ['small_intestine', 'pelvis'],
    revision: revisionIntestinos,
  },
] satisfies readonly Omit<Estructura, 'miniatura'>[];
