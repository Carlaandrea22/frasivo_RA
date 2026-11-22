# Detección de cuerpo completo en LumAR

## Diagnóstico de la versión base

Base `e014773`, Chrome a 375 × 812 y limitación de CPU 4× vía DevTools. Se alimentó la cámara con las fotos de `tests/fixtures` mediante `canvas.captureStream`. Se guardaron las 33 coordenadas y visibilidades de Pose, el tiempo de inferencia, los motivos del árbitro y los huesos que llegaron al DOM.

- En el retrato frontal original se dibujaron todos los huesos solicitados en 117 de 117 observaciones estabilizadas. Con la imagen al 26 % de luminosidad faltó un pie en 1 de 117, aunque la interfaz seguía indicando «Cuerpo completo».
- En el recorte a la cintura, Pose devolvió rodillas con Y ≈ 1,35 y tobillos con Y ≈ 1,65, ambos con baja visibilidad. Son predicciones fuera del encuadre y deben descartarse. La escena horizontal de MediaPipe mostró el caso inverso con puntos de visibilidad > 0,98 que quedaron fuera por el recorte lateral de la vista vertical.
- La ruta de Cuerpo en vivo pasa por `atlasAlignment.ts` y `regionPolicy.ts`. El primer filtro exige entre 0,52 y 0,65 según la cadena y valida geometría, profundidad y recorte. El árbitro repite los umbrales con valores distintos, vuelve a validar escala y requiere dos observaciones para mostrar una región. Una caída por debajo del umbral de permanencia elimina la región de inmediato. El umbral de `anatomy.ts` pertenece a los transformadores SVG auxiliares. El de `poseProjection.ts` corresponde a la calibración 3D de Fijar.
- «Torso» resume una detección parcial. Los miembros que superan ambas capas siguen siendo elegibles para dibujarse. Durante la primera comprobación de especialistas, la interfaz sí oculta temporalmente el atlas de una pose parcial. El planificador alterna mano, cara y Pose en esas escenas y reduce el número de observaciones corporales por segundo.
- Una sombra graduada desde la cintura, con los pies aún visibles en la foto, reprodujo el fallo en 53 de 53 observaciones. En un cuadro representativo las rodillas quedaron en 0,55/0,66, los tobillos en 0,46/0,58 y los talones en 0,29/0,28. Los cuatro pares de coordenadas estaban dentro del cuadro. Se descartaron a la vez por los umbrales de proyección y del árbitro, aunque las caderas mantenían 0,999 de visibilidad y las piernas conservaban su longitud y dirección. La cámara procesó 4,25 cuadros de Pose/s en esta escena, frente a 9,35 en el frontal sin sombra.

