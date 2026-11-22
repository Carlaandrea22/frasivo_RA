# Etapa D · Diez fichas de músculos

Se incorporan pectoral mayor, trapecio, recto del abdomen, oblicuo externo, dorsal ancho, glúteo mayor, isquiotibiales, tibial anterior, esternocleidomastoideo y diafragma. Sus 32 partes incluyen ubicación, función, fuentes y pronunciación. El contenido queda provisional. Retos ofrece tres recorridos regionales y Repaso breve incluye una pregunta por músculo.

Los 22 OBJ de superficie vienen del paquete BodyParts3D 3.0 `obj_95`. Las tres porciones del pectoral mayor izquierdo y las tres del trapecio izquierdo están separadas en origen. La cabeza corta del bíceps femoral acompaña la ficha de isquiotibiales como referencia. [Manifiesto de cada OBJ](../../../../../scripts/explorar-detail-sources.json) · [Archivo BodyParts3D 3.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/)

Cada lado del recto del abdomen se selecciona como una superficie. Las regiones humerales del dorsal ancho rodean el extremo estrecho de la malla. La distancia entre los pares de vértices más próximos al húmero fue de 0,123 mm a la izquierda y 0,133 mm a la derecha. Las regiones superior e inferior del oblicuo y del glúteo, el extremo distal del tibial y el centro tendinoso del diafragma son orientativos. El esternocleidomastoideo izquierdo señala las dos ramas libres y conserva el tronco común como contexto. [Referencias de los músculos axiales](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax)

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. [Licencia oficial](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)

Las 42 pronunciaciones reutilizan ocho clips y agregan 34 con Piper `en_US-ljspeech-medium`, `length_scale=1.12`, MP3 mono a 22.050 Hz y 48 kbps. Se comprobaron los SHA-256 de los 273 clips que ya estaban en la rama.

## Rendimiento y capturas

Las 44 fichas cumplieron el presupuesto de giro. La medición usa Chrome 157 en Metal, CPU 4× y viewport de 375 × 812 px con las regiones y etiquetas activas. El mínimo fue **59,97 FPS** y el p95 máximo fue **17,90 ms**. La precarga final ocupa **19.399.665 bytes**. [Mediciones de las 44 fichas](giro-44-fichas.csv)

| Ficha nueva | Triángulos | GLB (kB) | FPS | p95 (ms) | Captura a 375 px |
| --- | ---: | ---: | ---: | ---: | --- |
| Pectoral mayor | 39.990 | 266,36 | 60,00 | 17,50 | [Abrir](ficha-pectoralis_major.png) |
| Trapecio | 39.991 | 370,11 | 59,99 | 17,60 | [Abrir](ficha-trapezius.png) |
| Recto del abdomen | 39.994 | 406,93 | 59,99 | 17,70 | [Abrir](ficha-rectus_abdominis.png) |
| Oblicuo externo del abdomen | 39.991 | 511,67 | 59,99 | 17,60 | [Abrir](ficha-external_oblique.png) |
| Dorsal ancho | 39.991 | 545,24 | 60,02 | 17,80 | [Abrir](ficha-latissimus_dorsi.png) |
| Glúteo mayor | 39.995 | 279,56 | 59,99 | 17,40 | [Abrir](ficha-gluteus_maximus.png) |
| Isquiotibiales | 39.986 | 382,23 | 59,99 | 17,60 | [Abrir](ficha-hamstrings.png) |
| Tibial anterior | 39.981 | 314,35 | 60,02 | 17,50 | [Abrir](ficha-tibialis_anterior.png) |
| Esternocleidomastoideo | 39.997 | 246,77 | 59,99 | 17,40 | [Abrir](ficha-sternocleidomastoid.png) |
| Diafragma | 39.997 | 265,63 | 60,01 | 17,60 | [Abrir](ficha-diaphragm.png) |

La miniatura del pectoral mayor se guarda al abrir el catálogo y queda disponible sin conexión. Las miniaturas nuevas que se emiten como archivos de Explorar quedan fuera de la precarga inicial.

Pasaron el build, las 182 pruebas unitarias y las 116 pruebas de navegador. Las comprobaciones de precarga, audio, Retos y Repaso forman parte de la misma pasada.
