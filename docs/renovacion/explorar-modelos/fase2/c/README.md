# Etapa C · Diez fichas de huesos

El catálogo incorpora clavícula, escápula, costillas, mandíbula, mano ósea derecha, pie óseo derecho, C4, T7 y L3, sacro y cóccix e hioides. Las diez fichas y sus 84 regiones tienen contenido provisional. Los recorridos de hombro y tórax, mano y pie, y cabeza, cuello y columna ofrecen las nuevas fichas en Ubica las partes, Señala la estructura y Relaciona estructura y función. Repaso breve incorpora una pregunta por ficha.

Los 87 OBJ corresponden a BodyParts3D 3.0 `obj_95`. Se verificaron los miembros ZIP, los CRC-32 y los SHA-256. La mano y el pie conservan los 27 y 26 huesos derechos respectivamente. Las falanges se seleccionan por dedo. Cada arco costal conserva su malla. En la quinta costilla izquierda se seleccionan sus cinco regiones por separado. T7 y L3 se disponen lado a lado para comparar sus partes. [Manifiesto de cada OBJ](../../../../../scripts/explorar-detail-sources.json) · [Archivo BodyParts3D 3.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/)

Las regiones de una superficie continua se delimitaron mediante referencias de origen y cortes en las coordenadas OBJ. Las astas menores del hioides y los dos forámenes transversos de C4 son distinguibles en las proyecciones. Las regiones de los forámenes señalan sus bordes óseos. El surco de la quinta costilla y los bordes de algunos forámenes sacros son estimaciones de superficie. El límite sacrococcígeo se trasladó de la referencia 4.0 a la 3.0 en la etapa B. [Registro de la etapa B](../b/FUENTES.md)

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. [Licencia oficial](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)

Las 94 pronunciaciones de estructura y parte reutilizan ocho clips y agregan 86 con Piper `en_US-ljspeech-medium`, `length_scale=1.12`, MP3 mono a 22.050 Hz y 48 kbps. Los 187 clips anteriores conservan sus SHA-256.

## Rendimiento y capturas

Cupieron las 34 fichas en el presupuesto de giro. La medición usa Chrome 157 en Metal, CPU 4× y viewport de 375 × 812 px con las regiones y etiquetas activas. El mínimo fue **59,97 FPS** y el p95 máximo fue **18,60 ms**. La precarga final ocupa **18.845.845 bytes**. [Mediciones de las 34 fichas](giro-34-fichas.csv)

| Ficha nueva | Triángulos | GLB (kB) | FPS | p95 (ms) | Captura a 375 px |
| --- | ---: | ---: | ---: | ---: | --- |
| Clavícula | 10.252 | 59,25 | 59,97 | 18,40 | [Abrir](ficha-clavicle.png) |
| Escápula | 39.993 | 224,22 | 60,00 | 18,10 | [Abrir](ficha-scapula.png) |
| Costillas | 59.923 | 361,98 | 60,00 | 18,40 | [Abrir](ficha-ribs.png) |
| Mandíbula | 21.658 | 117,72 | 60,03 | 18,50 | [Abrir](ficha-mandible.png) |
| Mano ósea derecha | 36.215 | 229,04 | 60,00 | 18,40 | [Abrir](ficha-hand.png) |
| Pie óseo derecho | 56.428 | 367,87 | 60,00 | 18,60 | [Abrir](ficha-foot.png) |
| Vértebra cervical típica | 4.224 | 33,90 | 60,03 | 18,60 | [Abrir](ficha-cervical_vertebra.png) |
| Vértebras torácica y lumbar típicas | 25.490 | 162,31 | 60,02 | 18,50 | [Abrir](ficha-thoracic_lumbar_vertebrae.png) |
| Sacro y cóccix | 39.997 | 247,62 | 60,00 | 18,30 | [Abrir](ficha-sacrum.png) |
| Hioides | 5.534 | 33,46 | 59,99 | 18,50 | [Abrir](ficha-hyoid.png) |

El build, las 172 pruebas unitarias y las 113 de navegador pasaron. La suite abre las diez fichas, verifica los selectores de Retos y completa una pregunta de Repaso por cada hueso nuevo.