El retrato sentado se usa como control de escala y flexión. La imagen de 623 × 1024 proviene de la Library of Congress y es de dominio público. [Ficha LCCN 99615641](https://commons.wikimedia.org/wiki/File:Full-length_portrait_of_man,_seated,_facing_front_LCCN99615641.jpg).

## Ajustes

- El atlas de huesos comparte con el árbitro los puntos de una cadena frontal validada. Los brazos adquieren seguimiento desde 0,50. Con hombros y caderas fiables, las piernas admiten puntos desde 0,38 cuando los dos tramos cumplen longitud y dirección. Talón y punta tienen umbrales propios y requieren un tobillo y un triángulo del pie coherentes.
- Una cadena ya admitida conserva puntos desde 0,30. Si falta la rodilla o el codo, la estimación usa la proporción del atlas y el doblez observado. Un extremo distal se puede prolongar durante 400 ms a partir de la última cadena confiable. Si el punto sale del rectángulo visible o se pierde la pose, se retira de inmediato. Fijar utiliza las mediciones originales y su propia captura con Pose Full.
- Pose Lite inicia en GPU cuando el worker dispone de WebGL acelerado, con respaldo a CPU. A partir de 9 fps medidos en cuerpo completo y un presupuesto de inferencia de 45 ms, se prueba Pose Full. Lite sigue alimentando el atlas durante el calentamiento. Si Full cae por debajo de 9 fps, supera el presupuesto de 75 ms o pierde el seguimiento durante la prueba, se vuelve a Lite. [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web).
- El recorte a la cintura muestra «Aléjate un poco: se ve solo hasta la cintura». La baja confianza dentro del cuadro conserva el aviso de luz y estabilidad para Fijar.

## Comparación a 375 px con CPU 4×

Se descartaron las primeras cinco observaciones de cada escena para el cálculo. Un cuadro cuenta como completo cuando el DOM contiene cráneo, ambas cajas costales, columna, ambos lados de la pelvis, ambos húmeros, radios, cúbitos, fémures, tibias, peronés y los dos pies. Las cifras son observaciones de Pose por segundo, medidas desde la llegada de los cuadros al navegador.

| Escena | Cuadros completos antes | Cuadros completos después | Pose antes → después |
| --- | ---: | ---: | ---: |
| Frontal | 117/117 (100 %) | 132/132 (100 %) | 9,35 → 10,55 fps |
| Frontal al 26 % de luz | 116/117 (99,1 %) | 134/134 (100 %) | 9,35 → 10,72 fps |
| Frontal con sombra en piernas | 0/53 (0 %) | 133/133 (100 %) | 4,25 → 10,65 fps |
| Vídeo de una persona de pie | 109/114 (95,6 %) | 126/130 (96,9 %) | 9,11 → 10,40 fps |
| Recortado a la cintura | 0/10 | 0/11 | 2,15 → 2,34 fps |

Con la GPU deshabilitada en Chrome, la escena con sombra dio 118/118 cuadros completos a 9,46 fps. El worker reportó Lite/CPU y Full/CPU.

Las capturas frontales muestran el atlas dentro de la silueta visible. En espalda y sentado se conserva la proyección medida. Las comprobaciones de proporción descartan tramos flexionados sin apoyo. El vídeo de prueba usa el tramo de 2 a 11 segundos, reencuadrado desde `[409, 142, 224, 416]` en la fuente de 1024 × 576 y repetido en bucle. Las pruebas corren en Chrome 157 con Apple M5 Pro y limitación de DevTools. La cobertura en otros móviles y con movimientos amplios sigue pendiente. [DVIDS, Star Jump](https://www.dvidshub.net/video/549962/star-jump).

| Escena | Antes | Después |
| --- | --- | --- |
| Frontal | [Captura](antes-frente-375.png) | [Captura](despues-frente-375.png) |
| Poca luz | [Captura](antes-poca-luz-375.png) | [Captura](despues-poca-luz-375.png) |
| Sombra | [Captura](antes-sombra-375.png) | [Captura](despues-sombra-375.png) |
| Cintura | [Captura](antes-cintura-375.png) | [Captura](despues-cintura-375.png) |

Los retratos frontales se toman de la foto de dominio público ya incluida en las pruebas. [Ficha LCCN 2005692477](https://commons.wikimedia.org/wiki/File:Full-length_portrait_of_a_man,_standing,_facing_front_LCCN2005692477.jpg).

Los registros [antes](cuadros-antes.json.gz) y [después](cuadros-despues.json.gz) contienen el tiempo, visibilidad y coordenadas `[x, y, z, visibilidad]` de los 33 puntos, el conjunto dibujado y los descartes `[hueso, etapa, motivo]`. El registro anterior conserva los mensajes y el resultado del navegador. Sus motivos por hueso se reconstruyen sobre los puntos archivados con las reglas originales de Pose y se apoyan en los mensajes originales para los casos con intervención de un especialista. El registro nuevo obtiene los motivos directamente en `?debug=1`.

Para repetir la medición, ejecuta `npm run build`, sirve `npm run preview -- --port 4177 --strictPort` y ejecuta `node tests/cuerpo-deteccion-benchmark.mjs medicion`. Se puede añadir el nombre de una escena y usar `BODY_CPU_ONLY=1` para desactivar la GPU. Los datos crudos se guardan en `.superpowers/cuerpo-deteccion/`.
