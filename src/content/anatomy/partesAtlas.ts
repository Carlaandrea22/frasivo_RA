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
} satisfies Record<string, readonly ParteAnatomica[]>;
