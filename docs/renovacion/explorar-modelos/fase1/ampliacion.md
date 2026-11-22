# Ampliación propuesta de Explorar 3D

Diez candidatos por categoría para los primeros cursos de Medicina, ordenados por prioridad docente. Mandíbula, sacro y vértebras amplían el detalle de fichas de conjunto. Mano y pie aprovechan modelos regionales de Cuerpo. Las fichas nuevas usarían la vista de Explorar y las partes seleccionables que ya ofrece.

**Origen** indica que las partes corresponden a OBJ o nodos GLB separados. **Provisional** indica que LumAR tendría que delimitar regiones de una malla existente y validar sus límites anatómicos. Los FMA identifican conceptos y los FJ identifican los OBJ de BodyParts3D 4.0. Para BodyParts3D 3.0, los FMA indicados son también nombres de archivo. Se comprobó la geometría OBJ y se inspeccionaron los nodos de los GLB descargados.

## Huesos

| Candidato | Malla verificada | Partes seleccionables |
| --- | --- | --- |
| Clavícula | Izq. `FMA13323/FJ3237`, der. `FMA13322/FJ3362` | Extremos esternal y acromial, cuerpo. Provisional por lado. |
| Escápula | Izq. `FMA13396/FJ3279`, der. `FMA13395/FJ3384` | Espina, acromion, apófisis coracoides, cavidad glenoidea. Provisional por lado. |
| Costillas | `FMA7574`, 24 OBJ. Ejemplos izquierdos `FMA8093/FJ3232` (5.ª), `FMA8310/FJ3235` (8.ª), `FMA8532/FJ3226` (11.ª) | Verdaderas, falsas unidas al arco (8.ª–10.ª) y flotantes (11.ª–12.ª), agrupadas por OBJ de origen. Cabeza, cuello, tubérculo, cuerpo y surco costal en la 5.ª, provisionales. |
| Mandíbula | `FMA52748/FJ3289` | Cuerpo, ángulo, rama, procesos condilar y coronoides. Provisional. Ya se selecciona completa en `skull`. |
| Mano ósea derecha | Carpos, metacarpianos y falanges según [mapa regional](../../../../assets/anatomy/regions/anchors.json). Ejemplos `FMA24435/FJ3383`, `FMA24464/FJ3350`, `FMA24459/FJ3198` | Escafoides y demás carpos, metacarpianos I–V, falanges por dedo. OBJ de origen por hueso. |
| Pie óseo derecho | Tarso, metatarsianos y falanges según [mapa regional](../../../../assets/anatomy/regions/anchors.json). Ejemplos `FMA24497/FJ3360`, `FMA24482/FJ3385`, `FMA24507/FJ3351`, `FMA32650/FJ3192` | Calcáneo, astrágalo, otros tarsianos, metatarsianos I–V y falanges por dedo. OBJ de origen por hueso. |
| Vértebra cervical típica | C4 `FMA12522/FJ3164` | Cuerpo, arco, apófisis espinosa y transversas, forámenes transversos. Provisional. C4 ya aparece en el grupo cervical de `spine`. |
| Vértebras torácica y lumbar típicas | T7 `FMA9968/FJ3173`, L3 `FMA13074/FJ3162` | Vértebras separadas en origen. Cuerpo, arco, apófisis y carillas costales de T7, provisionales. Ambas aparecen agrupadas por región en `spine`. |
| Sacro y cóccix | `FMA16202/FJ3393`, superficie continua | Sacro y cóccix con separación provisional, igual que en `spine`. Promontorio, alas y forámenes sacros requieren nuevas delimitaciones provisionales. |
| Hioides | `FMA52749/FJ2772`. `FJ3201` contiene la misma geometría | Cuerpo, astas mayores y menores. Provisional, sujeto a que cada asta pueda distinguirse en la malla. |

