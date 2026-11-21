# Nivel 2 — etiquetas interactivas 2D

## Análisis y diseño

Solicitud del usuario: evolucionar el visor existente, conservar detección, vocabulario, audio, ejercicios, progreso y tres áreas visuales. Se implementa en la misma PWA independiente; no se dispone del repositorio de Frasivo.

El worker MediaPipe entrega cajas normalizadas respecto a la imagen. `useCamera.ts` filtra y publica resultados; `App.tsx` dibuja botones rectangulares con porcentajes y abre la tarjeta mediante `selectedId`. El video usa `object-fit: fill`, sin espejo: cajas y etiquetas deben usar el mismo sistema normalizado del visor. La deduplicación actual por palabra impide representar dos objetos de la misma clase; debe separarse la identidad espacial del vocabulario único de la sesión.

Alternativas evaluadas: etiquetas DOM sin seguimiento (muy simples, pero identidad y selección inestables); asociación geométrica entre detecciones (elegida para este alcance, sin nuevas dependencias); seguimiento óptico con otro runtime (más coste de CPU y complejidad, no justificado todavía). No hay seguimiento espacial ni anclaje real 3D.

Decisiones de implementación: identidad efímera por sesión de cámara, emparejamiento de la misma clase por solapamiento y distancia con límites de tamaño y suavizado de cajas. La tolerancia empieza en 450 ms y se adapta al intervalo de análisis hasta un máximo de 1500 ms para equipos lentos; al caducar se retira la etiqueta mediante un temporizador independiente. Detecciones casi idénticas se fusionan; objetos separados de la misma clase conservan identificadores distintos. La asociación puede fallar con cruces, oclusión o movimientos bruscos: no se promete reidentificación fuera de la vista.

Las etiquetas DOM contienen inglés, español y confianza, son botones accesibles y permanecen dentro del visor. Un pequeño algoritmo de colocación reduce solapamientos; un conector visual mantiene la asociación con el objeto cuando la etiqueta se desplaza. Solo el objeto seleccionado muestra contorno destacado. En móvil, seleccionar permite ver la tarjeta existente debajo; su acción de práctica usa únicamente esa palabra.

## Plan de implementación

- [x] Pruebas primero: objetos iguales separados, duplicados, orden variable, movimiento, caducidad individual, cajas inválidas y posicionamiento de etiquetas en los bordes.
- [x] Añadir `src/objectTracking.ts` y `src/overlayLayout.ts`; conservar el filtro de confianza y el worker existente.
- [x] Conectar seguimiento y expiración independiente en `useCamera.ts`.
- [x] Crear `src/ObjectOverlay.tsx` y estilos; reutilizar tarjeta y añadir selección por identidad y práctica de una palabra.
- [x] Comprobar desktop y móvil con entradas de cámara controladas: dos sillas, desplazamiento, selección, salida de vista y ejercicios.
- [x] Ejecutar suite unitaria, build, navegador y revisión independiente; documentar resultados y límites.

## Verificación

Resultados observados:

- `npm test`: 24 pruebas aprobadas. Incluyen dos sillas separadas, orden de confianza variable, movimiento suave, objetos de distinta clase, caducidad individual, análisis lentos de 600 ms, cajas inválidas y colocación en un visor de 350 × 263.
- `npm run build`: TypeScript y Vite aprobados. El bundle del worker del detector mantiene el mismo contenido; no se reemplazó el modelo ni se añadieron dependencias.
- `npm run test:e2e`: 9 pruebas de Chrome aprobadas. Se conservan las pruebas de progreso, ejercicios, permisos, cancelación y ejecución del modelo real offline. Las nuevas cubren selección por teclado de una de dos sillas, traducción visible, confianza de la instancia seleccionada, práctica focalizada de tres preguntas, selección táctil en 390 × 844, movimiento sin cambio de identidad, salida individual de vista, vuelta a la cámara y selección estable con respuestas de 600 ms.
- Revisión independiente: identificó riesgo de pérdida de identidad con inferencias superiores a la tolerancia fija. Se corrigió con tolerancia adaptativa y una prueba que primero falló; se añadieron cobertura unitaria y de navegador. No se señalaron otros fallos importantes.
- Capturas inspeccionadas: `ar-desktop.png` y `ar-mobile.png`. Son imágenes de una cámara sintética controlada, no detecciones físicas de los rectángulos de prueba.

Las pruebas controladas de geometría e interacción no sustituyen la validación física de cámara, detección y rendimiento en Android/iPhone. El seguimiento asocia detecciones; no analiza flujo óptico entre fotogramas y no puede garantizar identidad al cruzarse dos objetos iguales. Si el visor está muy lleno, la colocación reduce solapamientos pero no puede garantizar espacio para todas las etiquetas. Al salir de la vista, la ficha permanece disponible como vocabulario de la sesión y deja de indicar confianza actual.

## Archivos

Nuevos: `src/objectTracking.ts`, `src/overlayLayout.ts`, `src/ObjectOverlay.tsx`, sus pruebas unitarias, `tests/browser/ar.spec.ts` y este documento.

Modificados: `src/useCamera.ts`, `src/App.tsx`, `src/scanning.ts`, `src/styles.css`, la regresión de cámara congelada, pruebas de cadencia y documentación. Audio, catálogo, modelo, worker y almacenamiento se reutilizan.

## Probar

Ejecutar `npm run build` y `npm run preview`. Abrir `http://localhost:4173/?v=4`, permitir cámara y mostrar uno o varios objetos admitidos. Tocar una etiqueta: se resalta su objeto y se abre la ficha. En móvil, la ficha aparece en el área existente inferior; «Volver a la cámara» regresa al visor. «Practicar [palabra]» inicia sus tres ejercicios. Para acceso desde teléfono se requiere HTTPS.
