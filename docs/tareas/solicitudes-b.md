# Solicitudes de Carla a Luis · Explorar 3D

## Visibilidad por oclusión en Viewer3D

`projectAnchors` solo verifica el encuadre y la jerarquía visible. Un punto
tapado por otra superficie sigue teniendo `visible: true`. Se necesita que
el visor compartido pruebe la oclusión con raycasting desde la cámara antes
de emitir `onProject`, con tolerancia para puntos de superficie. No se ha
modificado `src/shared/` para resolverlo desde el módulo B.

## Selección de regiones de un hueso · resuelto en Explorar

Explorar ahora usa un GLB derivado de fémur, tibia, húmero y radio con tres
regiones seleccionables por hueso. `selectedNodeId` apunta a la malla de la
parte y resalta solo esa región. Los padres conservan los IDs de los nodos
originales y las fichas conservan sus IDs públicos. El corazón mantiene sus
quince piezas independientes. No se cambió el visor compartido ni Cuerpo.

El generador `node scripts/generate-explorar-regions.mjs` conserva todos los
triángulos originales, sin duplicarlos ni añadir cortes visibles. Los
límites se estiman con máscaras geométricas y siguen pendientes de revisión
profesional. La ficha advierte que el resaltado es orientativo. Procedencia
y licencia del derivado registradas en `assets/anatomy/FUENTES.md`.

## Entrega de etapa 1

Esta entrega contiene diez fichas: seis huesos, dos músculos y dos órganos,
con quince partes del corazón y tres partes de cada uno de cuatro huesos.
Completar las demás piezas corresponde a la etapa 3. El enlace a práctica
abre el reto del fémur cuando existe; los demás abren la lista de retos con
un aviso de disponibilidad en la siguiente etapa. Todo el contenido sigue
provisional y requiere revisión profesional, incluidos los anclajes.

Las miniaturas son derivados de los GLB existentes, generados con
`node scripts/generate-explorar-thumbnails.mjs`: cámara frontal ortográfica,
luces idénticas y WebP RGBA de 256 × 256. No se incorporaron recursos externos.
La atribución de BodyParts3D permanece en `assets/anatomy/FUENTES.md` y se
muestra en las fichas. Las capturas se guardan en `docs/capturas/carla/`.

La rama de trabajo y publicación es `carla`, por indicación expresa de Carla.
No se publica en `Luis`, `main` ni `codex/explorar-retos`.

## Verificación del avance · 21 de noviembre de 2026

- `npm test`: 48 pruebas aprobadas.
- `npm run build`: compilación y precaché de PWA correctos.
- `npm run test:e2e -- --workers=1`: 20 pruebas aprobadas en la ejecución final.
- La prueba existente de Pose Full sin conexión presentó fallos intermitentes
  por insuficientes cuadros en ejecuciones anteriores; pasó por separado y
  en la ejecución completa final. No se modificó Cuerpo ni su prueba.
- Revisión de código independiente sin hallazgos adicionales.
- [Catálogo a 375 px](../capturas/carla/catalogo-huesos-375.png),
  [catálogo en escritorio](../capturas/carla/catalogo-huesos-1440.png),
  [corazón a 375 px](../capturas/carla/corazon-375.png),
  [corazón en escritorio](../capturas/carla/corazon-1440.png),
  [fémur a 375 px](../capturas/carla/femur-375.png) y
  [fémur en escritorio](../capturas/carla/femur-1440.png).

Sigue pendiente la visibilidad por oclusión de Viewer3D indicada arriba. La
revisión profesional del contenido, regiones y anclajes sigue pendiente.

## Verificación del resaltado por región

- `npm test`: 50 pruebas aprobadas, incluida la conservación de todos los
  triángulos originales sin duplicación ni pérdida de superficie.
- `npm run build`: compilación y PWA correctas.
- `npm run test:e2e -- --workers=1`: 22 pruebas aprobadas.
- La comparación de píxeles a 375 y 1440 px comprueba que seleccionar la
  cabeza del fémur cambia la zona superior y no modifica la mitad inferior.
- [Región seleccionada a 375 px](../capturas/carla/femur-region-375.png) y
  [en escritorio](../capturas/carla/femur-region-1440.png).
