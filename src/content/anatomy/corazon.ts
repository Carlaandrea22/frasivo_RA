import type { ParteAnatomica, Revision } from '../types';

export const revisionCorazon: Revision = {
  estado: 'provisional',
  fuentes: [{ titulo: 'OpenStax · Heart Anatomy', url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy' }],
};

export const gruposEtiquetasCorazon: readonly { nombre: string; partes: readonly string[] }[] = [
  { nombre: 'Cámaras', partes: ['right_atrium', 'right_ventricle', 'left_atrium', 'left_ventricle'] },
  { nombre: 'Válvulas', partes: ['tricuspid_valve', 'pulmonary_valve', 'mitral_valve', 'aortic_valve'] },
  { nombre: 'Aorta y venas cavas', partes: ['aorta', 'superior_vena_cava', 'inferior_vena_cava'] },
  { nombre: 'Vasos pulmonares', partes: ['pulmonary_trunk', 'right_pulmonary_artery', 'left_pulmonary_artery', 'pulmonary_veins'] },
];

// IDs exactos de las quince mallas del modelo esquemático existente.
export const partesCorazon: readonly ParteAnatomica[] = [
  { id: 'right_atrium', nombreEs: 'Aurícula derecha', terminoEn: 'Right atrium', ubicacion: 'Cámara superior derecha.', funcion: 'Recibe el retorno venoso sistémico y lo conduce al ventrículo derecho.' },
  { id: 'right_ventricle', nombreEs: 'Ventrículo derecho', terminoEn: 'Right ventricle', ubicacion: 'Cámara inferior derecha, anterior al ventrículo izquierdo.', funcion: 'Impulsa sangre hacia los pulmones por el tronco pulmonar.' },
  { id: 'left_atrium', nombreEs: 'Aurícula izquierda', terminoEn: 'Left atrium', ubicacion: 'Cámara superior izquierda, en la zona posterior del corazón.', funcion: 'Recibe sangre de las venas pulmonares.' },
  { id: 'left_ventricle', nombreEs: 'Ventrículo izquierdo', terminoEn: 'Left ventricle', ubicacion: 'Cámara inferior izquierda; contribuye al vértice cardíaco.', funcion: 'Impulsa sangre hacia la aorta y la circulación sistémica.' },
  { id: 'tricuspid_valve', nombreEs: 'Válvula tricúspide', terminoEn: 'Tricuspid valve', ubicacion: 'Entre la aurícula derecha y el ventrículo derecho.', funcion: 'Evita el retorno hacia la aurícula durante la contracción ventricular.' },
  { id: 'pulmonary_valve', nombreEs: 'Válvula pulmonar', terminoEn: 'Pulmonary valve', ubicacion: 'Entre el ventrículo derecho y el tronco pulmonar.', funcion: 'Evita el retorno de sangre al ventrículo derecho.' },
  { id: 'mitral_valve', nombreEs: 'Válvula mitral', terminoEn: 'Mitral valve', ubicacion: 'Entre la aurícula izquierda y el ventrículo izquierdo.', funcion: 'Evita el retorno hacia la aurícula durante la contracción ventricular.' },
  { id: 'aortic_valve', nombreEs: 'Válvula aórtica', terminoEn: 'Aortic valve', ubicacion: 'Entre el ventrículo izquierdo y la aorta.', funcion: 'Evita el retorno desde la aorta al ventrículo izquierdo.' },
  { id: 'aorta', nombreEs: 'Aorta', terminoEn: 'Aorta', ubicacion: 'Sale del ventrículo izquierdo y forma un arco superior.', funcion: 'Distribuye sangre hacia la circulación sistémica.' },
  { id: 'superior_vena_cava', nombreEs: 'Vena cava superior', terminoEn: 'Superior vena cava', ubicacion: 'Entra en la aurícula derecha desde arriba.', funcion: 'Devuelve sangre de la cabeza, el cuello, los miembros superiores y el tórax.' },
  { id: 'inferior_vena_cava', nombreEs: 'Vena cava inferior', terminoEn: 'Inferior vena cava', ubicacion: 'Entra en la aurícula derecha desde abajo.', funcion: 'Devuelve sangre de regiones situadas por debajo del diafragma.' },
  { id: 'pulmonary_trunk', nombreEs: 'Tronco pulmonar', terminoEn: 'Pulmonary trunk', ubicacion: 'Sale del ventrículo derecho antes de dividirse en arterias pulmonares.', funcion: 'Conduce sangre hacia ambas arterias pulmonares.' },
  { id: 'right_pulmonary_artery', nombreEs: 'Arteria pulmonar derecha', terminoEn: 'Right pulmonary artery', ubicacion: 'Rama del tronco pulmonar hacia el pulmón derecho.', funcion: 'Lleva sangre al pulmón derecho para el intercambio gaseoso.' },
  { id: 'left_pulmonary_artery', nombreEs: 'Arteria pulmonar izquierda', terminoEn: 'Left pulmonary artery', ubicacion: 'Rama del tronco pulmonar hacia el pulmón izquierdo.', funcion: 'Lleva sangre al pulmón izquierdo para el intercambio gaseoso.' },
  { id: 'pulmonary_veins', nombreEs: 'Venas pulmonares', terminoEn: 'Pulmonary veins', ubicacion: 'Conectan los pulmones con la aurícula izquierda.', funcion: 'Devuelven sangre oxigenada al corazón. El modelo agrupa sus entradas de forma esquemática.' },
];
