# Medicina: anatomía sobre cámara

## Uso

Con un perfil de Medicina, abre **Medicina** en la navegación o **Explorar anatomía** en el inicio. Elige **Músculos**, **Huesos** u **Órganos**, activa la cámara y apunta a una persona de frente, con buena luz y con hombros y caderas visibles. Encuadra el cuerpo completo para ver brazos y piernas.

Toca una ilustración o el nombre de la lista para leer la descripción en español y escuchar el término inglés. El control de transparencia ajusta la opacidad entre 20% y 100%. Sin cámara se muestra una demostración identificada explícitamente; durante la búsqueda real no se muestra el cuerpo de ejemplo.

## Alcance

- Ilustraciones SVG originales, esquemáticas y articuladas: cuatro estructuras musculares, siete óseas y cinco de órganos. No es un atlas exhaustivo ni incluye modelos 3D.
- MediaPipe Pose Landmarker Lite detecta una persona. El tronco sigue hombros y caderas; extremidades y cráneo usan sus respectivos puntos. No se refleja ni recorta el video: SVG y cámara comparten la proporción de la imagen.
- Los puntos requieren visibilidad >= 0.6. Las estructuras dependientes de puntos ausentes se ocultan. Si falta un tronco fiable, se oculta la superposición completa. Los resultados expiran a los 700 ms sin respuesta y se suavizan únicamente puntos visibles consecutivos.
- La anatomía interna se coloca aproximadamente sobre la postura. No se detectan órganos, huesos ni músculos internos. Vista frontal recomendada: giros, ropa holgada, oclusiones y poca luz reducen la utilidad de la superposición. No es una herramienta clínica.
- El reconocimiento se ejecuta en un Web Worker CPU, con una imagen en vuelo, tamaño de análisis de 640 px y como máximo diez solicitudes por segundo. La velocidad efectiva depende del dispositivo.

## Privacidad y recursos

No se graban, guardan ni envían imágenes. La cámara se solicita solo con el botón; se libera al detener, cambiar de sección, editar perfil, ocultar la página o producirse un error. El worker se termina al abandonar la vista activa. Las voces son las del dispositivo.

`npm run assets` descarga `pose_landmarker_lite.task` al mismo origen y copia los WASM de la dependencia existente. El build genera el worker clásico y su URL versionada. La PWA precarga los recursos del modelo junto con el resto del sitio; el uso offline requiere que esa caché se haya completado y conservado. Cámara requiere HTTPS o localhost.

## Verificación

`tests/anatomy.test.ts` comprueba alineación de hombros/caderas, extremos de segmentos, puntos ausentes, baja visibilidad, coordenadas inválidas y estructuras de cada capa.

`tests/browser/medicine.spec.ts` comprueba controles, selección bilingüe, opacidad, vista móvil y permiso denegado. También usa el modelo real local con una imagen suministrada a una cámara de canvas: detecta una persona, desplaza la superposición al mover la imagen, la oculta al retirar la persona y libera recursos al navegar y editar el perfil. No equivale a una prueba con cámara física.

Resultado de esta sesión (2026-11-21): `npm test`, 45 pruebas aprobadas; `npm run build`, aprobado; `npx playwright test`, 29 aprobadas y 3 omitidas (cuentas reales requieren servidor Docker y `FRASIVO_TEST_URL`). Revisión independiente sin hallazgos importantes. Capturas de escritorio, móvil y seguimiento inspeccionadas. El build mantiene el aviso previo de tamaño del visor Three.js, ajeno a este módulo.

Pendiente: validar precisión, fluidez, consumo y permisos con personas en los Android/iPhone objetivo. No se publicaron cambios ni se probó una cámara física en esta sesión.

## Referencias

[MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) documenta puntos corporales y modos de video. El modelo se obtiene de [Google MediaPipe Models](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task). La imagen de prueba procede de [MediaPipe Assets](https://storage.googleapis.com/mediapipe-assets/pose.jpg); solo se utiliza como fixture de verificación, nunca dentro del producto.
