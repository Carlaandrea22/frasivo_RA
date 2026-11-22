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

## Partes y pronunciación en el catálogo actual

Las diez fichas del catálogo tienen partes seleccionables. Se añadieron
dieciocho al hueso coxal, la rótula, el bíceps, el cuádriceps y los pulmones.
En los huesos y en el lóbulo medio derecho, algunos límites del resaltado
son orientativos. La ficha conserva su estado y fuentes para la revisión
profesional. El catálogo muestra las miniaturas y los nombres.

Los 55 términos de Explorar incluyen [audio sintetizado con voz femenina en
inglés estadounidense](../../src/content/anatomy/pronunciacion/README.md).

## Ampliación de Explorar 3D

El catálogo pasa de diez a dieciocho fichas. Se añadieron el cúbito, el peroné,
el esternón, el deltoides, el tríceps braquial, el gastrocnemio, el estómago y
los riñones. Se reutilizaron los modelos de BodyParts3D que ya estaban en el
repositorio. Las ocho fichas incluyen 23 partes o regiones seleccionables y
31 clips de pronunciación nuevos en inglés estadounidense.

Las ocho estructuras se pueden elegir en «Ubica las partes» y «Señala la
estructura». La cabeza medial del tríceps queda disponible para explorar y
ubicar con etiquetas porque su posición profunda dificulta tocarla en el
modelo. El modelo de los riñones muestra ambos órganos por fuera. Los
límites del cúbito, el peroné y el estómago son orientativos.

- [Estómago a 375 px](../capturas/carla/atlas-ampliado-estomago-375.png) y [catálogo de órganos en escritorio](../capturas/carla/atlas-ampliado-organos-1440.png).

## Retos de anatomía · etapa 2

El catálogo de retos incluye cuatro tipos de actividad sobre huesos, corazón y
músculos. Entrenamiento ofrece pistas y reintentos. Evaluación guarda la
corrección para el resultado. Los resultados conservan los errores de los
reintentos para repasar, aunque el puntaje usa la respuesta final.

Mi progreso recibe aciertos, errores, pistas, modo y evaluación a través del
registro compartido. Para enlazar al detalle desde Mis prácticas durante la
integración con Nicolás, usa la ruta
`#practicar/retos/:activityId/resultado/:eventId` con el ID del evento
`practice`. El detalle se guarda en el dispositivo que completó el intento.
El catálogo de retos ya enlaza al último resultado de cada actividad.

Los retos incluyen fuentes y conservan el estado provisional hasta la
revisión profesional. Las actividades de selección usan los modelos 3D ya
disponibles en Explorar.

La compilación, 53 pruebas unitarias y 27 pruebas de navegador pasaron.
Las cuatro pruebas de Retos también pasaron tras ajustar el enlace de
consulta para conservar el intento abierto durante Entrenamiento.

- Catálogo a [375 px](../capturas/carla/retos-catalogo-375.png) y en [escritorio](../capturas/carla/retos-catalogo-1440.png).
- Colocar etiquetas a [375 px](../capturas/carla/retos-ubica-375.png) y en [escritorio](../capturas/carla/retos-ubica-1440.png).

### Ampliación de «Ubica las partes»

El reto original del fémur mantiene su enlace. Hay tres retos adicionales
con un modelo por ronda y un resultado para el reto completo. Huesos pasa
por tibia, húmero, radio, hueso coxal y rótula. Músculos usa bíceps y
cuádriceps. Órganos usa las cuatro cámaras del corazón y los cinco lóbulos
pulmonares. Las etiquetas usan los anclajes de Explorar.

La tarjeta principal de «Ubica las partes» reúne los diez modelos y los
tres recorridos. El selector ofrece practicar un modelo concreto, completar
un recorrido o elegir un modelo al azar al empezar. Los enlaces desde
Explorar preseleccionan la estructura cuando corresponde.

### Ampliación de «Señala la estructura»