Referencias docentes. [Esqueleto axial](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-1-divisions-of-the-skeletal-system) · [Columna vertebral](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-3-the-vertebral-column) · [Cintura escapular](https://openstax.org/books/anatomy-and-physiology-2e/pages/8-1-the-pectoral-girdle)

## Músculos

| Candidato | Malla verificada | Partes seleccionables |
| --- | --- | --- |
| Pectoral mayor | Porciones clavicular `FMA34691/FJ1447M`, esternocostal `FMA79980/FJ1464M` y abdominal `FMA45875/FJ1446M` izquierdas | Las tres porciones tienen OBJ de origen. La porción clavicular se recupera por su concepto propio en IS-A. |
| Trapecio | Izq. `FMA33587/FJ1521M`, `FMA33585/FJ1554M`, `FMA33583/FJ1520M` | Porciones descendente, transversa y ascendente en OBJ de origen. |
| Recto del abdomen | 3.0 `FMA13377` der. y `FMA13378` izq. | Ambos rectos en origen. Las intersecciones tendinosas requieren delimitación provisional si la superficie las permite identificar. |
| Oblicuo externo | `FMA13336/FJ1452` der., `FMA13337/FJ1452M` izq. | Ambos lados en origen. Regiones superior e inferior provisionales para orientación. |
| Dorsal ancho | 3.0 `FMA13358` der. y `FMA13359` izq. | Ambos dorsales en origen. Etiquetar la región distal cerca del húmero solo si se distingue en la malla, con delimitación provisional. |
| Glúteo mayor | `FMA22328/FJ1418` der., `FMA22329/FJ1418M` izq. | Ambos lados en origen. Porciones superior e inferior provisionales. |
| Isquiotibiales | Izq. semitendinoso `FMA22359/FJ1436M`, semimembranoso `FMA22449/FJ1435M`, cabeza larga del bíceps femoral `FMA45889/FJ1395M`. Cabeza corta `FMA45892/FJ1444M` como contexto | Cada músculo tiene OBJ de origen. La cabeza corta se muestra como referencia del bíceps femoral. |
| Tibial anterior | `FMA22544/FJ1439` der., `FMA22545/FJ1439M` izq. | Ambos lados en origen. Vientre y extremo distal, provisionales. |
| Esternocleidomastoideo | Izq. `FMA13409/FJ1573`. El OBJ derecho `FMA13408/FJ1595` cruza el plano medio | En el izquierdo, cabezas esternal y clavicular provisionales. Para incorporar el derecho, reutilizar el recorte ya aplicado en Cuerpo. |
| Diafragma | `FMA13295/FJ3131` | Cúpulas derecha e izquierda y región del centro tendinoso. Provisional. |

También disponibles para una tanda siguiente. **Sartorio** `FMA22354/FJ1434` der. y `FMA22355/FJ1434M` izq., dos OBJ de origen. **Masetero** 3.0 `FMA49001` y `FMA49002` superficiales, `FMA49004` y `FMA49005` profundos, cuatro OBJ de origen.

Referencias docentes. [Cabeza, cuello y espalda](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back) · [Pared abdominal y tórax](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax) · [Cintura pélvica y miembro inferior](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs)

## Órganos

| Candidato | Malla verificada | Partes seleccionables |
| --- | --- | --- |
| Páncreas | HRA `HBM368.XMJZ.722`, `3d-vh-m-pancreas.glb` [Ficha y crédito](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-pancreas.md) | Cabeza, cuello, cuerpo, cola y proceso unciforme, cinco nodos de origen. |
| Bazo | HRA `HBM662.GMWC.569`, `VH_M_Spleen.glb` [Ficha y crédito](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-spleen.md) | Hilio y superficies diafragmática, gástrica, renal y cólica, cinco nodos de origen. |
| Vesícula biliar | `FMA7202/FJ2817` y conducto cístico `FMA14539/FJ3080` | Vesícula y conducto en OBJ separados. Fondo, cuerpo y cuello de la vesícula, provisionales. Enlazar con `liver`. |
| Esófago | `FMA7131/FJ2563` | Porciones cervical, torácica y abdominal, provisionales con referencias de tráquea, diafragma y estómago. |
| Tráquea y bronquios principales | HRA `HBM969.WCCJ.636` y `HBM795.LVRX.842`, `3d-vh-m-trachea.glb` y `3d-vh-m-main-bronchus.glb` [Tráquea](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-trachea.md) · [Bronquios](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-main-bronchus.md) | Tráquea, cartílago traqueal, carina y cada bronquio principal con su cartílago, nodos de origen. Enlazar con `lungs`. |
| Vejiga urinaria | HRA `HBM934.DMHJ.898`, `VH_M_Urinary_Bladder.glb` [Ficha y crédito](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-urinary-bladder.md) | Cúpula, base, cuello, trígono y dos orificios ureterales, seis nodos de origen. |
| Laringe | HRA `HBM563.KGWS.679`, `3d-vh-m-larynx.glb` [Ficha y crédito](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-larynx.md) | Cartílagos epiglótico, tiroides, cricoides, aritenoides y corniculados, siete nodos de origen. Alternativa para el bloque de cuello. |
| Glándulas suprarrenales | `FMA15629/FJ3130` der. y `FMA15630/FJ3129` izq. | Dos OBJ de origen con los riñones como referencia de posición. |
| Uréteres | HRA `HBM473.XWNL.438` izq. y `HBM878.DBSR.759` der., `VH_M_Ureter_L.glb` y `VH_M_Ureter_R.glb` [Izquierdo](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-ureter-l.md) · [Derecho](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-ureter-r.md) | Uréter, pelvis renal y cálices de cada lado, nodos de origen. Enlazar con `kidneys` y vejiga. |
| Timo | HRA `HBM823.SNLN.667`, ficha v1.2 y archivo `VH_M_Thymus.glb` [Ficha y crédito](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-thymus.md) | Lóbulos derecho e izquierdo, dos nodos de origen. |

**Tiroides.** La glándula queda en reserva. Cuerpo incluye un esquema de LumAR con lóbulos e istmo. Los archivos OBJ 3.0 y 4.0 verificados carecen de una malla glandular y la revisión de referencias HRA consultadas no confirmó una. [Fuentes de Cuerpo](../../../../assets/anatomy/FUENTES.md) · [Biblioteca HRA](https://humanatlas.io/3d-reference-library)

**Corazón exterior.** Reserva para una ficha `heart_external` en la plantilla actual de Explorar, con el corte esquemático `heart` como ficha relacionada. HRA `HBM373.VSTV.568` ofrece dos atrios y dos ventrículos como nodos independientes, además de estructuras internas. BodyParts3D 4.0 ofrece elementos de pared auricular `FMA9531/FJ2438` y `FMA9457/FJ2439`, de pared ventricular `FMA9556/FJ2418,FJ2429,FJ2432` y `FMA9533/FJ2419,FJ2430,FJ2437`, aorta ascendente `FMA3736/FJ3413` y tronco pulmonar `FMA8612/FJ2966`. La incorporación requiere comprobar la continuidad y cobertura exterior del ensamblado 4.0. El objetivo de selección sería atrios, ventrículos y vasos de origen, con base, ápice y surcos como regiones provisionales si la superficie permite ubicarlos. [Referencia HRA y crédito](https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/markdown/ref-organs/3d-vh-m-heart.md) · [Anatomía externa](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy)

## Licencia y crédito

- **BodyParts3D 4.0 y 3.0.** CC BY 4.0 según el archivo oficial vigente de DBCLS. Crédito exigido «BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International». Los ejemplos 4.0 se verificaron en el ZIP IS-A OBJ 99 y los de 3.0 en el índice del ZIP OBJ 95 y los OBJ locales. [Licencia](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) · [Descargas oficiales](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
- **Human Reference Atlas.** Cada ficha de arriba identifica su versión, archivo GLB y crédito específico bajo CC BY 4.0. Las citas de los modelos HRA elegidos acreditan a Kristen Browne y Heidi Schlehlein, con HuBMAP como editor. En cada derivado se conserva el crédito de la fuente y se indican las modificaciones de LumAR. [Biblioteca de objetos 3D](https://humanatlas.io/3d-reference-library) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
