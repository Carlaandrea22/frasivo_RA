# Verificación — 20 de noviembre de 2026

## Resultados comprobados

- `npm test`: 7 pruebas unitarias aprobadas. Filtrado por confianza y clases, mapeo de etiquetas, preguntas, normalización de respuestas, puntuación inmutable, almacenamiento corrupto y almacenamiento bloqueado.
- `npm run build`: TypeScript y build de Vite aprobados; worker clásico compilado por esbuild; service worker generado con 27 recursos propios.
- `npm run test:e2e`: 3 pruebas de Google Chrome aprobadas, 14 segundos en esta ejecución.
  - Nueve preguntas de tres tipos, un fallo intencional: 80 puntos, 89% y persistencia tras recargar.
  - Permiso denegado: mensaje de recuperación. Cancelar mientras el permiso está pendiente: al llegar la captura tardía se detienen sus tracks.
  - Sesión nueva, instalación completa de caché y desconexión de red: recarga, interfaz móvil y práctica funcionan; el worker carga el modelo real y ejecuta inferencia sobre un fotograma vacío sin conexión.
- Prueba adicional de interfaz con captura de canvas: cámara activa, evento `ready`, evento `results`, ningún falso positivo en fotograma vacío, tracks terminados al pulsar Detener.
- Revisión visual en escritorio y viewport 390 × 844: sin desbordamiento horizontal. Capturas: `preview-desktop.png`, `preview-mobile.png`.
- Revisión independiente de código: sin hallazgos importantes. Se completó este documento, que faltaba al iniciar la revisión.

## Problemas corregidos durante la verificación

1. MediaPipe 0.10.32 requiere `importScripts` para cargar su runtime WASM. El worker modular fallaba con `self.import is not a function`. Se sustituyó por un bundle clásico de esbuild, utilizado tanto en desarrollo como en producción. La prueba de navegador ejecuta el modelo real para detectar regresiones.
2. El servidor de preview devuelve `Vary: Origin`. Las solicitudes de módulos y CSS no coincidían con la precaché al recargar offline. La caché exclusiva de recursos públicos propios ahora ignora Vary al buscar una coincidencia. La prueba utiliza un contexto nuevo y recarga offline para reproducir el caso real.

## Pendiente de dispositivo real

- Precisión de los ocho objetos admitidos en distintas condiciones de luz, distancia y oclusión.
- Cámara trasera y permisos en los Android/iPhone objetivo; consumo, temperatura y fluidez.
- Audio con voces reales del sistema, disponibilidad sin conexión y comportamiento tras interrupciones.
- Instalación desde la pantalla de inicio en Android y Safari iOS.
- HTTPS y política de caché del alojamiento final; integración con el service worker de Frasivo.

Las capturas controladas y el viewport móvil no sustituyen las pruebas físicas. No hay validación sobre el repositorio de Frasivo porque aún no se dispone de él.

## Ampliación del catálogo

El usuario confirmó que el reconocimiento ya muestra el recuadro y el nombre durante su prueba. Se amplió el mapeo de 8 a 28 categorías automáticas y el catálogo a 32 palabras. Banknote y Pen se añadieron solo a la práctica manual; Door y Lamp siguen siendo manuales. No se cambió el modelo ni el umbral de confianza, ni se promete precisión sobre todos los objetos nuevos.

- `npm test`: 10 pruebas aprobadas, incluidas las categorías nuevas, exclusión de billetes/lapiceros como detecciones y artículos/plurales correctos en ejercicios.
- `npm run build`: aprobado.
- La prueba de interfaz adicional comprueba la lista ampliada, la ficha manual de billete y la distinción «Con cámara» / «Solo manual».
- Actualización accesible en `/?v=2` para obtener el HTML nuevo incluso si la caché conserva la portada anterior.

## Optimización de respuesta

- `npm test`: 14 pruebas aprobadas. Nuevas pruebas de cadencia, retención visual, confianza/posición actuales y lista permitida.
- `npm run build`: aprobado, con worker clásico versionado por hash.
- La prueba de cadencia reproducía un intervalo mediano de 409 ms antes del cambio usando un worker controlado de 50 ms; después pasa el límite de 250 ms y comprueba un solo frame en vuelo.
- La prueba de video congelado reproducía una etiqueta antigua que no desaparecía. Se corrigió con expiración independiente y vigilancia del progreso de captura.
- Revisión independiente detectó ese caso de congelación; no señaló otros problemas importantes de concurrencia, recursos u offline. La corrección se verificó mediante la prueba que primero falló.
- Ver `RENDIMIENTO.md` para la medición controlada de 7,5 análisis/s y para distinguir fluidez de precisión real.

## Nivel 2: interacción sobre el visor

24 pruebas unitarias y 9 de navegador aprobadas, además del build. Se añadieron seguimiento por instancia, etiquetas bilingües y selección/práctica específica, conservando el detector y las funcionalidades anteriores. Incluye prueba de inferencia lenta, dos objetos de la misma clase y selección táctil. Detalle, límites y capturas sintéticas revisadas en `NIVEL2.md`.

## Compatibilidad Chrome en iPhone

Se reprodujo y corrigió `document is not defined` en la selección automática de canvas de MediaPipe dentro del worker. Se añadió un canvas explícito y diagnóstico desplegable. Suite actual: 24 pruebas unitarias, 11 de navegador y build aprobados. Se probó la rama de identificación de Chrome en iPhone en Chromium; pendiente confirmación en iPhone físico. Ver `COMPATIBILIDAD_IOS.md`.

## Misión del aula — 21 de noviembre de 2026

30 pruebas unitarias, 13 pruebas de navegador y build aprobados. Se mantiene la regresión del iPhone y el detector anterior. Nuevas comprobaciones: cuatro secciones, tres objetos, tres ejercicios, audio solicitado por gesto, puntuación sin duplicados, pausa de ejercicios al navegar y 60 puntos guardados. Revisión independiente sin hallazgos importantes. Capturas móviles inspeccionadas. Nuevo recorrido y salida física de audio pendientes de confirmación en el iPhone del usuario; detalle en `MISION_AULA.md`.
