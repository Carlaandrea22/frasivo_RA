# Etapa E · Diez fichas de órganos

Las diez fichas incluyen 47 partes seleccionables, anclajes, miniatura, pronunciación y fuentes. El contenido queda provisional. Las fichas se conectan a los cuatro recorridos de órganos de Retos y cada una aporta una pregunta de Repaso breve. [Archivos y licencias](FUENTES.md)

Las comparaciones usan los originales con la misma luz, encuadre y material de referencia. Cada fuente se encuadró por sus propias dimensiones para hacer visible el contorno. Los GLB de la app aplican el color y la rugosidad de cada órgano.

| Ficha | Fuente elegida | Motivo y comparación |
| --- | --- | --- |
| Páncreas | HRA | La silueta conserva cabeza y cola, con cinco regiones nativas. [Comparación](comparaciones/comparacion-pancreas.png) |
| Bazo | HRA | El hilio y las cuatro superficies quedan definidos en nodos separados. [Comparación](comparaciones/comparacion-spleen.png) |
| Laringe | HRA | La epiglotis conserva una superficie continua y los siete cartílagos están separados. [Comparación](comparaciones/comparacion-larynx.png) |
| Vejiga urinaria | HRA | Distingue cúpula, base, cuello, trígono y ambos orificios. La vista oblicua posterior permite inspeccionar los orificios y el trígono. [Comparación](comparaciones/comparacion-urinary_bladder.png) |
| Tráquea y bronquios principales | HRA | Conserva los bronquios principales, la carina y los cartílagos como nodos de origen. [Comparación con 3.0](comparaciones/comparacion-trachea_bronchi.png) · [Comparación con 4.0](comparaciones/comparacion-trachea_bronchi-4.png) |
| Uréteres | HRA | Los dos uréteres conservan un contorno claro y se pueden seleccionar por separado de las pelvis y los cálices. [Comparación](comparaciones/comparacion-ureters.png) |
| Timo | BodyParts3D 3.0 | Los dos lóbulos ya están separados en los OBJ y la superficie aporta detalle. [Comparación](comparaciones/comparacion-thymus.png) |

El esófago y las suprarrenales usan BodyParts3D 3.0. Las tres porciones del esófago se señalan por referencias de la entrada torácica y del hiato. La vesícula y el conducto cístico usan el par 4.0. La distancia mínima entre vértices de la unión es de 0,084 mm con ese par y de 13,496 mm al combinar la vesícula 3.0 con el conducto 4.0. [Comparación de la unión](comparaciones/comparacion-gallbladder.png)

Las 57 pronunciaciones reutilizan dos clips y agregan 55 con Piper `en_US-ljspeech-medium`, `length_scale=1.12`, MP3 mono a 22.050 Hz y 48 kbps. Los nuevos clips se guardan para uso sin conexión al reproducirlos por primera vez. Los 307 clips anteriores conservan sus SHA-256 y se incluyen en la precarga.

## Rendimiento y capturas

Las 54 fichas cumplieron el presupuesto de giro. La medición usa Chrome 157 en Metal, CPU 4× y viewport de 375 × 812 px con las regiones y etiquetas activas. El mínimo fue **59,98 FPS** y el p95 máximo fue **18,00 ms**. La precarga final ocupa **19.458.908 bytes**. [Mediciones de las 54 fichas](giro-54-fichas.csv)

| Ficha nueva | Triángulos | GLB (kB) | FPS | p95 (ms) | Captura a 375 px |
| --- | ---: | ---: | ---: | ---: | --- |
| Páncreas | 38.928 | 198,50 | 60,00 | 17,90 | [Abrir](ficha-pancreas.png) |
| Bazo | 16.872 | 97,56 | 59,98 | 17,40 | [Abrir](ficha-spleen.png) |
| Vesícula biliar | 2.674 | 18,91 | 60,00 | 17,70 | [Abrir](ficha-gallbladder.png) |
| Esófago | 2.642 | 18,87 | 60,00 | 17,80 | [Abrir](ficha-esophagus.png) |
| Tráquea y bronquios principales | 39.983 | 270,27 | 60,00 | 17,80 | [Abrir](ficha-trachea_bronchi.png) |
| Vejiga urinaria | 10.071 | 64,88 | 60,01 | 17,60 | [Abrir](ficha-urinary_bladder.png) |
| Laringe | 13.238 | 83,74 | 60,00 | 17,60 | [Abrir](ficha-larynx.png) |
| Glándulas suprarrenales | 29.662 | 141,34 | 60,00 | 17,80 | [Abrir](ficha-adrenal_glands.png) |
| Uréteres | 39.917 | 237,66 | 60,00 | 17,70 | [Abrir](ficha-ureters.png) |
| Timo | 39.994 | 214,69 | 60,01 | 17,40 | [Abrir](ficha-thymus.png) |

Pasaron la compilación, las 192 pruebas unitarias y las 119 de navegador. Las comprobaciones del catálogo en móvil y escritorio verifican que el filtro muestra las 18 fichas de órganos.
