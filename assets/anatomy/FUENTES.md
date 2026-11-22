# Fuentes de las capas del atlas corporal

**Atribución**

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

La [licencia vigente del archivo oficial de DBCLS](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), actualizada el 27 de febrero de 2025 y consultada el **21 de noviembre de 2026**, autoriza distribución y obras derivadas bajo [CC BY 4.0 Internacional](https://creativecommons.org/licenses/by/4.0/), con la atribución anterior. Algunos encabezados históricos del ZIP conservan el aviso anterior a la actualización. Los créditos de la aplicación usan la atribución vigente del archivo oficial.

| Fuente original | Versión y fecha de edición | Uso |
| --- | --- | --- |
| [BodyParts3D · mallas OBJ IS-A, reducción publicada del 99 %](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip) | 4.0 · 19 de junio de 2013 | Huesos, músculos mayoritarios, órganos mayoritarios y contorno de demostración |
| [Elementos IS-A](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt), [elementos PART-OF](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_element_parts.txt), [catálogo IS-A](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt) y [catálogo PART-OF](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_parts_list_e.txt) | 4.0 · 19 de junio de 2013 | Selección de conceptos FMA y agrupación de mallas elementales |
| [BodyParts3D · mallas OBJ 3.0, reducción publicada del 99 %](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip) y [catálogo 3.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/parts_list_e.txt) | 3.0 · 15 de septiembre de 2011 | Rectos abdominales y cinco lóbulos pulmonares del mismo atlas. El compuesto pulmonar probado de 4.0 mostraba sobre todo el árbol bronquial y vascular en vista frontal. |

Descargas y OBJ originales extraídos el 21 de noviembre de 2026 bajo `assets/_fuentes/`. Los elementos utilizados por nodo se conservan en [anchors.json](body/anchors.json). El archivo OBJ del oblicuo externo derecho 3.0 se descargó como referencia de alineación y no forma parte del modelo final. No se usó un segundo atlas ni se incorporaron modelos de pago, con cuenta o con licencia NC.

## Modificaciones

Los [GLB con regiones seleccionables de Explorar](../../src/content/anatomy/modelos/README.md) conservan los triángulos, posiciones, normales y materiales originales. El [generador](../../scripts/generate-explorar-regions.mjs) agrupa superficies y estima los límites cuando las partes comparten una malla. Para el cráneo, la columna, el cerebro, el hígado y los intestinos, [el mapa de regiones](../../scripts/map-explorar-atlas-regions.py) reutiliza los elementos de la tabla PART-OF de BodyParts3D 4.0. Los derivados conservan la atribución y licencia CC BY 4.0. Las regiones y anclajes siguen pendientes de revisión anatómica.

Explorar incluye [clips de pronunciación en inglés estadounidense](../../src/content/anatomy/pronunciacion/README.md) generados con Piper y el modelo femenino LJ Speech, entrenado con grabaciones de dominio público.

En Blender 5.2.2 LTS se unieron mallas elementales por estructura, se eliminaron vértices coincidentes, se recalcularon normales y se redujeron triángulos con presupuestos por pieza. Se conservaron las proporciones del atlas, sus lados anatómicos y la vista anterior. El modelo usa metros y el origen vertical se desplazó hasta el extremo inferior de la tibia. Las dos mallas del recto abdominal 3.0 se desplazaron 16,6 mm hacia abajo a partir de la comparación del oblicuo externo con la edición 4.0. Los lóbulos 3.0 mantienen sus coordenadas originales en ese marco.

Se aplicaron materiales marfil, rojos musculares y colores propios para órganos. Los 64 nodos de huesos, músculos y órganos tienen WebP con cámara ortográfica, iluminación de estudio, fondo transparente y hasta 572 píxeles en el eje largo. Se añadieron carpos, metacarpianos, falanges de mano, tarsos, metatarsianos y falanges de pie de ambos lados, a partir de elementos de la edición 4.0. Los pies tienen una vista oblicua en cámara para mostrar los huesos largos y una vista frontal de demostración. Las manos y los pies se mueven como conjuntos en vivo. El contorno de demostración se obtuvo de la superficie BodyParts3D `FJ2810` y se muestra tenue detrás de las capas. El mapa de anclajes se estimó a partir de los extremos de los huesos de referencia, con ojos, orejas y centro torácico calibrados en la misma escala. Los anclajes de dedos del modo en vivo se toman de las falanges del índice, meñique y pulgar. Los pies se orientan con calcáneo y punta. `spriteAnchors` conserva la proyección oblicua de ambos pies sin alterar sus posiciones 3D en `anchors`.

Los tres GLB, el WebP del contorno, los WebP por pieza y los anclajes son artefactos derivados. Para regenerarlos con las descargas originales y `cwebp`, ejecutar Blender en segundo plano con [prepare-bodyparts3d.py](../../scripts/prepare-bodyparts3d.py) según el encabezado del script. El ensamblado editable queda en el directorio de fuentes ignorado.
