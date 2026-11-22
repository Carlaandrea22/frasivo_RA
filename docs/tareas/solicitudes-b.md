# Solicitudes de Carla a Luis · Explorar 3D

## Visibilidad por oclusión en Viewer3D

`projectAnchors` solo verifica el encuadre y la jerarquía visible. Un punto
tapado por otra superficie sigue teniendo `visible: true`. Se necesita que
el visor compartido pruebe la oclusión con raycasting desde la cámara antes
de emitir `onProject`, con tolerancia para puntos de superficie. No se ha
modificado `src/shared/` para resolverlo desde el módulo B.

## Selección de regiones de un hueso

El corazón tiene quince mallas: sus piezas se seleccionan y resaltan de
forma independiente. Los huesos del atlas tienen una sola malla por hueso.
`selectedNodeId` resalta esa malla completa, no la cabeza, cuerpo o cóndilos.
Los chips y etiquetas seleccionan la parte y destacan su punto; el resaltado
de la región precisa requiere un contrato compartido para regiones/anclajes
o mallas subdivididas, manteniendo los IDs existentes.

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

El avance no cierra los dos pendientes de Viewer3D indicados arriba. La
revisión profesional de todo el contenido y los anclajes sigue pendiente.
