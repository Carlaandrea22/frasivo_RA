import type { Estructura, Fuente, Revision } from '../types';

const openStax = (titulo: string, pagina: string): Fuente => ({
  titulo: `OpenStax · ${titulo}`,
  url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${pagina}`,
});

const provisional = (primera: Fuente, ...otras: Fuente[]): Revision => ({
  estado: 'provisional',
  fuentes: [primera, ...otras],
});

const cabezaCuelloEspalda = openStax('Axial Muscles of the Head, Neck, and Back', '11-3-axial-muscles-of-the-head-neck-and-back');
const paredAbdominalTorax = openStax('Axial Muscles of the Abdominal Wall, and Thorax', '11-4-axial-muscles-of-the-abdominal-wall-and-thorax');
const cinturaEscapular = openStax('Muscles of the Pectoral Girdle and Upper Limbs', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs');
const cinturaPelvica = openStax('Appendicular Muscles of the Pelvic Girdle and Lower Limbs', '11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs');

export const estructurasMusculosNuevos = [
  {
    id: 'pectoralis_major', categoria: 'musculos', nombreEs: 'Pectoral mayor', terminoEn: 'Pectoralis major',
    definicion: 'Músculo superficial del pecho con forma de abanico. El modelo muestra las tres porciones del lado izquierdo.',
    ubicacion: 'Cubre la parte anterior del tórax. Sus fibras convergen hacia el extremo superior del húmero.',
    funcion: 'Acerca el brazo al tronco y lo gira hacia dentro en el hombro. También ayuda a llevar el brazo hacia delante y cruzarlo por el pecho.',
    modelo: { assetId: 'pectoralis_major', nodeId: 'pectoralis_major' },
    partes: [
      { id: 'porcion_clavicular', nombreEs: 'Porción clavicular', terminoEn: 'Clavicular part of pectoralis major', ubicacion: 'Porción superior, unida a la mitad medial de la clavícula.', funcion: 'Ayuda a elevar el brazo hacia delante al flexionar el hombro.' },
      { id: 'porcion_esternocostal', nombreEs: 'Porción esternocostal', terminoEn: 'Sternocostal part of pectoralis major', ubicacion: 'Porción amplia que nace del esternón y de los cartílagos costales vecinos.', funcion: 'Acerca el brazo al pecho y ayuda a bajarlo cuando parte de una posición elevada hacia delante.' },
      { id: 'porcion_abdominal', nombreEs: 'Porción abdominal', terminoEn: 'Abdominal part of pectoralis major', ubicacion: 'Porción inferior que se origina en la aponeurosis del oblicuo externo del abdomen.', funcion: 'Sus fibras inferiores contribuyen a llevar hacia el tronco el brazo que estaba elevado.' },
    ],
    relacionadas: ['clavicle', 'sternum', 'humerus', 'external_oblique'],
    revision: provisional(cinturaEscapular, { titulo: 'Haładaj et al. · Anatomical Variations of the Pectoralis Major Muscle', url: 'https://onlinelibrary.wiley.com/doi/10.1155/2019/6212039' }),
  },
  {
    id: 'trapezius', categoria: 'musculos', nombreEs: 'Trapecio', terminoEn: 'Trapezius',
    definicion: 'Músculo ancho y superficial del cuello y la espalda. El modelo muestra sus tres porciones izquierdas.',
    ubicacion: 'Se extiende desde el occipital y la línea media de la espalda hasta la clavícula y la escápula.',
    funcion: 'Estabiliza la escápula y contribuye a elevarla, retraerla, descenderla o girarla según las fibras que actúan.',
    modelo: { assetId: 'trapezius', nodeId: 'trapezius' },
    partes: [
      { id: 'porcion_descendente', nombreEs: 'Porción descendente', terminoEn: 'Descending part of trapezius', ubicacion: 'Desde la nuca hacia el tercio lateral de la clavícula.', funcion: 'Eleva la clavícula y ayuda a sostener el hombro, como al encogerlo.' },
      { id: 'porcion_transversa', nombreEs: 'Porción transversa', terminoEn: 'Transverse part of trapezius', ubicacion: 'Desde la línea media de la espalda alta hacia el acromion y la espina de la escápula.', funcion: 'Lleva la escápula hacia la columna y ayuda a mantenerla estable.' },
      { id: 'porcion_ascendente', nombreEs: 'Porción ascendente', terminoEn: 'Ascending part of trapezius', ubicacion: 'Sus fibras suben desde la columna torácica hasta el extremo medial de la espina escapular.', funcion: 'Ayuda a descender la escápula y participa en su rotación durante la elevación del brazo.' },
    ],
    relacionadas: ['scapula', 'clavicle', 'spine', 'deltoid'],
    revision: provisional(cinturaEscapular, { titulo: 'Johnson et al. · Anatomy and actions of the trapezius muscle', url: 'https://pubmed.ncbi.nlm.nih.gov/23916077/' }),
  },
  {
    id: 'rectus_abdominis', categoria: 'musculos', nombreEs: 'Recto del abdomen', terminoEn: 'Rectus abdominis',
    definicion: 'Par de músculos largos y verticales de la pared abdominal anterior. Las intersecciones tendinosas dividen cada recto a lo largo de su trayecto.',
    ubicacion: 'A ambos lados de la línea alba, entre el pubis y la parte inferior anterior de la caja torácica.',
    funcion: 'Flexiona el tronco al acercar el tórax a la pelvis y ayuda a comprimir el abdomen.',
    modelo: { assetId: 'rectus_abdominis', nodeId: 'rectus_abdominis' },
    partes: [
      { id: 'recto_izquierdo', nombreEs: 'Recto del abdomen izquierdo', terminoEn: 'Left rectus abdominis', ubicacion: 'Franja vertical situada inmediatamente a la izquierda de la línea alba.', funcion: 'Actúa con el recto derecho para flexionar el tronco y tensar la pared anterior del abdomen.' },
      { id: 'recto_derecho', nombreEs: 'Recto del abdomen derecho', terminoEn: 'Right rectus abdominis', ubicacion: 'Franja vertical situada inmediatamente a la derecha de la línea alba.', funcion: 'Actúa con el recto izquierdo para flexionar el tronco y tensar la pared anterior del abdomen.' },
    ],
    relacionadas: ['external_oblique', 'sternum', 'pelvis'],
    revision: provisional(paredAbdominalTorax),
  },
  {
    id: 'external_oblique', categoria: 'musculos', nombreEs: 'Oblicuo externo del abdomen', terminoEn: 'External abdominal oblique',
    definicion: 'Músculo plano que forma la capa superficial de la pared lateral del abdomen. El modelo muestra ambos lados con regiones de orientación superior e inferior.',
    ubicacion: 'Se extiende por los flancos desde las costillas inferiores hacia la cresta ilíaca y la línea media abdominal.',
    funcion: 'Comprime el abdomen. Cada lado ayuda a inclinar el tronco hacia su propio lado y a girarlo hacia el lado opuesto.',
    modelo: { assetId: 'external_oblique', nodeId: 'external_oblique' },
    partes: [
      { id: 'superior_izquierdo', nombreEs: 'Región superior izquierda', terminoEn: 'Upper region of the left external oblique', ubicacion: 'En la parte alta del flanco izquierdo, junto a las costillas inferiores.', funcion: 'Forma parte del oblicuo externo que ayuda a girar el tronco hacia la derecha.' },
      { id: 'inferior_izquierdo', nombreEs: 'Región inferior izquierda', terminoEn: 'Lower region of the left external oblique', ubicacion: 'En la parte baja del flanco izquierdo, hacia la cresta ilíaca.', funcion: 'Contribuye a tensar la pared abdominal izquierda al contraerse el músculo.' },
      { id: 'superior_derecho', nombreEs: 'Región superior derecha', terminoEn: 'Upper region of the right external oblique', ubicacion: 'En la parte alta del flanco derecho, junto a las costillas inferiores.', funcion: 'Forma parte del oblicuo externo que ayuda a girar el tronco hacia la izquierda.' },
      { id: 'inferior_derecho', nombreEs: 'Región inferior derecha', terminoEn: 'Lower region of the right external oblique', ubicacion: 'En la parte baja del flanco derecho, hacia la cresta ilíaca.', funcion: 'Contribuye a tensar la pared abdominal derecha al contraerse el músculo.' },
    ],
    relacionadas: ['rectus_abdominis', 'ribs', 'pelvis'],
    revision: provisional(paredAbdominalTorax, { titulo: 'Sugaya et al. · Relationship between spinal range of motion and trunk muscle activity during trunk rotation', url: 'https://www.jstage.jst.go.jp/article/jpts/28/2/28_jpts-2015-852/_article' }),
  },
  {
    id: 'latissimus_dorsi', categoria: 'musculos', nombreEs: 'Dorsal ancho', terminoEn: 'Latissimus dorsi',
    definicion: 'Músculo ancho y triangular que conecta la espalda con el brazo. Se muestran ambos lados con una región aproximada para cada extremo humeral.',
    ubicacion: 'Cubre buena parte de la espalda media y baja. Sus fibras se dirigen hacia la axila y se fijan en el húmero.',
    funcion: 'Lleva el brazo hacia atrás, lo acerca al tronco y lo gira hacia dentro. Participa al tirar del cuerpo hacia arriba con las manos fijas.',
    modelo: { assetId: 'latissimus_dorsi', nodeId: 'latissimus_dorsi' },
    partes: [
      { id: 'dorsal_izquierdo', nombreEs: 'Dorsal ancho izquierdo', terminoEn: 'Left latissimus dorsi', ubicacion: 'En la espalda media y baja izquierda, desde la región próxima a la columna hasta la axila izquierda.', funcion: 'Actúa sobre el hombro izquierdo para llevar el brazo hacia el tronco y hacia atrás.' },
      { id: 'dorsal_derecho', nombreEs: 'Dorsal ancho derecho', terminoEn: 'Right latissimus dorsi', ubicacion: 'En la espalda media y baja derecha, desde la región próxima a la columna hasta la axila derecha.', funcion: 'Actúa sobre el hombro derecho para llevar el brazo hacia el tronco y hacia atrás.' },
      { id: 'extremo_humeral_izquierdo', nombreEs: 'Extremo humeral izquierdo', terminoEn: 'Humeral end of the left latissimus dorsi', ubicacion: 'En el extremo estrecho del dorsal ancho izquierdo, junto a la cara anterior del húmero proximal.', funcion: 'Transmite al húmero izquierdo la tracción del músculo al acercar el brazo al tronco.' },
      { id: 'extremo_humeral_derecho', nombreEs: 'Extremo humeral derecho', terminoEn: 'Humeral end of the right latissimus dorsi', ubicacion: 'En el extremo estrecho del dorsal ancho derecho, junto a la cara anterior del húmero proximal.', funcion: 'Transmite al húmero derecho la tracción del músculo al acercar el brazo al tronco.' },
    ],
    relacionadas: ['trapezius', 'humerus', 'spine', 'pectoralis_major'],
    revision: provisional(cinturaEscapular, { titulo: 'Gerling y Brown · Architectural analysis and predicted functional capability of the human latissimus dorsi muscle', url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/joa.12074' }),
  },
  {
    id: 'gluteus_maximus', categoria: 'musculos', nombreEs: 'Glúteo mayor', terminoEn: 'Gluteus maximus',
    definicion: 'El más superficial y voluminoso de los músculos glúteos. Se muestran ambos lados con regiones de orientación superior e inferior.',
    ubicacion: 'Cubre la parte posterior de la pelvis y se extiende hacia el fémur y el tracto iliotibial.',
    funcion: 'Extiende la cadera al incorporarse o subir escaleras. También ayuda a girar el muslo hacia fuera.',
    modelo: { assetId: 'gluteus_maximus', nodeId: 'gluteus_maximus' },
    partes: [
      { id: 'superior_izquierdo', nombreEs: 'Región superior izquierda', terminoEn: 'Upper region of the left gluteus maximus', ubicacion: 'En la parte alta de la nalga izquierda, sobre la cara posterior del ilion.', funcion: 'Sus fibras contribuyen a extender la cadera izquierda al enderezar el tronco.' },
      { id: 'inferior_izquierdo', nombreEs: 'Región inferior izquierda', terminoEn: 'Lower region of the left gluteus maximus', ubicacion: 'En la parte baja de la nalga izquierda, por encima de la cara posterior del muslo.', funcion: 'Colabora con el resto del músculo para llevar el muslo izquierdo hacia atrás.' },
      { id: 'superior_derecho', nombreEs: 'Región superior derecha', terminoEn: 'Upper region of the right gluteus maximus', ubicacion: 'En la parte alta de la nalga derecha, sobre la cara posterior del ilion.', funcion: 'Sus fibras contribuyen a extender la cadera derecha al enderezar el tronco.' },
      { id: 'inferior_derecho', nombreEs: 'Región inferior derecha', terminoEn: 'Lower region of the right gluteus maximus', ubicacion: 'En la parte baja de la nalga derecha, por encima de la cara posterior del muslo.', funcion: 'Colabora con el resto del músculo para llevar el muslo derecho hacia atrás.' },
    ],
    relacionadas: ['pelvis', 'sacrum', 'femur', 'hamstrings'],
    revision: provisional(cinturaPelvica, { titulo: 'Anetai et al. · Structural re-evaluation of the human gluteus maximus', url: 'https://pubmed.ncbi.nlm.nih.gov/40593049/' }),
  },
  {
    id: 'hamstrings', categoria: 'musculos', nombreEs: 'Isquiotibiales', terminoEn: 'Hamstrings',
    definicion: 'Grupo muscular del muslo. En el lado izquierdo se señalan el semitendinoso, el semimembranoso y la cabeza larga del bíceps femoral. La cabeza corta se muestra como referencia.',
    ubicacion: 'En la cara posterior del muslo, desde la tuberosidad isquiática hasta las inserciones próximas a la rodilla.',
    funcion: 'Extienden la cadera y flexionan la rodilla. También ayudan a controlar el movimiento de la pierna al caminar y correr.',
    modelo: { assetId: 'hamstrings', nodeId: 'hamstrings' },
    partes: [
      { id: 'semitendinoso', nombreEs: 'Semitendinoso', terminoEn: 'Semitendinosus', ubicacion: 'En la parte posterior medial del muslo. Su tendón largo llega a la cara medial de la tibia proximal.', funcion: 'Extiende la cadera, flexiona la rodilla y ayuda a girar la pierna hacia dentro con la rodilla flexionada.' },
      { id: 'semimembranoso', nombreEs: 'Semimembranoso', terminoEn: 'Semimembranosus', ubicacion: 'En la parte posterior medial del muslo, profundo al semitendinoso, hacia el cóndilo medial de la tibia.', funcion: 'Flexiona la rodilla y ayuda a girar la pierna hacia dentro. También extiende la cadera.' },
      { id: 'biceps_femoral_cabeza_larga', nombreEs: 'Cabeza larga del bíceps femoral', terminoEn: 'Long head of biceps femoris', ubicacion: 'Corre por la parte posterior lateral del muslo desde el isquion hacia la cabeza del peroné.', funcion: 'Extiende la cadera, flexiona la rodilla y ayuda a girar la pierna hacia fuera con la rodilla flexionada.' },
    ],
    relacionadas: ['gluteus_maximus', 'quadriceps_femoris', 'tibia', 'fibula'],
    revision: provisional(cinturaPelvica),
  },
  {
    id: 'tibialis_anterior', categoria: 'musculos', nombreEs: 'Tibial anterior', terminoEn: 'Tibialis anterior',
    definicion: 'Músculo alargado del compartimento anterior de la pierna. En ambos lados se muestran el vientre muscular y el extremo distal.',
    ubicacion: 'Su vientre recorre la cara anterior de la pierna junto a la tibia. El tendón pasa por delante del tobillo hacia el borde medial del pie.',
    funcion: 'Eleva la punta del pie mediante la dorsiflexión y ayuda a girar la planta hacia dentro. Al caminar, controla el descenso del pie tras el apoyo del talón.',
    modelo: { assetId: 'tibialis_anterior', nodeId: 'tibialis_anterior' },
    partes: [
      { id: 'vientre_izquierdo', nombreEs: 'Vientre muscular izquierdo', terminoEn: 'Left tibialis anterior muscle belly', ubicacion: 'Zona más gruesa junto a la cara lateral de la tibia izquierda, por debajo de la rodilla.', funcion: 'Al contraerse, tira del tendón que eleva la punta del pie izquierdo.' },
      { id: 'extremo_distal_izquierdo', nombreEs: 'Extremo distal izquierdo', terminoEn: 'Distal end of the left tibialis anterior', ubicacion: 'Tramo estrecho hacia la cara anterior del tobillo izquierdo.', funcion: 'Transmite al pie izquierdo la fuerza que eleva la punta y gira la planta hacia dentro.' },
      { id: 'vientre_derecho', nombreEs: 'Vientre muscular derecho', terminoEn: 'Right tibialis anterior muscle belly', ubicacion: 'Zona más gruesa junto a la cara lateral de la tibia derecha, por debajo de la rodilla.', funcion: 'Al contraerse, tira del tendón que eleva la punta del pie derecho.' },
      { id: 'extremo_distal_derecho', nombreEs: 'Extremo distal derecho', terminoEn: 'Distal end of the right tibialis anterior', ubicacion: 'Tramo estrecho hacia la cara anterior del tobillo derecho.', funcion: 'Transmite al pie derecho la fuerza que eleva la punta y gira la planta hacia dentro.' },
    ],
    relacionadas: ['tibia', 'gastrocnemius', 'foot'],
    revision: provisional(cinturaPelvica),
  },
  {
    id: 'sternocleidomastoid', categoria: 'musculos', nombreEs: 'Esternocleidomastoideo', terminoEn: 'Sternocleidomastoid',
    definicion: 'Músculo superficial del cuello con dos cabezas en su extremo inferior. El modelo muestra el lado izquierdo.',
    ubicacion: 'Asciende desde el manubrio y la clavícula hasta la apófisis mastoides, detrás de la oreja.',
    funcion: 'De un lado, inclina la cabeza hacia ese lado y gira la cara hacia el contrario. Al actuar en pareja, ayuda a flexionar el cuello.',
    modelo: { assetId: 'sternocleidomastoid', nodeId: 'sternocleidomastoid' },
    partes: [
      { id: 'cabeza_esternal', nombreEs: 'Cabeza esternal', terminoEn: 'Sternal head of sternocleidomastoid', ubicacion: 'En la base medial del músculo, sobre la cara anterior del manubrio del esternón.', funcion: 'Con la cabeza clavicular, transmite fuerza desde el esternón para inclinar y girar la cabeza.' },
      { id: 'cabeza_clavicular', nombreEs: 'Cabeza clavicular', terminoEn: 'Clavicular head of sternocleidomastoid', ubicacion: 'En la base lateral del músculo, sobre el tercio medial de la clavícula.', funcion: 'Con la cabeza esternal, transmite fuerza desde la clavícula hacia la parte superior del músculo.' },
    ],
    relacionadas: ['clavicle', 'sternum', 'skull', 'cervical_vertebra'],
    revision: provisional(cabezaCuelloEspalda, { titulo: 'Saha et al. · Morphological study of the attachment of the sternocleidomastoid muscle', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4291912/' }),
  },
  {
    id: 'diaphragm', categoria: 'musculos', nombreEs: 'Diafragma', terminoEn: 'Diaphragm',
    definicion: 'Tabique formado por músculo y tendón que adopta la forma de dos cúpulas en reposo. El modelo señala de forma aproximada el centro tendinoso.',
    ubicacion: 'Entre el tórax y el abdomen. Se fija al esternón, a las costillas inferiores y a la columna lumbar.',
    funcion: 'Es el principal músculo de la inspiración. Al contraerse desciende y aumenta el volumen del tórax para que entre aire en los pulmones.',
    modelo: { assetId: 'diaphragm', nodeId: 'diaphragm' },
    partes: [
      { id: 'cupula_derecha', nombreEs: 'Cúpula derecha', terminoEn: 'Right dome of the diaphragm', ubicacion: 'En la mitad derecha, debajo de la base del pulmón derecho y por encima del hígado.', funcion: 'Desciende durante la inspiración y deja más espacio para que se expanda el pulmón derecho.' },
      { id: 'cupula_izquierda', nombreEs: 'Cúpula izquierda', terminoEn: 'Left dome of the diaphragm', ubicacion: 'En la mitad izquierda, entre la base del pulmón izquierdo y la parte superior del estómago.', funcion: 'Desciende durante la inspiración y deja más espacio para que se expanda el pulmón izquierdo.' },
      { id: 'centro_tendinoso', nombreEs: 'Centro tendinoso', terminoEn: 'Central tendon of the diaphragm', ubicacion: 'En la zona central del diafragma, debajo del corazón, donde convergen las fibras musculares.', funcion: 'Recibe la tracción de las fibras del diafragma y desciende con su contracción.' },
    ],
    relacionadas: ['lungs', 'heart', 'liver', 'ribs'],
    revision: provisional(paredAbdominalTorax, { titulo: 'Cunningham’s Manual of Practical Anatomy · The Diaphragm', url: 'https://accessmedicine.mhmedical.com/content.aspx?bookid=3475&sectionid=286446460' }),
  },
] satisfies readonly Omit<Estructura, 'miniatura'>[];
