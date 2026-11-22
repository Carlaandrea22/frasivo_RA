# Explorar 3D · Fase 2, etapa A

## Protocolo

- Aplicación compilada para producción con Vite. Cada muestra abrió la ficha real desde su ruta `/#explorar/estructura/<id>` en un perfil nuevo, con las regiones seleccionables y las etiquetas activadas. Las fichas se enumeraron desde el catálogo.
- Chrome 157.0.8103.79 sin interfaz, en macOS arm64 con GPU Apple M5 Pro mediante ANGLE Metal. Emulación táctil de 375 × 812 píxeles CSS, DPR del dispositivo 3 y tope del visor 2. El escenario mide 341 × 447 píxeles CSS y el lienzo dibuja a 682 × 894 píxeles.
- CPU ralentizada 4× mediante CDP. Tras un segundo de giro de calentamiento, se restableció la vista y se midieron tres segundos de giro, con una pulsación de flecha izquierda por `requestAnimationFrame`. Los FPS cuentan dibujos reales del visor por segundo. Para el p95 se tomó el percentil 95 de los intervalos entre inicios de dibujo consecutivos.
- Los triángulos se contaron en la escena del GLB que descargó cada ficha. El peso corresponde al archivo completo comprimido con Meshopt, en kB decimales (1 kB = 1.000 B). Los límites de la etapa son 40.000 triángulos por ficha habitual, 60.000 por ficha compleja y 800 kB por GLB. El mínimo durante el giro es 30 FPS con p95 ≤ 33,3 ms.

La emulación ralentiza la CPU del navegador y utiliza la GPU de escritorio.

## Configuración técnica

