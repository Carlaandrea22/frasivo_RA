import type { Estructura, Revision } from '../types';
import { partesAtlas } from './partesAtlas';

function fuente(titulo: string, pagina: string): Revision {
  return {
    estado: 'provisional',
    fuentes: [{ titulo: `OpenStax · ${titulo}`, url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${pagina}` }],
  };
}

const musculosBrazo = fuente('Muscles of the Pectoral Girdle and Upper Limbs', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs');

export const ampliacionAtlas = [
  {
    id: 'ulna', categoria: 'huesos', nombreEs: 'Cúbito', terminoEn: 'Ulna',
    definicion: 'Hueso largo del antebrazo, también llamado ulna.',
    ubicacion: 'En el lado del meñique, entre el codo y la muñeca, cuando la palma mira hacia delante.',
    funcion: 'Forma la bisagra del codo con el húmero y se articula con el radio durante la rotación del antebrazo.',
    modelo: { assetId: 'body-bones-regions', nodeId: 'ulna_left' },
    partes: partesAtlas.ulna, relacionadas: ['radius', 'humerus', 'triceps_brachii'],
    revision: fuente('Bones of the Upper Limb', '8-2-bones-of-the-upper-limb'),
  },
  {
    id: 'fibula', categoria: 'huesos', nombreEs: 'Peroné', terminoEn: 'Fibula',
    definicion: 'Hueso largo y delgado de la pierna, también llamado fíbula.',
    ubicacion: 'En el lado externo de la pierna, paralelo a la tibia.',
    funcion: 'Estabiliza el tobillo y da inserción a músculos que mueven el pie.',
    modelo: { assetId: 'body-bones-regions', nodeId: 'fibula_left' },
    partes: partesAtlas.fibula, relacionadas: ['tibia', 'gastrocnemius'],
    revision: fuente('Bones of the Lower Limb', '8-4-bones-of-the-lower-limb'),
  },
  {
    id: 'sternum', categoria: 'huesos', nombreEs: 'Esternón', terminoEn: 'Sternum',
    definicion: 'Hueso plano y alargado de la caja torácica.',
    ubicacion: 'En el centro de la parte anterior del tórax.',
    funcion: 'Sostiene las uniones anteriores de las costillas y ayuda a proteger el corazón y los pulmones.',
    modelo: { assetId: 'body-bones-regions', nodeId: 'sternum' },
    partes: partesAtlas.sternum, relacionadas: ['heart', 'lungs'],
    revision: fuente('The Thoracic Cage', '7-4-the-thoracic-cage'),
  },
  {
    id: 'deltoid', categoria: 'musculos', nombreEs: 'Deltoides', terminoEn: 'Deltoid',
    definicion: 'Músculo superficial que da forma redondeada al hombro.',
    ubicacion: 'Rodea el hombro y se inserta en la cara lateral del húmero.',
    funcion: 'Eleva el brazo hacia el lado. Sus porciones anterior y posterior también ayudan a moverlo hacia delante y hacia atrás.',
    modelo: { assetId: 'muscle-regions', nodeId: 'deltoid_left' },
    partes: partesAtlas.deltoid, relacionadas: ['humerus', 'biceps_brachii', 'triceps_brachii'], revision: musculosBrazo,
  },
  {
    id: 'triceps_brachii', categoria: 'musculos', nombreEs: 'Tríceps braquial', terminoEn: 'Triceps brachii',
    definicion: 'Músculo de tres cabezas de la parte posterior del brazo.',
    ubicacion: 'Detrás del húmero. Su tendón se inserta en el olécranon del cúbito.',
    funcion: 'Extiende el codo. La cabeza larga también ayuda a extender el brazo en el hombro.',
    modelo: { assetId: 'muscle-regions', nodeId: 'triceps_brachii_left' },
    partes: partesAtlas.triceps_brachii, relacionadas: ['humerus', 'ulna', 'biceps_brachii'], revision: musculosBrazo,
  },
  {
    id: 'gastrocnemius', categoria: 'musculos', nombreEs: 'Gastrocnemio', terminoEn: 'Gastrocnemius',
    definicion: 'Músculo superficial de la pantorrilla, conocido como los gemelos.',
    ubicacion: 'Detrás de la pierna. Va desde el extremo inferior del fémur hasta el tendón de Aquiles.',
    funcion: 'Ayuda a levantar el talón al caminar o ponerse de puntillas y también a flexionar la rodilla.',
    modelo: { assetId: 'muscle-regions', nodeId: 'gastrocnemius_left' },
    partes: partesAtlas.gastrocnemius, relacionadas: ['femur', 'tibia', 'fibula'],
    revision: fuente('Appendicular Muscles of the Pelvic Girdle and Lower Limbs', '11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
  },
  {
    id: 'stomach', categoria: 'organos', nombreEs: 'Estómago', terminoEn: 'Stomach',
    definicion: 'Órgano muscular del tubo digestivo que recibe el alimento del esófago.',
    ubicacion: 'En la parte superior del abdomen, principalmente a la izquierda, entre el esófago y el duodeno.',
    funcion: 'Almacena el alimento, lo mezcla con jugos gástricos y envía el contenido al intestino delgado de forma gradual.',
    modelo: { assetId: 'organ-regions', nodeId: 'stomach' },
    partes: partesAtlas.stomach, relacionadas: [],
    revision: fuente('The Stomach', '23-4-the-stomach'),
  },
  {
    id: 'kidneys', categoria: 'organos', nombreEs: 'Riñones', terminoEn: 'Kidneys',
    definicion: 'Par de órganos con forma de frijol del sistema urinario. El modelo muestra su superficie exterior.',
    ubicacion: 'En la parte posterior del abdomen, a ambos lados de la columna vertebral.',
    funcion: 'Filtran la sangre, producen orina y regulan la cantidad de agua y sales del cuerpo.',
    modelo: { assetId: 'organ-regions', nodeId: 'kidneys' },
    partes: partesAtlas.kidneys, relacionadas: [],
    revision: fuente('Gross Anatomy of the Kidney', '25-3-gross-anatomy-of-the-kidney'),
  },
] satisfies readonly Omit<Estructura, 'miniatura'>[];
