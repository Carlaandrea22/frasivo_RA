# Plan de renovación · Inglés técnico de anatomía

**Objetivo.** Aprender vocabulario anatómico en inglés al explorar un modelo 3D, leer y escuchar sus fichas y practicar. El primer sistema es el cardiovascular. La arquitectura admite otra área, como Química, mediante un catálogo y modelos propios.

**Rama de trabajo.** `renovacion-anatomia` parte de `Luis` en `28d5d2b`. La preparación cubre el modelo de prueba y este plan. Las etapas de implementación requieren aprobación. El trabajo se mantiene local hasta que el usuario solicite un commit o un push.

## Decisiones aprobadas

- React, TypeScript, Vite y Three.js directo. Se mantienen Vitest y Playwright para las nuevas pruebas. La primera versión usa las dependencias existentes. Fiber, drei, model-viewer, XR y vite-plugin-pwa quedan fuera.
- PWA instalable con el service worker propio. El modo offline cubre el visor 3D, el catálogo, las fichas, los ejercicios y el progreso una vez descargado el contenido. La disponibilidad de voces y el lanzamiento de AR sin red dependen del dispositivo.
- Scene Viewer en Android compatible con `.glb` por HTTPS. Quick Look en Safari de iPhone con `.usdz`. El control **Ver en mi espacio** abre el visor nativo. Si el dispositivo no admite AR o el lanzamiento falla, el usuario puede seguir en el visor Three.js. Al regresar se conserva la selección.
- Progreso local versionado por área, grupo y término en `localStorage`. Sincronización entre cuentas y dispositivos queda fuera de alcance. Los datos locales anteriores de Frasivo quedan fuera de la migración.
- Las definiciones y frases clínicas serán originales, en inglés técnico simple. Toda la interfaz estará en español. Pronunciación por gesto con voz del dispositivo y selección preferente de una voz inglesa. `audioSrc` permanece opcional y vacío en esta versión. Si la voz falla, se informa en la ficha y se conserva el texto.
- El catálogo publicado de práctica empieza con las **15 piezas visibles** del modelo. Los términos coronarios e internos quedan en una lista con la etiqueta **Pendiente de modelo**. Quedan fuera de la selección 3D y los ejercicios hasta que exista su pieza.
- La pantalla **Créditos** citará a J. Gordon Betts y colaboradores, *Anatomy and Physiology 2e*, OpenStax, sección 19.1. La licencia de la edición web consultada es **CC BY-NC-SA 4.0**. La referencia acredita la consulta bibliográfica. El catálogo, la geometría y las imágenes del proyecto serán originales. [Sección 19.1](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy) · [Licencia declarada por OpenStax](https://openstax.org/books/anatomy-and-physiology-2e/pages/preface)
- Los binarios viven en [assets/anatomy/cardiovascular](../assets/anatomy/cardiovascular/README.md), una ruta que Git admite. Se usa una copia fuente `.blend` y dos exportaciones del mismo modelo. La app importará únicamente el GLB y el USDZ como URLs de Vite. El `.blend` queda fuera de la precaché y del sitio publicado.
- Un componente `Button` comparte las variantes principal, secundaria, texto, sonido circular, respuesta y navegación. El estilo [A · Suave](muestras/botones-3d.html) usa radio de 16 px, profundidad de 3 px, sombra ambiente `0 2px 4px rgb(24 60 52 / .10)`, pulsación de 3 px sin sombra y transición `100ms ease-out`. Conserva el anillo de foco de 2 px con separación de 3 px, el mínimo de 44 px y la transición desactivada con movimiento reducido. Usar CSS legible con tokens en `:root`, contraste AA, DM Sans, Manrope y la paleta de [DISENO.md](DISENO.md). Los cinco colores base son `#176454`, `#E8F3EC`, `#F8FAF7`, `#183C34` y `#E9C871`.

## Estructura y contratos

| Unidad | Responsabilidad |
| --- | --- |
| `src/ui/Button.tsx` y `src/styles.css` | Componente compartido, estados visuales, paleta y estilos adaptables |
| `src/App.tsx` | Navegación entre Explorar, Practicar, Mi progreso y Créditos |
| `src/content/types.ts` y `src/content/anatomy/cardiovascular.ts` | Contrato común y datos por área. Una futura carpeta `src/content/chemistry/` agrega contenido con el mismo contrato |
| `src/viewer/AnatomyViewer.tsx` y `src/viewer/scene.ts` | Visor reutilizable, carga de GLB, selección por ID, foco visual y liberación de recursos |
| `src/learning.ts`, `src/Practice.tsx` y `src/storage.ts` | Ejercicios puros, UI de práctica y almacenamiento local con validación |
| `src/ar/launch.ts` | Generación segura de los enlaces nativos, retorno al visor y estados de compatibilidad |
| `scripts/build-sw.mjs` y `public/manifest.webmanifest` | Recursos publicados, instalación y actualización de caché |

- Cada término activo tiene `id`, `area`, `groupId`, `level`, `termEn`, `definitionEn`, `translationEs`, `clinicalExampleEn`, `audioSrc?`, `assetId` y `nodeId`. Para este catálogo se usan `anatomy`, `cardiovascular`, y los niveles `intro` y `intermediate`. Por ejemplo, `left_ventricle` enlaza el término *Left ventricle* al nodo homónimo de `heart-cutaway`.
- El manifiesto de modelos resuelve `assetId` a una URL web `.glb`, una URL opcional `.usdz` y metadatos accesibles. La lista de pendientes conserva ID, etiqueta y grupo en una colección separada hasta poder completar su `nodeId`. Incluye vasos coronarios, tabiques, cuerdas tendinosas y músculos papilares.
- El estado de progreso guarda `version` y estadísticas por `area/groupId/id` en una clave del nuevo producto. Distingue estructura visitada de respuesta evaluada y tolera entradas antiguas, corruptas o de otra área sin sobrescribirlas.

## Lista exacta de borrado futuro

La lista corresponde al árbol base `28d5d2b`. Cada ruta de directorio cubre todos sus archivos versionados. En la primera etapa de implementación se extrae el comportamiento reutilizable del visor y la ficha antes de retirar los módulos antiguos. La eliminación se limita a archivos del repositorio. Las bases y volúmenes Docker existentes quedan fuera.

| Área retirada | Rutas exactas |
| --- | --- |
| Backend y contenedores | `server/`, `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example` |
| Cuentas, perfiles, carreras y misiones | `src/auth/`, `src/profile/`, `src/careers/`, `src/missions/` |
| Medicina con cámara corporal | `src/medicine/` |
| Exploración de software y cámara sin detector | `src/objects/` una vez extraído el visor reutilizable |
| Detección de objetos y catálogo anterior | `src/detector.worker.ts`, `src/useCamera.ts`, `src/objectTracking.ts`, `src/scanning.ts`, `src/overlayLayout.ts`, `src/ObjectOverlay.tsx`, `src/SupportedObjects.tsx`, `src/RoomScene.tsx`, `src/vocabulary.ts` |
| Herramientas específicas del producto anterior | `scripts/prepare-assets.mjs`, `scripts/build-worker.mjs`, `scripts/benchmark-camera.mjs`, `scripts/benchmark-detector.mjs`, `scripts/setup-docker.mjs`, `scripts/test-docker.mjs` |
| Suite anterior y datos de prueba | Todo lo versionado bajo `tests/`. Se sustituye por una suite nueva en ese árbol. |

También se retiran de `package.json` y el lockfile `@mediapipe/tasks-vision`, `connect-pg-simple`, `express`, `express-rate-limit`, `express-session`, `helmet`, `pg` y la dependencia directa `esbuild` del bundle de workers. Se eliminan los scripts `assets`, `postinstall`, `predev`, `prebuild`, `pretest`, `start`, `test:server`, `test:api`, `docker:setup`, `docker:up`, `docker:stop` y `test:docker`, además del proxy `/api` en `vite.config.ts` y de la configuración para el servidor de cuentas en `playwright.config.ts`. El nuevo build excluye descargas antiguas ignoradas y el archivo fuente de Blender incluso si existen en el directorio local. Se actualizan `README.md`, `docs/DISENO.md`, `index.html` y el manifiesto. Los documentos, capturas y benchmarks históricos permanecen como referencia.

## Etapas y verificación

En cada etapa de implementación ejecutar `npm run build`, `npm test` y `npm run test:e2e` con las pruebas nuevas disponibles a ese punto. Guardar capturas en `docs/renovacion/etapa-N-movil.png` a 375 px y `docs/renovacion/etapa-N-escritorio.png`. Marcar la etapa solo al registrar los resultados y pendientes de hardware.

- [x] **0 · Preparación.** Crear el prototipo con corte, 15 nodos seleccionables y materiales simples. Guardar Blender, GLB, USDZ, README y captura. Verificar carga en Three.js, coincidencia exacta de nombres y pesos inferiores a 3 MB. Verificado en Blender 5.2.2 y en Chrome con Three.js r187. Se recuperaron las 15 mallas al volver a importar el USDZ. [Captura de Blender](renovacion/corazon-blender.png) · [Captura de Three.js](renovacion/corazon-threejs.png)
- [ ] **1 · Base de diseño y retirada del producto anterior.** Aplicar la lista de borrado, dejar listas la navegación y la estructura por áreas y crear `Button`. Verificar con una instalación limpia que no se descargan modelos, y con Playwright que el foco se ve, el botón baja 3 px, el deshabilitado no activa la acción, el movimiento reducido se respeta y el diseño a 375 px no desborda.
- [ ] **2 · Visor y selección.** Cargar el GLB, adaptar el render bajo demanda y resaltar la pieza elegida. Probar integridad de IDs y selección por toque, ratón y teclado mediante la lista. Un arrastre debe orbitar sin cambiar la selección. Probar archivo ausente, WebGL no disponible y navegación de salida.
- [ ] **3 · Fichas, audio y créditos.** Publicar las 15 entradas originales, la lista de pendientes y la referencia OpenStax. Probar concordancia `assetId/nodeId`, contenido completo y correcto idioma de pronunciación. En navegador simular voz ausente y confirmar que la ficha sigue disponible.
- [ ] **4 · Ejercicios y progreso.** Generar preguntas solo con términos activos y guardar visitas, intentos y aciertos. Probar puntuación, recarga offline, almacenamiento corrupto o bloqueado y separación entre áreas. Verificar que volver de una ficha conserva el avance.
- [ ] **5 · AR nativa.** Incorporar el control **Ver en mi espacio**. Probar generación de enlace Android y de enlace `rel="ar"` para iPhone, URLs del mismo origen publicadas por HTTPS, comportamiento sin compatibilidad y retorno a la pieza elegida. Confirmar apertura, permisos y colocación en los dispositivos físicos.
- [ ] **6 · PWA offline.** Precargar interfaz, fuentes y paquete cardiovascular, con actualización versionada. Verificar primera preparación online, recarga sin red, persistencia y actualización desde una caché previa. Confirmar que los binarios fuente quedan fuera de `dist`. Actualizar el README, el diseño y el manifiesto.

## Riesgos y validación física

- **Precisión pedagógica.** El prototipo exagera la separación y simplifica cavidades, vasos y válvulas. Revisar nombres, lateralidad y ejemplos antes de publicar. Mantener visible la indicación de que el modelo es esquemático.
- **Nodos perdidos en exportaciones.** Comparar los IDs declarados con los nodos y exigir una malla para cada ID. Ejecutar esta prueba con cada reemplazo del GLB, también después de optimizarlo.
- **Diferencias entre visores.** Solo un Android físico compatible con ARCore y un iPhone físico con Safari permiten comprobar instalación nativa, permisos de cámara, detección de superficie, escala, orientación, colores, colocación y regreso a la PWA. Registrar modelo de teléfono, sistema y navegador. Comprobar además un Android sin AR, la reapertura desde inicio y el resultado al cortar la conexión.
- **Rendimiento y memoria.** Medir en móviles físicos la fluidez táctil, tiempo de carga en red móvil, reanudación tras suspender la app y estabilidad al volver a abrir el visor. La emulación valida dimensiones e interacción básica.
- **Voces, caché y almacenamiento.** En móviles físicos comprobar disponibilidad de voz inglesa por gesto, uso sin red y primera instalación. En pruebas automatizadas simular falta de voz, archivos que no llegaron a caché, actualizaciones de la PWA y almacenamiento bloqueado. El progreso pertenece al navegador o instalación donde se guardó.
