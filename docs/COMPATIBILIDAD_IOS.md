# Corrección para Chrome en iPhone

20 de noviembre de 2026. El usuario aceptó el permiso de cámara en Chrome de iPhone y recibió el error genérico al cargar/ejecutar el modelo.

## Evidencia

- El enlace HTTPS respondió 200 para la aplicación, el modelo y los archivos JS/WASM del runtime.
- Con el paquete fijado `@mediapipe/tasks-vision@0.10.32` y la identificación de Chrome en iPhone (`CriOS`, `Safari`, sin `Version/`), el worker real falló con `document is not defined`.
- El código del paquete usa esa identificación en su selección automática de canvas. Puede elegir `document.createElement('canvas')` dentro de un worker, donde `document` no existe. No era un rechazo de permisos en esa reproducción.

## Cambio

Se proporciona explícitamente `canvas: new OffscreenCanvas(1, 1)` a `ObjectDetector.createFromOptions`, opción admitida por MediaPipe. Se crea un canvas distinto para cada intento GPU/CPU. No se modificó el modelo, el reconocimiento de clases ni el seguimiento 2D. Si el navegador no ofrece OffscreenCanvas, se informa como limitación de compatibilidad.

El mensaje de error ahora incluye un apartado desplegable «Detalle del error» con el texto del detector, limitado a 600 caracteres y mostrado como texto, sin HTML ni envío a un servidor. Se libera la cámara al fallar.

## Verificación

- La nueva prueba reprodujo primero `document is not defined`.
- Tras el cambio, inicializa el detector real y analiza un fotograma vacío con esa identificación de Chrome en iPhone.
- Otra prueba comprueba diagnóstico visible y liberación de la cámara al fallar.
- `npm test`: 24 pruebas aprobadas.
- `npm run test:e2e`: 11 pruebas aprobadas.
- `npm run build`: aprobado. Worker generado con hash nuevo; enlace actualizado `/?v=5`.

La prueba usa Chromium con una identificación de iPhone para reproducir la rama defectuosa de la biblioteca. **No emula el motor WebKit ni sustituye una prueba en un iPhone físico.** Sigue pendiente la confirmación del usuario en su teléfono. Otras versiones de iOS pueden tener límites diferentes de WebGL/OffscreenCanvas.

Referencias: [opciones de Object Detector](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector), [incidencia de MediaPipe con workers en iOS](https://github.com/google-ai-edge/mediapipe/issues/5292). La evidencia principal de esta corrección es la reproducción con la versión instalada.
