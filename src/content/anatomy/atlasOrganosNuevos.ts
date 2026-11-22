import type { Estructura, Fuente, Revision } from '../types';

const openStax = (titulo: string, pagina: string): Fuente => ({
  titulo: `OpenStax · ${titulo}`,
  url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${pagina}`,
});

const provisional = (primera: Fuente, ...otras: Fuente[]): Revision => ({
  estado: 'provisional',
  fuentes: [primera, ...otras],
});

const organosDigestivos = openStax('Accessory Organs in Digestion', '23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder');
const viaRespiratoria = openStax('Organs and Structures of the Respiratory System', '22-1-organs-and-structures-of-the-respiratory-system');
const arbolTraqueobronquial: Fuente = {
  titulo: 'Drevet et al. · Surgical anatomy of the tracheobronchial tree',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4775257/',
};
const viaUrinaria = openStax('Gross Anatomy of Urine Transport', '25-2-gross-anatomy-of-urine-transport');
const organosLinfoides = openStax('Anatomy of the Lymphatic and Immune Systems', '21-1-anatomy-of-the-lymphatic-and-immune-systems');

export const estructurasOrganosNuevos = [
  {
    id: 'pancreas', categoria: 'organos', nombreEs: 'Páncreas', terminoEn: 'Pancreas',
    definicion: 'Glándula alargada que produce jugo digestivo y hormonas. Sus regiones se extienden desde la cabeza, junto al duodeno, hasta la cola, cerca del bazo.',
    ubicacion: 'Cruza la parte superior del abdomen, por detrás del estómago, entre el duodeno y el bazo.',
    funcion: 'Vierte al duodeno enzimas digestivas y bicarbonato. Libera a la sangre hormonas como la insulina y el glucagón, que regulan la glucemia.',
    modelo: { assetId: 'pancreas', nodeId: 'pancreas' },
    partes: [
      { id: 'cabeza', nombreEs: 'Cabeza', terminoEn: 'Head of pancreas', ubicacion: 'Extremo ancho del lado derecho, rodeado por la curva del duodeno.', funcion: 'Contiene el tramo final del conducto pancreático principal, que desemboca en el duodeno.' },
      { id: 'cuello', nombreEs: 'Cuello', terminoEn: 'Neck of pancreas', ubicacion: 'Tramo corto entre la cabeza y el cuerpo, por delante de los vasos mesentéricos superiores.', funcion: 'Por su interior pasa el conducto pancreático principal desde el cuerpo hacia la cabeza.' },
      { id: 'cuerpo', nombreEs: 'Cuerpo', terminoEn: 'Body of pancreas', ubicacion: 'Porción central alargada que cruza hacia la izquierda, por detrás del estómago.', funcion: 'Contiene tejido secretor y parte del conducto que lleva el jugo pancreático en dirección al duodeno.' },
      { id: 'cola', nombreEs: 'Cola', terminoEn: 'Tail of pancreas', ubicacion: 'Extremo izquierdo de la glándula, próximo al hilio del bazo.', funcion: 'Su tejido contribuye a la producción de jugo pancreático y de hormonas.' },
      { id: 'proceso_unciforme', nombreEs: 'Proceso unciforme', terminoEn: 'Uncinate process of pancreas', ubicacion: 'Prolongación en gancho que sale de la parte inferior de la cabeza y se curva detrás de los vasos mesentéricos superiores.', funcion: 'Su tejido secretor contribuye a la producción de jugo pancreático como el resto de la cabeza.' },
    ],
    relacionadas: ['stomach', 'small_intestine', 'spleen', 'gallbladder'],
    revision: provisional(organosDigestivos, {
      titulo: 'Sharma et al. · Imaging of the pancreatic duct by linear endoscopic ultrasound',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4568631/',
    }),
  },
  {
    id: 'spleen', categoria: 'organos', nombreEs: 'Bazo', terminoEn: 'Spleen',
    definicion: 'Órgano linfoide muy vascularizado. Presenta una superficie orientada al diafragma y otra con impresiones de las vísceras vecinas.',
    ubicacion: 'En la parte superior izquierda del abdomen, bajo las costillas y el diafragma, al lado del estómago.',
    funcion: 'Filtra la sangre, retira glóbulos rojos envejecidos y participa en la respuesta inmunitaria frente a antígenos circulantes.',
    modelo: { assetId: 'spleen', nodeId: 'spleen' },
    partes: [
      { id: 'hilio', nombreEs: 'Hilio esplénico', terminoEn: 'Splenic hilum', ubicacion: 'Hendidura de la cara visceral, cerca de la cola del páncreas.', funcion: 'Da paso a la arteria y la vena esplénicas y a los vasos linfáticos.' },
      { id: 'superficie_diafragmatica', nombreEs: 'Superficie diafragmática', terminoEn: 'Diaphragmatic surface of spleen', ubicacion: 'Cara convexa orientada hacia la cúpula izquierda del diafragma.', funcion: 'Su curvatura se adapta a la del diafragma y marca el lado del bazo que mira hacia las costillas.' },
      { id: 'superficie_gastrica', nombreEs: 'Impresión gástrica', terminoEn: 'Gastric impression of spleen', ubicacion: 'Zona cóncava de la cara visceral que mira hacia el estómago.', funcion: 'Se adapta al contorno de la porción superior del estómago.' },
      { id: 'superficie_renal', nombreEs: 'Impresión renal', terminoEn: 'Renal impression of spleen', ubicacion: 'Zona de la cara visceral enfrentada al polo superior del riñón izquierdo.', funcion: 'Marca la relación entre el bazo y el riñón izquierdo.' },
      { id: 'superficie_colica', nombreEs: 'Impresión cólica', terminoEn: 'Colic impression of spleen', ubicacion: 'Zona inferior de la cara visceral, junto a la flexura izquierda del colon.', funcion: 'Marca la zona de contacto con el colon al girar hacia su tramo descendente.' },
    ],
    relacionadas: ['pancreas', 'stomach', 'kidneys', 'large_intestine', 'diaphragm'],
    revision: provisional(organosLinfoides, {
      titulo: 'FIPAT · Terminologia Anatomica, órganos linfoides',
      url: 'https://fipat.library.dal.ca/wp-content/uploads/2021/08/FIPAT-TA2-Part-4.pdf',
    }),
  },
  {
    id: 'gallbladder', categoria: 'organos', nombreEs: 'Vesícula biliar', terminoEn: 'Gallbladder',
    definicion: 'Saco con forma de pera conectado a la vía biliar por el conducto cístico. Las divisiones entre fondo, cuerpo y cuello se señalan de forma aproximada.',
    ubicacion: 'En la cara inferior del hígado, en la parte superior derecha del abdomen.',
    funcion: 'Almacena y concentra la bilis que produce el hígado. La libera hacia el duodeno, donde facilita la digestión de las grasas.',
    modelo: { assetId: 'gallbladder', nodeId: 'gallbladder' },
    partes: [
      { id: 'fondo', nombreEs: 'Fondo', terminoEn: 'Fundus of gallbladder', ubicacion: 'Extremo redondeado, alejado del conducto cístico, cerca del borde inferior del hígado.', funcion: 'Se distiende con el resto de la vesícula cuando esta recibe bilis.' },
      { id: 'cuerpo', nombreEs: 'Cuerpo', terminoEn: 'Body of gallbladder', ubicacion: 'Porción amplia entre el fondo y el cuello, adosada al hígado.', funcion: 'Aporta la mayor parte del espacio para almacenar la bilis.' },
      { id: 'cuello', nombreEs: 'Cuello', terminoEn: 'Neck of gallbladder', ubicacion: 'Extremo estrecho que continúa con el conducto cístico.', funcion: 'Comunica la cavidad de la vesícula con el conducto cístico.' },
      { id: 'conducto_cistico', nombreEs: 'Conducto cístico', terminoEn: 'Cystic duct', ubicacion: 'Sale del cuello de la vesícula y se une al conducto hepático común para formar el colédoco.', funcion: 'Permite el paso de la bilis hacia la vesícula durante el almacenamiento y su salida cuando la vesícula se contrae.' },
    ],
    relacionadas: ['liver', 'small_intestine', 'pancreas'],
    revision: provisional(organosDigestivos),
  },
  {
    id: 'esophagus', categoria: 'organos', nombreEs: 'Esófago', terminoEn: 'Esophagus',
    definicion: 'Tubo muscular que une la faringe con el estómago. Sus porciones cervical, torácica y abdominal se distinguen de forma aproximada en el modelo.',
    ubicacion: 'Desciende por detrás de la tráquea, atraviesa el tórax y pasa por el hiato esofágico del diafragma antes de llegar al estómago.',
    funcion: 'Transporta alimentos y líquidos al estómago mediante ondas coordinadas de contracción llamadas peristalsis.',
    modelo: { assetId: 'esophagus', nodeId: 'esophagus' },
    partes: [
      { id: 'cervical', nombreEs: 'Porción cervical', terminoEn: 'Cervical part of esophagus', ubicacion: 'En el cuello, entre la faringe y la entrada del tórax, por detrás de la tráquea.', funcion: 'Recibe el bolo de la faringe cuando se relaja el esfínter esofágico superior durante la deglución.' },
      { id: 'toracica', nombreEs: 'Porción torácica', terminoEn: 'Thoracic part of esophagus', ubicacion: 'Tramo largo en el mediastino, desde la entrada del tórax hasta el diafragma.', funcion: 'Propulsa el bolo por el tórax mediante contracciones peristálticas.' },
      { id: 'abdominal', nombreEs: 'Porción abdominal', terminoEn: 'Abdominal part of esophagus', ubicacion: 'Tramo corto por debajo del diafragma, hasta la unión con el estómago.', funcion: 'Conduce el bolo al estómago. En esta unión, el esfínter esofágico inferior ayuda a limitar el reflujo.' },
    ],
    relacionadas: ['stomach', 'trachea_bronchi', 'diaphragm', 'larynx'],
    revision: provisional(openStax('The Mouth, Pharynx, and Esophagus', '23-3-the-mouth-pharynx-and-esophagus')),
  },
  {
    id: 'trachea_bronchi', categoria: 'organos', nombreEs: 'Tráquea y bronquios principales', terminoEn: 'Trachea and main bronchi',
    definicion: 'Conductos respiratorios sostenidos por cartílago. La tráquea se divide en dos bronquios principales, uno para cada pulmón.',
    ubicacion: 'La tráquea baja desde la laringe hasta el mediastino. Desde allí, los bronquios se dirigen a los hilios pulmonares.',
    funcion: 'Conducen el aire entre la laringe y los pulmones. El moco y los cilios de su revestimiento ayudan a retirar partículas del aire inspirado.',
    modelo: { assetId: 'trachea_bronchi', nodeId: 'trachea_bronchi' },
    partes: [
      { id: 'traquea', nombreEs: 'Tráquea', terminoEn: 'Trachea', ubicacion: 'Tubo situado delante del esófago, entre la laringe y la bifurcación en dos bronquios.', funcion: 'Conduce el aire entre la laringe y los bronquios principales.' },
      { id: 'cartilago_traqueal', nombreEs: 'Cartílago traqueal', terminoEn: 'Tracheal cartilage', ubicacion: 'Serie de anillos en forma de C en la pared de la tráquea, abiertos por detrás.', funcion: 'Mantiene abierta la tráquea y permite que su pared posterior ceda cuando el esófago se distiende.' },
      { id: 'carina', nombreEs: 'Carina', terminoEn: 'Carina of trachea', ubicacion: 'Cresta interna al final de la tráquea, entre los orificios de los dos bronquios principales.', funcion: 'Separa las entradas de ambos bronquios. Su estimulación puede desencadenar la tos.' },
      { id: 'bronquio_principal_derecho', nombreEs: 'Bronquio principal derecho', terminoEn: 'Right main bronchus', ubicacion: 'Desde la bifurcación traqueal hasta el hilio derecho, con un trayecto más vertical que el izquierdo.', funcion: 'Lleva aire hacia y desde el pulmón derecho.' },
      { id: 'cartilago_bronquial_derecho', nombreEs: 'Cartílago del bronquio principal derecho', terminoEn: 'Cartilage of right main bronchus', ubicacion: 'En la pared del bronquio principal derecho.', funcion: 'Refuerza la pared del bronquio y ayuda a mantener su luz abierta.' },
      { id: 'bronquio_principal_izquierdo', nombreEs: 'Bronquio principal izquierdo', terminoEn: 'Left main bronchus', ubicacion: 'Desde la bifurcación traqueal hasta el hilio izquierdo, con un trayecto más oblicuo y largo que el derecho.', funcion: 'Lleva aire hacia y desde el pulmón izquierdo.' },
      { id: 'cartilago_bronquial_izquierdo', nombreEs: 'Cartílago del bronquio principal izquierdo', terminoEn: 'Cartilage of left main bronchus', ubicacion: 'En la pared del bronquio principal izquierdo.', funcion: 'Refuerza la pared del bronquio y ayuda a mantener su luz abierta.' },
    ],
    relacionadas: ['lungs', 'larynx', 'esophagus'],
    revision: provisional(viaRespiratoria, arbolTraqueobronquial),
  },
  {
    id: 'urinary_bladder', categoria: 'organos', nombreEs: 'Vejiga urinaria', terminoEn: 'Urinary bladder',
    definicion: 'Órgano hueco y distensible con una pared muscular. Gira el modelo hacia la vista posterior para localizar el trígono y los orificios ureterales en la superficie interna.',
    ubicacion: 'En la parte anterior de la pelvis, detrás del pubis. Al llenarse, su porción superior puede ascender hacia el abdomen.',
    funcion: 'Almacena la orina que llega desde los uréteres y la expulsa por la uretra al contraerse su pared.',
    modelo: { assetId: 'urinary_bladder', nodeId: 'urinary_bladder' },
    partes: [
      { id: 'cupula', nombreEs: 'Cúpula vesical', terminoEn: 'Dome of urinary bladder', ubicacion: 'Porción superior de la vejiga, que se eleva cuando el órgano se llena.', funcion: 'Se expande durante el llenado y permite que aumente el volumen almacenado.' },
      { id: 'base_vesical', nombreEs: 'Base vesical', terminoEn: 'Base of urinary bladder', ubicacion: 'Cara posterior de la vejiga, en cuya superficie interna se encuentra el trígono.', funcion: 'Recibe los uréteres cerca de sus extremos laterales y rodea la región que conduce al cuello.' },
      { id: 'cuello', nombreEs: 'Cuello vesical', terminoEn: 'Neck of urinary bladder', ubicacion: 'Región estrecha inferior, en continuidad con el inicio de la uretra.', funcion: 'Su músculo liso contribuye a mantener cerrada la salida durante el llenado y se relaja durante la micción.' },
      { id: 'trigono', nombreEs: 'Trígono vesical', terminoEn: 'Trigone of urinary bladder', ubicacion: 'Área triangular interna de la base, entre los dos orificios ureterales y el orificio uretral interno.', funcion: 'Reúne en una misma región las dos entradas de orina y su salida hacia la uretra.' },
      { id: 'orificio_ureteral_derecho', nombreEs: 'Orificio ureteral derecho', terminoEn: 'Right ureteric orifice', ubicacion: 'En el ángulo posterolateral derecho del trígono.', funcion: 'Deja entrar en la vejiga la orina que transporta el uréter derecho.' },
      { id: 'orificio_ureteral_izquierdo', nombreEs: 'Orificio ureteral izquierdo', terminoEn: 'Left ureteric orifice', ubicacion: 'En el ángulo posterolateral izquierdo del trígono.', funcion: 'Deja entrar en la vejiga la orina que transporta el uréter izquierdo.' },
    ],
    relacionadas: ['ureters', 'kidneys', 'pelvis'],
    revision: provisional(viaUrinaria),
  },
  {
    id: 'larynx', categoria: 'organos', nombreEs: 'Laringe', terminoEn: 'Larynx',
    definicion: 'Segmento de la vía respiratoria que aloja los pliegues vocales y se sostiene sobre un armazón de cartílagos.',
    ubicacion: 'En la parte anterior del cuello, entre la faringe y la tráquea, justo por debajo del hueso hioides.',
    funcion: 'Deja pasar el aire, participa en la producción de la voz y ayuda a proteger la entrada de la vía respiratoria al tragar.',
    modelo: { assetId: 'larynx', nodeId: 'larynx' },
    partes: [
      { id: 'epiglotico', nombreEs: 'Cartílago epiglótico', terminoEn: 'Epiglottic cartilage', ubicacion: 'Lámina elástica de la epiglotis, encima de la entrada laríngea y detrás de la base de la lengua.', funcion: 'Sostiene la epiglotis, que ayuda a cubrir la entrada laríngea al tragar.' },
      { id: 'tiroides', nombreEs: 'Cartílago tiroides', terminoEn: 'Thyroid cartilage', ubicacion: 'Gran cartílago anterior que forma la prominencia laríngea, por encima del cricoides.', funcion: 'Protege la laringe y ofrece un punto de fijación anterior a los pliegues vocales.' },
      { id: 'cricoides', nombreEs: 'Cartílago cricoides', terminoEn: 'Cricoid cartilage', ubicacion: 'Anillo completo en la base de la laringe, justo por encima de la tráquea.', funcion: 'Sostiene la vía aérea y ofrece una base de articulación a los cartílagos aritenoides.' },
      { id: 'aritenoides_derecho', nombreEs: 'Cartílago aritenoides derecho', terminoEn: 'Right arytenoid cartilage', ubicacion: 'Sobre la parte posterior derecha del cricoides, debajo del cartílago corniculado derecho.', funcion: 'Al girar y deslizarse, cambia la posición del pliegue vocal derecho.' },
      { id: 'aritenoides_izquierdo', nombreEs: 'Cartílago aritenoides izquierdo', terminoEn: 'Left arytenoid cartilage', ubicacion: 'Sobre la parte posterior izquierda del cricoides, debajo del cartílago corniculado izquierdo.', funcion: 'Al girar y deslizarse, cambia la posición del pliegue vocal izquierdo.' },
      { id: 'corniculado_derecho', nombreEs: 'Cartílago corniculado derecho', terminoEn: 'Right corniculate cartilage', ubicacion: 'Pequeño nódulo sobre el vértice del aritenoides derecho, en el pliegue ariepiglótico.', funcion: 'Da soporte a la parte posterior del pliegue ariepiglótico derecho.' },
      { id: 'corniculado_izquierdo', nombreEs: 'Cartílago corniculado izquierdo', terminoEn: 'Left corniculate cartilage', ubicacion: 'Pequeño nódulo sobre el vértice del aritenoides izquierdo, en el pliegue ariepiglótico.', funcion: 'Da soporte a la parte posterior del pliegue ariepiglótico izquierdo.' },
    ],
    relacionadas: ['hyoid', 'trachea_bronchi', 'esophagus', 'lungs'],
    revision: provisional(viaRespiratoria, arbolTraqueobronquial),
  },
  {
    id: 'adrenal_glands', categoria: 'organos', nombreEs: 'Glándulas suprarrenales', terminoEn: 'Adrenal glands',
    definicion: 'Par de glándulas endocrinas, cada una con una corteza externa y una médula interna.',
    ubicacion: 'En la parte posterior del abdomen, junto a los polos superiores de los riñones.',
    funcion: 'Secretan hormonas que ayudan a regular el metabolismo, la respuesta al estrés y el equilibrio de sal y agua.',
    modelo: { assetId: 'adrenal_glands', nodeId: 'adrenal_glands' },
    partes: [
      { id: 'derecha', nombreEs: 'Suprarrenal derecha', terminoEn: 'Right adrenal gland', ubicacion: 'Junto al polo superior del riñón derecho, próxima al hígado y a la vena cava inferior.', funcion: 'Su corteza produce hormonas como cortisol y aldosterona. Su médula libera adrenalina y noradrenalina.' },
      { id: 'izquierda', nombreEs: 'Suprarrenal izquierda', terminoEn: 'Left adrenal gland', ubicacion: 'En el borde superior y medial del riñón izquierdo, próxima al páncreas.', funcion: 'Su corteza produce hormonas como cortisol y aldosterona. Su médula libera adrenalina y noradrenalina.' },
    ],
    relacionadas: ['kidneys', 'ureters', 'pancreas'],
    revision: provisional(openStax('The Adrenal Glands', '17-6-the-adrenal-glands')),
  },
  {
    id: 'ureters', categoria: 'organos', nombreEs: 'Uréteres', terminoEn: 'Ureters',
    definicion: 'Par de conductos musculares entre los riñones y la vejiga. Los cálices y las pelvis renales muestran dónde empieza el trayecto de la orina hacia los uréteres.',
    ubicacion: 'Cada uréter nace de la pelvis renal y desciende por la pared posterior del abdomen hasta la vejiga.',
    funcion: 'Impulsan la orina desde los riñones hasta la vejiga mediante contracciones peristálticas.',
    modelo: { assetId: 'ureters', nodeId: 'ureters' },
    partes: [
      { id: 'ureter_derecho', nombreEs: 'Uréter derecho', terminoEn: 'Right ureter', ubicacion: 'Desde la pelvis renal derecha hasta la pared posterolateral derecha de la vejiga.', funcion: 'Transporta la orina del riñón derecho a la vejiga.' },
      { id: 'pelvis_renal_derecha', nombreEs: 'Pelvis renal derecha', terminoEn: 'Right renal pelvis', ubicacion: 'Región en embudo junto al hilio del riñón derecho, antes del inicio del uréter.', funcion: 'Reúne la orina procedente de los cálices mayores derechos y la dirige al uréter derecho.' },
      { id: 'calices_derechos', nombreEs: 'Cálices renales derechos', terminoEn: 'Right renal calyces', ubicacion: 'Ramificaciones del sistema colector dentro del riñón derecho, desde las papilas hasta la pelvis renal.', funcion: 'Los cálices menores reciben la orina de las papilas y la llevan a los cálices mayores, que desembocan en la pelvis renal.' },
      { id: 'ureter_izquierdo', nombreEs: 'Uréter izquierdo', terminoEn: 'Left ureter', ubicacion: 'Desde la pelvis renal izquierda hasta la pared posterolateral izquierda de la vejiga.', funcion: 'Transporta la orina del riñón izquierdo a la vejiga.' },
      { id: 'pelvis_renal_izquierda', nombreEs: 'Pelvis renal izquierda', terminoEn: 'Left renal pelvis', ubicacion: 'Región en embudo junto al hilio del riñón izquierdo, antes del inicio del uréter.', funcion: 'Reúne la orina procedente de los cálices mayores izquierdos y la dirige al uréter izquierdo.' },
      { id: 'calices_izquierdos', nombreEs: 'Cálices renales izquierdos', terminoEn: 'Left renal calyces', ubicacion: 'Ramificaciones del sistema colector dentro del riñón izquierdo, desde las papilas hasta la pelvis renal.', funcion: 'Los cálices menores reciben la orina de las papilas y la llevan a los cálices mayores, que desembocan en la pelvis renal.' },
    ],
    relacionadas: ['kidneys', 'urinary_bladder', 'adrenal_glands'],
    revision: provisional(viaUrinaria, openStax('Gross Anatomy of the Kidney', '25-3-gross-anatomy-of-the-kidney')),
  },
  {
    id: 'thymus', categoria: 'organos', nombreEs: 'Timo', terminoEn: 'Thymus',
    definicion: 'Órgano linfoide primario formado por dos lóbulos. Es más activo durante la infancia y su tejido funcional disminuye con la edad.',
    ubicacion: 'En el mediastino superior y anterior, detrás del esternón y por delante del corazón y los grandes vasos.',
    funcion: 'Proporciona el entorno donde maduran los linfocitos T y se seleccionan los que pueden integrar la respuesta inmunitaria.',
    modelo: { assetId: 'thymus', nodeId: 'thymus' },
    partes: [
      { id: 'lobulo_derecho', nombreEs: 'Lóbulo derecho', terminoEn: 'Right lobe of thymus', ubicacion: 'Mitad derecha del órgano, unida al lóbulo izquierdo por tejido conjuntivo.', funcion: 'Sus lobulillos contienen corteza y médula, donde maduran y se seleccionan los linfocitos T.' },
      { id: 'lobulo_izquierdo', nombreEs: 'Lóbulo izquierdo', terminoEn: 'Left lobe of thymus', ubicacion: 'Mitad izquierda del órgano, unida al lóbulo derecho por tejido conjuntivo.', funcion: 'Sus lobulillos contienen corteza y médula, donde maduran y se seleccionan los linfocitos T.' },
    ],
    relacionadas: ['sternum', 'heart', 'spleen'],
    revision: provisional(organosLinfoides),
  },
] satisfies readonly (Estructura & { modelo: NonNullable<Estructura['modelo']> })[];
