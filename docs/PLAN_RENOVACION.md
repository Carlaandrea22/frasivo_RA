# Plan de renovación · Inglés técnico de anatomía

**Objetivo.** Enfocar con el teléfono a una persona y aprender vocabulario técnico en inglés a partir de las capas de huesos, músculos u órganos que siguen su postura. El atlas 3D complementa la cámara y empieza por el sistema cardiovascular. El contrato común permite sumar Química con su propio catálogo y modelos.

**Rama.** `renovacion-anatomia` parte de `Luis` en `28d5d2b`. El respaldo local de la preparación está en `d58edfc`. Este encargo autoriza la corrección del corazón y la Etapa 1. Las etapas siguientes esperan revisión.

## Decisiones aprobadas

- React, TypeScript, Vite y Three.js directo. Se mantienen MediaPipe Pose Lite, `@mediapipe/tasks-vision`, el worker clásico y las capas SVG existentes de `src/medicine/`. Se conservan Vitest y Playwright y no se suman librerías.
- En vertical a 375 px, cámara a pantalla completa y controles inferiores con selector **Huesos**, **Músculos**, **Órganos**, opacidad y **Congelar/Reanudar**. Navegación inferior con **Cuerpo**, **Explorar 3D**, **Practicar** y **Mi progreso**. Créditos se abre desde Mi progreso. Respetar zonas seguras de iPhone y mantener usable el escritorio.
- Un `Button` compartido para principal, secundaria, texto, sonido circular, respuesta y navegación. [A · Suave](muestras/botones-3d.html) fija radio de 16 px, recorrido de 3 px, sombra ambiente `0 2px 4px rgb(24 60 52 / .10)`, pulsación sin sombra en `100ms ease-out`, foco de 2 px con separación de 3 px y altura mínima de 44 px. Desactivar la transición con movimiento reducido. CSS legible, DM Sans, Manrope y tokens en `:root` con `#176454`, `#E8F3EC`, `#F8FAF7`, `#183C34` y `#E9C871`.
- Contenido y fichas en español con términos, definiciones y ejemplos clínicos originales en inglés técnico simple. Pronunciación por gesto con la voz inglesa del dispositivo. `audioSrc` sigue opcional, sin clips en esta versión.
- **Ver en 3D** en la ficha del corazón abre el modelo en corte. **Ver en mi espacio** abre Scene Viewer con GLB por HTTPS en Android compatible o Quick Look con USDZ en Safari de iPhone. Los demás dispositivos siguen en Three.js. Volver conserva la selección.
- PWA instalable con service worker propio. La caché cubre Pose Lite y WASM, el visor, modelos, fichas y ejercicios después de preparar el contenido. Una voz offline y la AR nativa sin red dependen del dispositivo. El progreso se guarda por área, grupo y término en `localStorage` versionado.
- Créditos cita a Betts y colaboradores, *Anatomy and Physiology 2e*, OpenStax, sección 19.1. Presentar **CC BY-NC-SA 4.0** como licencia de la edición web consultada. El material del proyecto será original. [Referencia](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy) · [Licencia declarada](https://openstax.org/books/anatomy-and-physiology-2e/pages/preface)
- Los modelos están en [assets/anatomy/cardiovascular](../assets/anatomy/cardiovascular/README.md). Vite importará el GLB y el USDZ como URLs. La fuente de Blender queda fuera de la distribución.

## Contrato y capas propuestas

El catálogo se organiza por área en `src/content/`. Cada entrada conserva `id`, `area`, `groupId`, `level`, `termEn`, `definitionEn`, `translationEs`, `clinicalExampleEn` y `audioSrc?`. `assetId` + `nodeId` apuntan a la pieza cuando tiene un modelo 3D. Los términos únicamente 2D tendrán un anclaje SVG y carecerán de referencia 3D hasta tenerla. En la capa Órganos, la entrada `heart` enlaza al modelo completo; sus 15 fichas cardiovasculares enlazan nodos precisos. La lista **Pendiente de modelo** mantiene fuera de las vistas y los ejercicios los términos que aún carecen de representación válida, incluidas estructuras coronarias e internas.

| Capa | Propuesta | Referencia geométrica |
| --- | --- | --- |
| Huesos · 14 | `skull`, `mandible`, `clavicle`, `sternum`, `ribs`, `spine`, `pelvis`, `humerus`, `radius`, `ulna`, `femur`, `patella`, `tibia`, `fibula` | Orejas y cara para cabeza, hombros y caderas para tronco, segmentos hombro–codo, codo–muñeca, cadera–rodilla y rodilla–tobillo. Los huesos paralelos se dibujan por separado de forma esquemática en vista frontal. |
| Músculos · 14 | `masseter`, `sternocleidomastoid`, `deltoid`, `pectoralis_major`, `biceps_brachii`, `brachioradialis`, `forearm_flexors`, `rectus_abdominis`, `external_oblique`, `hip_adductors`, `sartorius`, `quadriceps_femoris`, `tibialis_anterior`, `upper_trapezius` | Mandíbula, cuello y hombros, torso frontal y ejes de brazo, antebrazo, muslo y pierna. Se oculta cada dibujo si el segmento o lado correspondiente pierde confianza. |
| Órganos · 12 | `larynx`, `thyroid_gland`, `trachea`, `right_lung`, `left_lung`, `heart`, `liver`, `gallbladder`, `stomach`, `small_intestine`, `large_intestine`, `urinary_bladder` | Cuello, región torácica y regiones abdominal y pélvica estimadas desde hombros y caderas. La superposición representa la región aproximada; Pose Lite estima postura, no localiza órganos reales. |

Quedan como pendientes de representación, entre otros, escápula posterior, tendones pequeños de mano, glúteos, pantorrilla posterior, riñones, páncreas y bazo. Validar las capas nuevas en una vista frontal antes de incorporar otra orientación. Si dos estructuras vecinas no se distinguen con el anclaje disponible, mantener su entrada pendiente.

## Lista exacta de borrado

Cada directorio incluye los archivos versionados en el respaldo `d58edfc`. `src/medicine/` permanece. El hook compartido de cámara se mueve a `src/medicine/useBodyCamera.ts` para conservar permisos y ciclo de vida antes de eliminar el visor anterior. La base del visor se puede consultar después con `git show d58edfc:src/objects/ObjectViewer.tsx`.

| Área retirada | Rutas exactas |
| --- | --- |
| Backend y contenedores | `server/`, `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example` |
| Cuentas, perfiles, carreras y misiones | `src/auth/`, `src/profile/`, `src/careers/`, `src/missions/` |
| Experiencia anterior de software | `src/objects/`, después de mover el hook |
| Detección de objetos y catálogo COCO | `src/detector.worker.ts`, `src/useCamera.ts`, `src/objectTracking.ts`, `src/scanning.ts`, `src/overlayLayout.ts`, `src/ObjectOverlay.tsx`, `src/SupportedObjects.tsx`, `src/RoomScene.tsx`, `src/vocabulary.ts` |
| Práctica y progreso acoplados a COCO | `src/Practice.tsx`, `src/learning.ts`, `src/storage.ts`. El respaldo conserva los patrones de ejercicios y validación para la Etapa 5. |
| Scripts retirados | `scripts/benchmark-camera.mjs`, `scripts/benchmark-detector.mjs`, `scripts/setup-docker.mjs`, `scripts/test-docker.mjs` |
| Suite anterior | `tests/browser/` y `tests/server/` anteriores, `tests/account-repository.test.ts`, `tests/anatomy.test.ts`, `tests/career-profiles.test.ts`, `tests/learning.test.ts`, `tests/mission.test.ts`, `tests/objectTracking.test.ts`, `tests/overlayLayout.test.ts`, `tests/scanning.test.ts`, `tests/software-objects.test.ts`. Se escriben pruebas nuevas y se conserva `tests/fixtures/` para la prueba de cámara con imagen controlada. |

Se conservan `scripts/prepare-assets.mjs`, `scripts/build-worker.mjs`, `@mediapipe/tasks-vision`, `esbuild` y los comandos que generan el worker y preparan el modelo de Pose. De los scripts se retiran exclusivamente EfficientDet y su worker. La preparación de Pose guarda los recursos generados en `public/body-tracking/` para que los archivos ignorados de instalaciones antiguas queden fuera del build. La lista de borrado se limita al repositorio y excluye bases, volúmenes y datos locales.

Se quitan `connect-pg-simple`, `express`, `express-rate-limit`, `express-session`, `helmet` y `pg` del manifiesto y lockfile. Se retiran los scripts `start`, `test:server`, `test:api`, `docker:setup`, `docker:up`, `docker:stop` y `test:docker`, el proxy `/api` y la configuración de Playwright para cuentas reales. Los documentos y capturas históricos permanecen como referencia.

## Etapas y verificación

Después de cada etapa de código ejecutar `npm run build`, `npm test` y `npm run test:e2e`. Guardar capturas a 375 px y en escritorio en `docs/renovacion/`. Marcar la etapa al documentar resultados y verificaciones físicas pendientes.

- [x] **0 · Preparación y corrección del modelo.** Fuente Blender, GLB y USDZ con las 15 piezas. La válvula aórtica se corrigió en la salida del ventrículo izquierdo, en la base de la aorta. La pulmonar queda en la salida del ventrículo derecho, en la base del tronco pulmonar. Three.js r187 conservó los 15 nombres y Blender reimportó 15 mallas del USDZ. [Blender](renovacion/corazon-blender.png) · [Three.js](renovacion/corazon-threejs.png)
- [x] **1 · Base móvil y retirada del producto anterior.** Aplicar el borrado, conservar funcional la cámara y mover su hook. Establecer navegación inferior, zonas seguras, estructura por áreas y un `Button` compartido. Verificar capas y opacidad, rutas de navegación y Créditos, presión de 3 px, foco, deshabilitado, movimiento reducido, objetivos y ancho a 375 px. Confirmar descarga exclusiva de Pose, build sin EfficientDet ni backend, permiso denegado y limpieza al salir. Pasaron el build, 4 pruebas unitarias y 5 de Chrome, incluida la liberación del track y worker tras seguir a una persona de prueba. La demostración recargó sin red. Las capturas verificaron 44 px, contraste mínimo de 6,18:1 en los botones visibles y ausencia de desbordamiento a 375 px. [Móvil](renovacion/etapa-1-movil.png) · [Escritorio](renovacion/etapa-1-escritorio.png)
- [ ] **2 · Visor y selección.** Cargar el GLB con Three.js directo. Seleccionar por toque, ratón y lista accesible, resaltar, girar y acercar. Un arrastre debe orbitar sin cambiar selección. Probar 15 IDs, ausencia de WebGL y error de carga.
- [ ] **3 · Fichas, audio y créditos.** Escribir las 15 fichas cardiovasculares y las nuevas fichas de las capas en inglés original. Validar anclajes, IDs, etiquetas de pendientes y voz inglesa. Incorporar créditos y probar ausencia de audio. La ficha del corazón enlaza al visor completo.
- [ ] **4 · Cámara corporal: capas, Congelar y zoom.** Ampliar las capas SVG y activar **Congelar** solo con una persona detectada y puntos vigentes. Capturar en la resolución intrínseca del flujo (`videoWidth` × `videoHeight`), pedir una resolución alta razonable y asociar los puntos al mismo fotograma. Detener tracks y worker. Conservar la imagen solo en memoria. Aplicar una transformación común a imagen y SVG nítido para pellizco, arrastre de un dedo y doble toque que alterna zoom y encuadre inicial. Abrir ficha al tocar estructura y **Ver en 3D** al tocar el corazón. **Reanudar** y salir descartan imagen y puntos. Probar persona detectada, sin persona, pérdida de puntos, permiso denegado, congelar y reanudar, zoom, arrastre y liberación de cámara y worker al salir. Verificar que no se escribe ni se envía la captura.
- [ ] **5 · Ejercicios y progreso.** Preguntas a partir de términos activos, puntuación y persistencia local por área. Probar recarga offline, datos corruptos o almacenamiento bloqueado y separación entre áreas.
- [ ] **6 · AR nativa.** Probar enlaces HTTPS para Scene Viewer y Quick Look, salida al visor 3D, permiso y retorno con selección. Probar colocación y escala en teléfonos físicos.
- [ ] **7 · PWA offline.** Precargar interfaz, fuentes, Pose y paquete inicial según el presupuesto de caché. Verificar primera preparación, instalación, recarga sin red, actualización desde caché anterior y que la fuente Blender queda fuera del sitio publicado. Actualizar documentación de uso final.

## Riesgos y validación en teléfonos físicos

- **Alineación y rendimiento.** Validar cámara trasera, lente, resolución negociada, encuadre vertical, calor y batería en Android y Safari iPhone. Los puntos estiman postura superficial. Comprobar lateralidad, espejado, oclusión y estabilidad de la imagen congelada.
- **Gestos.** Probar pellizco y doble toque con dedos reales, retorno desde segundo plano, barras dinámicas y zonas seguras. Las pruebas automatizadas comprueban estados, liberación e interacción controlada.
- **Privacidad y permisos.** Confirmar que al reanudar, salir o pasar a segundo plano se libera lo que corresponda a cada estado. Verificar en hardware las señales del sistema y las respuestas a permisos revocados.
- **AR, voz y PWA.** Comprobar arranque de visores nativos, ubicación en superficie, escala, retorno, voz inglesa por gesto y disponibilidad offline. El GLB y el USDZ deben mantener referencias verificables al actualizar el modelo.
