# Rendimiento y límites del reconocimiento

20 de noviembre de 2026. El usuario reportó lentitud y dificultad al reconocer objetos. La captura adjunta sí mostraba un celular con confianza aproximada de 74%; eso no equivale a precisión medida sobre un conjunto de objetos.

## Diagnóstico y mediciones

Se procesó únicamente en el equipo local el área del visor de la captura proporcionada; no se envió a ningún servicio. Los reportes guardan tiempos y etiquetas, no imágenes. Las mediciones con una imagen repetida no sustituyen un benchmark de precisión con cámara real.

| Prueba controlada | Resultado |
| --- | --- |
| Worker original, captura completa, 10 mediciones tras 2 de calentamiento | Mediana 156,4 ms de ida/vuelta; celular con puntuación 0,7588 |
| Pausa original después de cada resultado | 350 ms adicionales; con aquella medición, intervalo estimado de 506 ms, cerca de 2 análisis/s |
| Recorte central con el mismo modelo | El celular no superó el filtro de 0,65; no se adoptó |
| EfficientDet-Lite2, captura completa | Mediana 186,8 ms; el celular no superó el filtro; no se adoptó ni se distribuye |
| Aplicación optimizada con video sintético de la captura, cámara simulada 640 × 480 | Mediana entre resultados 132,7 ms, aproximadamente 7,5 análisis/s; celular presente en 11/11 fotogramas medidos |

Las dos últimas mediciones de velocidad usan entradas y recorridos diferentes: el worker original recibe el recorte de 951 × 711 y la app recibe video de 640 × 480. No se afirma una aceleración de inferencia del modelo ni una mejora porcentual de precisión; la mejora demostrada del flujo consiste en eliminar la espera fija y mantener solo un fotograma en vuelo. El rendimiento cambiará con el dispositivo, la carga del equipo y la cámara.

Reportes: `benchmark-before.json`, `benchmark-focus-before.json`, `benchmark-lite2.json`, `benchmark-camera-after.json`. Los scripts `benchmark-detector.mjs` y `benchmark-camera.mjs` reciben como primer argumento la captura original; las coordenadas de recorte están configuradas específicamente para esa captura, no para imágenes arbitrarias.

## Cambios aplicados

- Intervalo objetivo de 100 ms entre comienzos de análisis, con un mínimo de 16 ms de cesión si el modelo tarda más. No se encolan fotogramas y no se vuelve a analizar un tiempo de video idéntico.
- Lista permitida de las 28 categorías educativas antes del límite de resultados. Personas y clases no utilizadas no ocupan esos resultados; esto no reduce por sí solo el coste de la red neuronal.
- Retención visual máxima de unos 450 ms desde la última detección válida para evitar parpadeos breves. No se eleva la puntuación. Un temporizador independiente elimina etiquetas antiguas aunque no llegue otro resultado.
- Aviso y liberación de recursos si la captura no progresa en 5 s o un análisis no responde en 10 s.
- Indicador de análisis/s y duración de inferencia. La ficha distingue confianza actual de mejor confianza registrada en la sesión.
- Worker versionado con hash por Vite para que una caché anterior no sirva un detector desactualizado. Sigue siendo un worker clásico para el cargador WASM.

El modelo sigue siendo EfficientDet-Lite0 y el mínimo de confianza sigue siendo 65%. No se instaló ni se precarga un modelo más grande.

## Mejorar precisión de verdad

Construir un conjunto de validación con objetos reales del aula, distintas caras del celular, luces, fondos, distancias y ángulos. Medir detecciones correctas, falsas detecciones y objetos omitidos por categoría. Comparar modelos y, si hace falta, entrenar con esas condiciones; elegir por resultados y coste en los dispositivos objetivo. Un porcentaje de confianza alto o un modelo más grande no garantizan una clasificación correcta.

Durante la prueba: mantener el objeto completo, de frente, con buena luz, evitando reflejos fuertes y sin cubrir gran parte con la mano. Usar cámara trasera en el teléfono cuando sea posible. Una vez cargados los recursos, la inferencia es local: la velocidad de internet afecta la descarga inicial, no cada reconocimiento.