El visor carga `three-mesh-bvh` 0.9.18 (MIT) con Three 0.187.0. Construye los árboles de oclusión al cargar la malla y los libera al desmontar. Calcula la posición de las etiquetas en cada dibujo y comprueba la oclusión unas 15 veces por segundo durante el giro, con una última comprobación al detenerse. El clic sigue usando el raycast nativo. [three-mesh-bvh 0.9.18](https://www.npmjs.com/package/three-mesh-bvh/v/0.9.18)

Explorar aplica RoomEnvironment y PMREM local, tone mapping ACES y salida sRGB. Los 24 GLB de la capa `explore` se cargan bajo demanda y se decodifican con el Meshopt incluido en Three. La compilación precarga **16.657.406 bytes**. Los hashes SHA-256 de los 187 clips MP3 existentes coinciden con `04dda26`.

## Las 24 fichas

Las 24 fichas sirvieron 24 GLB comprimidos distintos. El mayor peso fue de **116,880 kB** (corazón) y el mayor recuento fue de **18.497 triángulos** (pulmones). Durante el giro, el mínimo fue de **59,98 FPS** y el p95 más alto de **17,9 ms**.

| Ficha | Triángulos | kB Meshopt | Regiones | Etiquetas visibles al abrir | FPS | p95 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fémur | 3.204 | 21,200 | 3 | 2 | 60,01 | 17,6 |
| Tibia | 1.692 | 13,472 | 3 | 2 | 60,01 | 17,4 |
| Húmero | 3.700 | 23,036 | 3 | 2 | 60,00 | 17,5 |
| Radio | 632 | 7,516 | 3 | 1 | 60,00 | 17,7 |
| Hueso coxal | 2.332 | 17,740 | 4 | 3 | 60,00 | 17,7 |
| Rótula | 310 | 5,912 | 3 | 2 | 60,00 | 17,8 |
| Cúbito | 824 | 8,428 | 3 | 3 | 60,00 | 17,4 |
| Peroné | 1.124 | 10,268 | 3 | 3 | 60,00 | 17,9 |
| Esternón | 2.499 | 16,876 | 3 | 3 | 60,00 | 17,3 |
| Cráneo | 16.977 | 98,040 | 7 | 4 | 60,01 | 17,8 |
| Columna vertebral | 15.870 | 91,672 | 7 | 7 | 60,00 | 17,4 |
| Bíceps braquial | 3.266 | 20,028 | 2 | 2 | 60,00 | 17,5 |
| Cuádriceps femoral | 4.797 | 29,784 | 4 | 3 | 60,00 | 17,8 |
| Deltoides | 4.797 | 28,116 | 3 | 1 | 60,00 | 17,8 |
| Tríceps braquial | 4.800 | 28,192 | 3 | 2 | 60,00 | 17,6 |
| Gastrocnemio | 4.800 | 27,672 | 2 | 2 | 59,98 | 17,6 |
| Corazón | 16.604 | 116,880 | 15 | 3 | 59,99 | 17,4 |
| Pulmones | 18.497 | 99,044 | 5 | 3 | 60,03 | 17,4 |
| Estómago | 1.810 | 14,800 | 4 | 4 | 60,01 | 17,6 |
| Riñones | 5.292 | 29,332 | 2 | 2 | 60,02 | 17,8 |
| Cerebro | 16.991 | 98,568 | 4 | 3 | 60,01 | 17,9 |
| Hígado | 10.484 | 61,480 | 3 | 2 | 60,00 | 17,4 |
| Intestino delgado | 13.000 | 72,208 | 3 | 2 | 60,00 | 17,4 |
| Intestino grueso | 9.950 | 60,296 | 6 | 5 | 59,99 | 17,5 |

## Comparación del cráneo

El cráneo conserva sus 16.977 triángulos, ocho mallas, siete regiones seleccionables y siete anclajes. La descarga pasa de **1.148,896 kB** del banco compartido en `04dda26` a **98,040 kB** del GLB individual, una reducción de **91,5 %**.

| Compilación | Ronda | FPS | p95 de dibujo (ms) | p50 de proyección durante el dibujo (ms) | Proyección total (ms/s) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Antes | 1 | 59,45 | 18,1 | 13,5 | 805,3 |
| Antes | 2 | 56,91 | 19,2 | 14,0 | 801,0 |
| Antes | 3 | 56,85 | 19,2 | 14,2 | 810,6 |
| Etapa A | 1 | 60,01 | 17,8 | < 0,1 | 5,1 |
| Etapa A | 2 | 60,01 | 17,2 | < 0,1 | 4,8 |
| Etapa A | 3 | 60,02 | 17,9 | < 0,1 | 5,1 |

La proyección total suma el tiempo síncrono de las llamadas de proyección por segundo, entre dibujos además de durante el dibujo cuando hay una actualización de oclusión programada. La compilación anterior ya cumplía el piso en producción, con una mediana de proyección de 14,0 ms durante el dibujo. El BVH reduce el costo de cada prueba y el muestreo de oclusión limita cuántas se realizan durante el giro.

La comparación interactiva coincide en las etiquetas visibles y su selección en ocho estados del cráneo, con un desplazamiento máximo de 0,002 px CSS en los anclajes. Se comprobó la selección de Mandíbula por etiqueta y por toque sobre su malla, el ocultamiento de etiquetas, el zoom, el restablecimiento y la oclusión del Frontal en la vista posterior. La iluminación de estudio modifica la apariencia de la superficie.

| Antes (04dda26) | Etapa A |
| --- | --- |
| ![Cráneo antes, con el frontal, los cigomáticos, los maxilares y la mandíbula etiquetados](visor-skull-antes.png) | ![Cráneo con iluminación de estudio y las mismas cuatro etiquetas visibles](visor-skull-despues.png) |

## Capturas del atlas a 375 px

| Fémur | Bíceps braquial | Hígado |
| --- | --- | --- |
| ![Fémur con cabeza y cóndilos etiquetados](visor-femur-despues.png) | ![Bíceps con cabeza corta y cabeza larga etiquetadas](visor-biceps_brachii-despues.png) | ![Hígado con las dos porciones hepáticas etiquetadas](visor-liver-despues.png) |
