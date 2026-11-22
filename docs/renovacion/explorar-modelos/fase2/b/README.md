# Etapa B · Modelos de detalle para las 24 fichas

Se conservan los 24 IDs de ficha y de nodo raíz y los 98 IDs de parte y anotación. Las pruebas decodifican los GLB y comparan el número de caras, el área, los límites y la ausencia de caras duplicadas con la superficie preparada. El anclaje más alejado de su malla tras cuantizar quedó a 7,5 µm. El corte de corazón conserva las mismas 15 mallas. [Fuentes y decisiones por ficha](FUENTES.md)

Se midió el giro en el build de producción con Chrome 157, Metal en Apple M5 Pro y CPU 4×. El viewport táctil fue de 375 × 812 px, con DPR 3 y lienzo limitado a 2. Cada ficha giró un segundo de calentamiento y tres segundos de muestreo, con las regiones y etiquetas activas y el BVH instalado. La base corresponde al correctivo de la etapa A `72c6515`. [Mediciones de la etapa A](../a/README.md)

Las 24 fichas superaron 30 FPS y quedaron bajo 33,3 ms de p95. El mínimo fue 59,99 FPS y el p95 más alto fue 18,70 ms. El GLB más pesado ocupa 648.080 bytes. La precarga de la aplicación ocupa 17.922.847 bytes. Los 187 clips Piper existentes conservan sus SHA-256.

| Ficha | Fuente | Triángulos antes → después | GLB (kB) | FPS | p95 (ms) | Capturas a 375 px |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Fémur | 3.0 | 3.204 → 13.202 | 77,56 | 60,00 | 18,30 | [Antes](antes/ficha-femur.png) · [Después](despues/ficha-femur.png) |
| Tibia | 3.0 | 1.692 → 6.822 | 43,62 | 60,01 | 18,50 | [Antes](antes/ficha-tibia.png) · [Después](despues/ficha-tibia.png) |
| Húmero | 3.0 | 3.700 → 16.492 | 93,77 | 60,03 | 18,50 | [Antes](antes/ficha-humerus.png) · [Después](despues/ficha-humerus.png) |
| Radio | 3.0 | 632 → 2.714 | 20,26 | 59,99 | 18,50 | [Antes](antes/ficha-radius.png) · [Después](despues/ficha-radius.png) |
| Hueso coxal | 3.0 | 2.332 → 9.470 | 59,77 | 60,02 | 18,40 | [Antes](antes/ficha-pelvis.png) · [Después](despues/ficha-pelvis.png) |
| Rótula | 3.0 | 310 → 1.338 | 13,12 | 60,03 | 18,30 | [Antes](antes/ficha-patella.png) · [Después](despues/ficha-patella.png) |
| Cúbito | 3.0 | 824 → 3.538 | 25,11 | 60,00 | 18,00 | [Antes](antes/ficha-ulna.png) · [Después](despues/ficha-ulna.png) |
| Peroné | 3.0 | 1.124 → 4.544 | 29,21 | 59,99 | 18,30 | [Antes](antes/ficha-fibula.png) · [Después](despues/ficha-fibula.png) |
| Esternón | 3.0 | 2.499 → 35.884 | 206,82 | 59,99 | 18,70 | [Antes](antes/ficha-sternum.png) · [Después](despues/ficha-sternum.png) |
| Cráneo | 3.0 | 16.977 → 59.938 | 648,08 | 60,01 | 18,00 | [Antes](antes/ficha-skull.png) · [Después](despues/ficha-skull.png) |
| Columna vertebral | 3.0 | 15.870 → 59.924 | 452,40 | 60,01 | 18,60 | [Antes](antes/ficha-spine.png) · [Después](despues/ficha-spine.png) |
| Bíceps braquial | 3.0 | 3.266 → 39.995 | 257,36 | 60,02 | 18,30 | [Antes](antes/ficha-biceps_brachii.png) · [Después](despues/ficha-biceps_brachii.png) |
| Cuádriceps femoral | 3.0 | 4.797 → 39.986 | 406,35 | 60,00 | 17,80 | [Antes](antes/ficha-quadriceps_femoris.png) · [Después](despues/ficha-quadriceps_femoris.png) |
| Deltoides | 3.0 | 4.797 → 39.991 | 255,86 | 60,02 | 17,40 | [Antes](antes/ficha-deltoid.png) · [Después](despues/ficha-deltoid.png) |
| Tríceps braquial | 3.0 | 4.800 → 39.990 | 258,05 | 60,01 | 17,70 | [Antes](antes/ficha-triceps_brachii.png) · [Después](despues/ficha-triceps_brachii.png) |
| Gastrocnemio | 3.0 | 4.800 → 39.989 | 258,46 | 60,03 | 17,50 | [Antes](antes/ficha-gastrocnemius.png) · [Después](despues/ficha-gastrocnemius.png) |
| Corazón | Corte LumAR | 16.604 → 16.604 | 129,20 | 60,03 | 17,60 | [Antes](antes/ficha-heart.png) · [Después](despues/ficha-heart.png) |
| Pulmones | 3.0 | 18.497 → 39.986 | 333,48 | 59,99 | 17,90 | [Antes](antes/ficha-lungs.png) · [Después](despues/ficha-lungs.png) |
| Estómago | 3.0 | 1.810 → 9.384 | 53,10 | 60,00 | 17,40 | [Antes](antes/ficha-stomach.png) · [Después](despues/ficha-stomach.png) |
| Riñones | 3.0 | 5.292 → 27.752 | 138,68 | 60,00 | 17,90 | [Antes](antes/ficha-kidneys.png) · [Después](despues/ficha-kidneys.png) |
| Cerebro | 4.0 | 16.991 → 39.826 | 449,01 | 60,01 | 17,40 | [Antes](antes/ficha-brain.png) · [Después](despues/ficha-brain.png) |
| Hígado | 3.0 | 10.484 → 19.416 | 104,41 | 60,00 | 17,40 | [Antes](antes/ficha-liver.png) · [Después](despues/ficha-liver.png) |
| Intestino delgado | 3.0 | 13.000 → 39.993 | 254,63 | 60,02 | 17,60 | [Antes](antes/ficha-small_intestine.png) · [Después](despues/ficha-small_intestine.png) |
| Intestino grueso | 4.0 | 9.950 → 39.855 | 362,27 | 60,00 | 18,00 | [Antes](antes/ficha-large_intestine.png) · [Después](despues/ficha-large_intestine.png) |

El build, las 162 pruebas unitarias y las 110 pruebas de navegador pasaron. La primera pasada de navegador registró un fallo de Pose Full al fijar una captura sin conexión. Esa prueba pasó las tres repeticiones aisladas y la segunda pasada completa con los mismos límites y comprobaciones.

Las capturas muestran la ruta real de Explorar 3D a 375 px con las etiquetas activas. El informe de fuentes identifica las regiones donde el límite anatómico sigue siendo provisional.