La actividad usa el mismo selector de modelos, recorridos y selección al
azar. Hay consignas para los diez modelos del atlas. Se reutilizan las
mallas seleccionables de Explorar y las preguntas originales del corazón.
Las consignas del cuádriceps se limitan a las porciones accesibles al
tocar el modelo. El vasto intermedio queda disponible en «Ubica las partes».

- Selector de «Señala la estructura» a [375 px](../capturas/carla/retos-senala-selector-375.png) y en [escritorio](../capturas/carla/retos-senala-selector-1440.png).

### Ampliación de «Relaciona estructura y función»

La tarjeta abre un selector de temas de huesos, músculos y órganos. La
opción «Aleatorio» elige un tema al empezar. Las parejas usan las funciones
de las fichas del atlas. Se conserva el reto original del fémur y su enlace.

El reto muestra una estructura a la vez con las funciones disponibles debajo.
Al elegir, guarda la pareja y pasa a la siguiente estructura. Las parejas se
pueden revisar y editar antes de confirmar. Si la nueva función ya pertenece
a otra estructura, el reto indica con cuál se van a intercambiar las funciones.

- Selector de «Relaciona estructura y función» a [375 px](../capturas/carla/retos-relaciona-selector-375.png) y en [escritorio](../capturas/carla/retos-relaciona-selector-1440.png).
- Reto en curso a [375 px](../capturas/carla/retos-relaciona-parejas-375.png) y en [escritorio](../capturas/carla/retos-relaciona-parejas-1440.png).

### Ampliación de «Repaso breve»

El catálogo reúne las preguntas de opción múltiple en una sola tarjeta.
Se puede elegir huesos y articulaciones, músculos en acción o corazón y
respiración. «Aleatorio» elige uno de esos temas. El repaso muscular conserva
su enlace, sus preguntas y sus resultados previos.

- Selector de «Repaso breve» a [375 px](../capturas/carla/retos-repaso-selector-375.png) y en [escritorio](../capturas/carla/retos-repaso-selector-1440.png).

### Práctica con las ocho fichas nuevas

«Relaciona estructura y función» y «Repaso breve» incluyen tres temas nuevos.

- Cúbito, peroné y esternón
- Deltoides, tríceps y gastrocnemio
- Estómago y riñones

Cada ficha aporta una pareja en Relaciona y una pregunta de opción múltiple
en Repaso. Los temas aparecen en su categoría y «Aleatorio» también puede
elegirlos. Al entrar desde una ficha nueva, el selector preselecciona el tema
que incluye esa estructura.

### Cráneo, columna, cerebro, hígado e intestinos

Explorar reúne 24 fichas. Las seis últimas incorporan partes y regiones
seleccionables con etiquetas bilingües, audio y fuentes. El hígado incluye
dos porciones funcionales y el lóbulo caudado. El cambio de tramo en el ciego
y el colon sigmoide es orientativo.

Los seis modelos se pueden elegir en «Ubica las partes» y «Señala la
estructura». En «Relaciona estructura y función» y «Repaso breve» aparecen
los temas «Cráneo y columna vertebral» y «Cerebro, hígado e intestinos». Los
selectores también pueden elegirlos al azar.

- [Cerebro a 375 px](../capturas/carla/atlas-cerebro-375.png) y [colon sigmoide resaltado en escritorio](../capturas/carla/atlas-intestino-grueso-1440.png).

El cráneo incluye la mandíbula y la columna abarca desde el atlas (C1)
hasta el cóccix. El atlas, el axis (C2) y el cóccix se eligen por separado
en la ficha y en los retos «Ubica las partes» y «Señala la estructura». Los
dos modelos tienen siete partes seleccionables cada uno. El límite del
resaltado entre el sacro y el cóccix es orientativo.

- [Mandíbula resaltada en móvil](../capturas/carla/atlas-mandibula-375.png) y [columna con el cóccix resaltado en escritorio](../capturas/carla/atlas-columna-completa-1440.png).
