# Explora objetos: Software

Módulo añadido el 21 de noviembre de 2026. Acceso: navegación principal o
barra inferior → Explora objetos. Seleccionar una palabra abre su escena 3D
y ficha. No necesita reconocer palabras ni objetos físicos.

## Contenido

Diez conceptos: Array, Stack, Queue, Thread, Repository, Deployment,
Framework, Middleware, Inheritance y Dependency. Cada ficha contiene IPA,
traducción, significado, ejemplo bilingüe y explicación de la metáfora.
Las escenas son geometría 3D real generada localmente con Three.js.

La pila representa LIFO, la cola FIFO, los hilos representan secuencias de
ejecución y la jerarquía representa herencia. Las representaciones de
conceptos abstractos son metáforas didácticas y se explican como tales.

## Uso

1. Elegir una palabra en la colección Software.
2. Arrastrar sobre el objeto para orbitar la vista. También hay botones de
   giro, tamaño y restablecimiento, utilizables con teclado.
3. Pulsar Activar cámara para verlo sobre el video, o estudiar sin cámara.
4. Pulsar el altavoz para escuchar la palabra o Escuchar frase para el ejemplo.

El vocabulario está precargado. La voz se sintetiza con las voces del
dispositivo; no son grabaciones empaquetadas y no se garantiza audio offline.
La selección no reproduce voz automáticamente. Cambiar de sección o palabra
cancela la reproducción existente.

## Cámara y alcance

La cámara requiere HTTPS o localhost y permiso del usuario. Solo se solicita
video; no se guardan imágenes ni se envían a servidores. No se ejecuta el
detector MediaPipe en este módulo. La cámara sigue abierta al cambiar entre
las diez palabras, y se detiene al salir, cancelar o enviar la app al fondo.
Una autorización que llegue después de cancelar también se libera.

Es 3D sobre cámara: el modelo permanece en pantalla al mover el teléfono.
No hay detección de superficies, anclajes espaciales, profundidad, oclusión
ni seguimiento de objetos reales. Si falta WebGL, queda disponible la ficha
educativa y se muestra un aviso; no se presenta una imagen como si fuera 3D.

## Organización

- `src/objects/catalog.ts`: catálogo bilingüe independiente.
- `src/objects/scenes.ts`: diez modelos geométricos y liberación de recursos.
- `src/objects/ObjectViewer.tsx`: renderizado bajo demanda y controles.
- `src/objects/useObjectCamera.ts`: captura, permisos y limpieza sin detector.
- `src/objects/ExploreObjects.tsx` y `objects.css`: recorrido y presentación.

El módulo y su CSS se cargan de forma diferida al entrar. La caché de la PWA
incluye su código para uso offline tras completar la instalación. Three.js
añade aproximadamente 149 kB comprimidos en el chunk del módulo; Vite emite
una advertencia porque el tamaño sin comprimir supera 500 kB. No bloquea la
compilación ni exige descargar modelos o bibliotecas desde otro origen.

## Validación

Pruebas unitarias del catálogo, geometrías finitas, escenas diferenciadas y
liberación. Pruebas de navegador con WebGL real y cámara controlada: selección
de diez términos, controles, audio por gesto, navegación, permiso denegado,
stream tardío, liberación al salir, segundo plano, falta de WebGL y apertura
offline. Se conserva la suite previa de exploración y misiones.

Las pruebas usan Chrome de escritorio con viewport móvil y captura de canvas.
No sustituyen la comprobación de cámara física, GPU, voces y gestos en los
Android/iPhone objetivo. No se afirma haber escuchado audio en un teléfono.

Resultados finales: `npm test`, 33 pruebas aprobadas; `npm run build`, aprobado; `npm run test:e2e`, 20 pruebas aprobadas. Revisión independiente sin hallazgos importantes; se corrigió el nombre de la ruta del encabezado. Capturas inspeccionadas: `objects-desktop.png`, `objects-mobile.png`, `objects-camera-mobile.png`.
