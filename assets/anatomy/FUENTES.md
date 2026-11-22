# Fuentes de las capas del atlas corporal

**Atribución**

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

La [licencia vigente del archivo oficial de DBCLS](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), actualizada el 27 de febrero de 2025 y consultada el **21 de noviembre de 2026**, autoriza distribución y obras derivadas bajo [CC BY 4.0 Internacional](https://creativecommons.org/licenses/by/4.0/), con la atribución anterior. Algunos encabezados históricos del ZIP conservan el aviso anterior a la actualización. Los créditos de la aplicación usan la atribución vigente del archivo oficial.

| Fuente original | Versión y fecha de edición | Uso |
| --- | --- | --- |
| [BodyParts3D · mallas OBJ IS-A, reducción publicada del 99 %](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip) | 4.0 · 19 de junio de 2013 | Huesos, músculos mayoritarios, órganos mayoritarios y contorno de demostración |
| [Elementos IS-A](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt), [elementos PART-OF](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_element_parts.txt), [catálogo IS-A](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt) y [catálogo PART-OF](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_parts_list_e.txt) | 4.0 · 19 de junio de 2013 | Selección de conceptos FMA y agrupación de mallas elementales |
| [BodyParts3D · mallas OBJ 3.0, reducción publicada del 99 %](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip) y [catálogo 3.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/parts_list_e.txt) | 3.0 · 15 de septiembre de 2011 | Rectos abdominales, cinco lóbulos pulmonares, dorsales anchos y siete grupos musculares de la cara. El compuesto pulmonar probado de 4.0 mostraba sobre todo el árbol bronquial y vascular en vista frontal. |

Descargas y OBJ originales extraídos el 21 de noviembre de 2026 bajo `assets/_fuentes/`. Los elementos utilizados por nodo se conservan en [anchors.json](body/anchors.json). El archivo OBJ del oblicuo externo derecho 3.0 se descargó como referencia de alineación y no forma parte del modelo final. No se usó un segundo atlas ni se incorporaron modelos de pago, con cuenta o con licencia NC.

## Modificaciones

En Blender 5.2.2 LTS se unieron mallas elementales por estructura, se eliminaron vértices coincidentes, se recalcularon normales y se redujeron triángulos con presupuestos por pieza. Se conservaron las proporciones del atlas, sus lados anatómicos y la vista anterior. El modelo usa metros y el origen vertical se desplazó hasta el extremo inferior de la tibia. Las dos mallas del recto abdominal 3.0 se desplazaron 16,6 mm hacia abajo a partir de la comparación del oblicuo externo con la edición 4.0. Los lóbulos 3.0 mantienen sus coordenadas originales en ese marco.

Se aplicaron materiales marfil, rojos musculares y colores propios para órganos. Los nodos de huesos, músculos y órganos tienen WebP con cámara ortográfica, iluminación de estudio, fondo transparente y hasta 572 píxeles en el eje largo. Se añadieron carpos, metacarpianos, falanges de mano, tarsos, metatarsianos y falanges de pie de ambos lados, a partir de elementos de la edición 4.0. Los pies tienen una vista oblicua en cámara para mostrar los huesos largos y una vista frontal de demostración. El contorno de demostración se obtuvo de la superficie BodyParts3D `FJ2810` y se muestra tenue detrás de las capas. El mapa de anclajes se estimó a partir de los extremos de los huesos de referencia, con ojos, orejas y centro torácico calibrados en la misma escala. Los pies se orientan con calcáneo y punta. `spriteAnchors` conserva la proyección oblicua de ambos pies sin alterar sus posiciones 3D en `anchors`.

Los tres GLB, el WebP del contorno, los WebP por pieza y los anclajes son artefactos derivados. Para regenerarlos con las descargas originales y `cwebp`, ejecutar Blender en segundo plano con [prepare-bodyparts3d.py](../../scripts/prepare-bodyparts3d.py) según el encabezado del script. El ensamblado editable queda en el directorio de fuentes ignorado.

## Huesos por región

Los tres GLB provisionales de [regions](regions/) aprovechan las mismas mallas originales BodyParts3D 4.0 bajo CC BY 4.0, con material marfil idéntico y unidades en metros. Se limpiaron y triangularon las mallas en Blender y se redujeron por pieza. Estos recursos complementan el atlas de cuerpo completo.

- **Mano.** Un grupo de carpos, cinco metacarpianos y catorce falanges de la mano derecha. Cada hueso largo tiene dos anclajes de referencia y los índices correspondientes de Hand Landmarker. Los anclajes se calcularon a partir de los extremos del eje principal de su malla. El atlas refleja el modelo para la mano izquierda.
- **Cabeza.** El resto del cráneo se separa del frontal, los parietales, los temporales, los maxilares, los cigomáticos y los nasales. La mandíbula y el grupo de las siete vértebras cervicales son nodos independientes. Se conservaron referencias 3D de ojos, nariz, mentón y articulaciones.
- **Pie.** El modelo del pie derecho contiene calcáneo, astrágalo, el resto del tarso, cinco metatarsianos y el grupo de falanges. Conserva los anclajes de tobillo, talón y punta del atlas original y puede reflejarse para el otro pie. La pose de los dedos se conserva como una aproximación rígida.

El [mapa de anclajes regionales](regions/anchors.json) conserva los identificadores elementales BodyParts3D de cada nodo. [prepare-body-regions.py](../../scripts/prepare-body-regions.py) regenera los tres modelos y el mapa desde las mismas descargas originales.

## Músculos y órganos por región

El atlas completo contiene 57 nodos musculares y 11 de órganos, incluidos los grupos bilaterales. Los tres GLB regionales de tejidos blandos comparten los ejes, el origen y la escala de los huesos. Todos estos recursos son provisionales.

- **Mano.** Las eminencias tenar e hipotenar reúnen sus músculos superficiales y profundos del atlas 4.0. Los interóseos dorsales conservan el grupo de origen. Los tendones corresponden al tramo distal de los flexores y extensores largos, separado en la muñeca según el anclaje del radio. `hand-muscles.glb` conserva las piezas derechas con nombres sin sufijo para poder reflejarlas al otro lado.
- **Cara y cuello.** `head-muscles.glb` reúne frontal, orbiculares de los ojos y de la boca, cigomático mayor, masetero, temporal y buccinador de la edición 3.0. Los esternocleidomastoideos proceden de 4.0. Se recortó el elemento derecho en el plano medio para retirar la copia del lado izquierdo que contenía el OBJ de origen.
- **Torso y extremidades.** Serratos, trapecios, glúteos mayores, isquiotibiales, aductores, braquiorradiales y los grupos del antebrazo proceden de 4.0. Los dorsales anchos provienen de 3.0. La imagen anterior del trapecio muestra su porción descendente, mientras que el GLB y la vista posterior incluyen sus tres porciones. Las estrías decorativas se aplicaron como color por vértice orientado al eje principal de cada superficie.
- **Órganos.** La tráquea y la vejiga son mallas BodyParts3D 4.0. La tiroides es un esquema original de LumAR, con dos lóbulos e istmo modelados en Blender alrededor de la tráquea `FMA7394`. Los catálogos 3.0 y 4.0 disponibles carecen de una malla de la glándula. `head-organs.glb` agrupa cerebro, tráquea y tiroides en su posición dentro del atlas.

[anchors.json](body/anchors.json) conserva los elementos fuente por nodo, las vistas disponibles y un punto normalizado sobre un píxel opaco para las etiquetas. Las proyecciones posteriores se reflejaron para mantener el eje X del atlas. Las distintas orientaciones comparten la iluminación de estudio de huesos. El archivo `BodyParts3D_3.0_obj_99.zip` completo o sus OBJ extraídos pueden colocarse en `assets/_fuentes/bodyparts3d-3.0/`. Para regenerar solo los tejidos blandos con [prepare-bodyparts3d.py](../../scripts/prepare-bodyparts3d.py), añadir `-- --soft-tissues-only` al comando del encabezado.

Los puntos de control para deformar las mallas faciales proceden del modelo canónico de Google MediaPipe v0.10.32, bajo Apache 2.0. [Modelo canónico](https://github.com/google-ai-edge/mediapipe/blob/v0.10.32/mediapipe/modules/face_geometry/data/canonical_face_model.obj) · [Licencia](https://github.com/google-ai-edge/mediapipe/blob/v0.10.32/LICENSE)
