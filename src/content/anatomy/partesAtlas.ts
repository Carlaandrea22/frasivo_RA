import type { ParteAnatomica } from '../types';

export const partesAtlas = {
  pelvis: [
    { id: 'ilion', nombreEs: 'Ilion', terminoEn: 'Ilium', ubicacion: 'Porción superior y ancha del hueso coxal.', funcion: 'Transmite cargas desde el sacro y ofrece inserción a músculos de la cadera.' },
    { id: 'isquion', nombreEs: 'Isquion', terminoEn: 'Ischium', ubicacion: 'Porción inferior y posterior del hueso coxal.', funcion: 'La tuberosidad isquiática soporta parte del peso al sentarse.' },
    { id: 'pubis', nombreEs: 'Pubis', terminoEn: 'Pubis', ubicacion: 'Porción anterior e inferior del hueso coxal.', funcion: 'Se une al pubis del lado opuesto en la sínfisis púbica.' },
    { id: 'acetabulo', nombreEs: 'Acetábulo', terminoEn: 'Acetabulum', ubicacion: 'Cavidad lateral donde confluyen el ilion, el isquion y el pubis.', funcion: 'Recibe la cabeza del fémur y forma con ella la articulación de la cadera.' },
  ],
  patella: [
    { id: 'base_superior', nombreEs: 'Base de la rótula', terminoEn: 'Base of the patella', ubicacion: 'Borde superior ancho de la rótula.', funcion: 'Recibe fibras del tendón del cuádriceps.' },
    { id: 'vertice', nombreEs: 'Vértice de la rótula', terminoEn: 'Apex of the patella', ubicacion: 'Extremo inferior de la rótula.', funcion: 'Se continúa hacia la tibia por medio del ligamento patelar.' },
    { id: 'cara_articular', nombreEs: 'Cara articular', terminoEn: 'Articular surface of the patella', ubicacion: 'Superficie posterior. Gira el modelo para verla.', funcion: 'Se desliza sobre la tróclea femoral al flexionar y extender la rodilla.' },
  ],
  biceps_brachii: [
    { id: 'cabeza_larga', nombreEs: 'Cabeza larga', terminoEn: 'Long head of the biceps', ubicacion: 'Porción lateral del bíceps, con origen superior a la cavidad glenoidea.', funcion: 'Contribuye a flexionar el codo y supinar el antebrazo.' },
    { id: 'cabeza_corta', nombreEs: 'Cabeza corta', terminoEn: 'Short head of the biceps', ubicacion: 'Porción medial del bíceps, con origen en la apófisis coracoides.', funcion: 'Colabora con la cabeza larga en la flexión del codo y la supinación.' },
  ],
  quadriceps_femoris: [
    { id: 'recto_femoral', nombreEs: 'Recto femoral', terminoEn: 'Rectus femoris', ubicacion: 'Porción superficial central. Cruza la cadera y la rodilla.', funcion: 'Extiende la rodilla y ayuda a flexionar la cadera.' },
    { id: 'vasto_lateral', nombreEs: 'Vasto lateral', terminoEn: 'Vastus lateralis', ubicacion: 'Cara lateral del muslo.', funcion: 'Contribuye a extender la rodilla.' },
    { id: 'vasto_medial', nombreEs: 'Vasto medial', terminoEn: 'Vastus medialis', ubicacion: 'Cara medial del muslo, cerca de la rótula en su extremo inferior.', funcion: 'Extiende la rodilla y contribuye al control de la rótula.' },
    { id: 'vasto_intermedio', nombreEs: 'Vasto intermedio', terminoEn: 'Vastus intermedius', ubicacion: 'Porción profunda, debajo del recto femoral y delante del fémur.', funcion: 'Contribuye a extender la rodilla.' },
  ],
  lungs: [
    { id: 'superior_derecho', nombreEs: 'Lóbulo superior derecho', terminoEn: 'Right upper lobe', ubicacion: 'Parte alta del pulmón derecho, por encima de la fisura horizontal.', funcion: 'Participa en el intercambio de oxígeno y dióxido de carbono.' },
    { id: 'medio_derecho', nombreEs: 'Lóbulo medio derecho', terminoEn: 'Right middle lobe', ubicacion: 'Parte anterior derecha, entre las fisuras horizontal y oblicua.', funcion: 'Participa en el intercambio de gases. Su límite en este modelo es orientativo.' },
    { id: 'inferior_derecho', nombreEs: 'Lóbulo inferior derecho', terminoEn: 'Right lower lobe', ubicacion: 'Parte inferior y posterior derecha, debajo de la fisura oblicua.', funcion: 'Participa en el intercambio de gases y descansa sobre el diafragma.' },
    { id: 'superior_izquierdo', nombreEs: 'Lóbulo superior izquierdo', terminoEn: 'Left upper lobe', ubicacion: 'Parte alta del pulmón izquierdo. Incluye la língula.', funcion: 'Participa en el intercambio de oxígeno y dióxido de carbono.' },
    { id: 'inferior_izquierdo', nombreEs: 'Lóbulo inferior izquierdo', terminoEn: 'Left lower lobe', ubicacion: 'Parte inferior y posterior izquierda, por debajo de la fisura oblicua.', funcion: 'Participa en el intercambio de gases y descansa sobre el diafragma.' },
  ],
  ulna: [
    { id: 'olecranon', nombreEs: 'Olécranon', terminoEn: 'Olecranon', ubicacion: 'Prominencia posterior del extremo cercano al codo.', funcion: 'Recibe el tendón del tríceps y encaja en la fosa olecraniana del húmero al extender el codo.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del cúbito', terminoEn: 'Ulnar shaft', ubicacion: 'Porción larga, entre el codo y la muñeca.', funcion: 'Da inserción a músculos y a la membrana interósea que une el cúbito y el radio.' },
    { id: 'cabeza', nombreEs: 'Cabeza del cúbito', terminoEn: 'Head of the ulna', ubicacion: 'Extremo redondeado cerca de la muñeca.', funcion: 'Se articula con el radio y participa en la rotación del antebrazo.' },
  ],
  fibula: [
    { id: 'cabeza', nombreEs: 'Cabeza del peroné', terminoEn: 'Head of the fibula', ubicacion: 'Extremo superior, en el lado externo de la rodilla.', funcion: 'Se articula con la tibia y recibe el tendón del bíceps femoral.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del peroné', terminoEn: 'Fibular shaft', ubicacion: 'Porción larga en el lado externo de la pierna.', funcion: 'Da inserción a músculos que mueven el pie y a la membrana interósea de la pierna.' },
    { id: 'maleolo', nombreEs: 'Maléolo lateral', terminoEn: 'Lateral malleolus', ubicacion: 'Prominencia ósea en el lado externo del tobillo.', funcion: 'Se articula con el astrágalo y contribuye a la estabilidad del tobillo.' },
  ],
  sternum: [
    { id: 'manubrio', nombreEs: 'Manubrio', terminoEn: 'Manubrium', ubicacion: 'Porción superior y ancha del esternón.', funcion: 'Se articula con las clavículas y recibe los primeros cartílagos costales.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo del esternón', terminoEn: 'Body of the sternum', ubicacion: 'Porción larga entre el manubrio y la apófisis xifoides.', funcion: 'Sirve de unión a varios cartílagos costales en la parte anterior del tórax.' },
    { id: 'xifoides', nombreEs: 'Apófisis xifoides', terminoEn: 'Xiphoid process', ubicacion: 'Pequeño extremo inferior del esternón.', funcion: 'Da inserción a fibras del diafragma y a tejidos de la pared abdominal.' },
  ],
  deltoid: [
    { id: 'clavicular', nombreEs: 'Porción clavicular', terminoEn: 'Clavicular part of the deltoid', ubicacion: 'Por delante del hombro, nace en la clavícula.', funcion: 'Ayuda a llevar el brazo hacia delante y a girarlo hacia dentro.' },
    { id: 'acromial', nombreEs: 'Porción acromial', terminoEn: 'Acromial part of the deltoid', ubicacion: 'En el lado del hombro, nace en el acromion.', funcion: 'Eleva el brazo hacia el lado, alejándolo del tronco.' },
    { id: 'espinal', nombreEs: 'Porción espinal', terminoEn: 'Spinal part of the deltoid', ubicacion: 'Por detrás del hombro, nace en la espina de la escápula.', funcion: 'Ayuda a llevar el brazo hacia atrás y a girarlo hacia fuera.' },
  ],
  triceps_brachii: [
    { id: 'cabeza_larga', nombreEs: 'Cabeza larga', terminoEn: 'Long head of the triceps', ubicacion: 'Porción posterior que nace en la escápula y cruza el hombro.', funcion: 'Extiende el codo y ayuda a llevar el brazo hacia atrás.' },
    { id: 'cabeza_lateral', nombreEs: 'Cabeza lateral', terminoEn: 'Lateral head of the triceps', ubicacion: 'Porción superficial externa, nace en la cara posterior del húmero.', funcion: 'Contribuye a extender el codo.' },
    { id: 'cabeza_medial', nombreEs: 'Cabeza medial', terminoEn: 'Medial head of the triceps', ubicacion: 'Porción profunda, visible cerca del codo.', funcion: 'Contribuye a extender el codo.' },
  ],
  gastrocnemius: [
    { id: 'cabeza_medial', nombreEs: 'Cabeza medial', terminoEn: 'Medial head of the gastrocnemius', ubicacion: 'En el lado interno de la pantorrilla, nace detrás del cóndilo medial del fémur.', funcion: 'Ayuda a levantar el talón y a flexionar la rodilla.' },
    { id: 'cabeza_lateral', nombreEs: 'Cabeza lateral', terminoEn: 'Lateral head of the gastrocnemius', ubicacion: 'En el lado externo de la pantorrilla, nace detrás del cóndilo lateral del fémur.', funcion: 'Ayuda a levantar el talón y a flexionar la rodilla.' },
  ],
  stomach: [
    { id: 'cardias', nombreEs: 'Cardias', terminoEn: 'Cardia', ubicacion: 'Región de entrada, donde el esófago se une al estómago.', funcion: 'Recibe el alimento que llega desde el esófago.' },
    { id: 'fondo', nombreEs: 'Fondo gástrico', terminoEn: 'Gastric fundus', ubicacion: 'Cúpula del estómago, arriba y a la izquierda del cardias.', funcion: 'Se distiende para alojar parte del alimento ingerido.' },
    { id: 'cuerpo', nombreEs: 'Cuerpo gástrico', terminoEn: 'Body of the stomach', ubicacion: 'Porción central y más amplia, debajo del fondo.', funcion: 'Mezcla el alimento con el jugo gástrico.' },
    { id: 'pilorica', nombreEs: 'Región pilórica', terminoEn: 'Pyloric region', ubicacion: 'Porción final y estrecha que conduce al duodeno.', funcion: 'Ayuda a triturar el contenido y regula su salida hacia el intestino delgado.' },
  ],
  kidneys: [
    { id: 'derecho', nombreEs: 'Riñón derecho', terminoEn: 'Right kidney', ubicacion: 'A la derecha de la columna, suele quedar un poco más bajo por la presencia del hígado.', funcion: 'Filtra la sangre y produce orina, que pasa al uréter derecho.' },
    { id: 'izquierdo', nombreEs: 'Riñón izquierdo', terminoEn: 'Left kidney', ubicacion: 'A la izquierda de la columna, en la parte posterior del abdomen.', funcion: 'Filtra la sangre y produce orina, que pasa al uréter izquierdo.' },
  ],
} satisfies Record<string, readonly ParteAnatomica[]>;
