# Misión: tres objetos del aula

Implementación verificada el 21 de noviembre de 2026.

## UX acordada

El usuario eligió una sección «Misiones» en el menú. Explorar sigue siendo libre; Misiones es una actividad guiada con la misma cámara, etiquetas, fichas y audio. Practicar y Mis palabras conservan sus funciones. En iPhone habrá cuatro destinos en la barra inferior. Una tarjeta en Explorar permite descubrir la misión.

Flujo: presentación → elegir tres objetos (por defecto Book, Chair, Backpack) → escuchar y tocar cada objeto reconocido → tres ejercicios, uno de cada tipo → resumen. Objetos alternativos: laptop, botella, mouse, teclado y reloj. Se evita pedir el propio teléfono como objetivo predeterminado al usar su cámara.

Decisiones de implementación: 10 puntos por selección correcta del objeto actual y 10 por ejercicio correcto, máximo 60. La detección por sí sola no entrega puntos. Una selección manual o una etiqueta en retención sin observación actual no completa el reto. Respuestas repetidas y toques dobles no vuelven a puntuar. Los puntos y respuestas usan el progreso existente; encontrar algo no lo marca automáticamente como aprendido.

Se reutiliza Practice para tres preguntas proporcionadas por la misión; su uso normal continúa igual. El audio se solicita desde botones (Empezar, Siguiente o Escuchar reto) para conservar la interacción necesaria en iPhone. Hay texto equivalente y pista en español. Si no hay voz disponible, el reto se puede completar con texto.

La cámara se mantiene durante la búsqueda de los tres objetos para evitar recargar el modelo en cada paso. Se detiene al terminar la búsqueda, salir de la sección o enviar la app al fondo. La misión se conserva al cambiar secciones dentro de la página y tiene controles para continuar. El avance de misión no se promete tras recargar; puntos y respuestas sí usan el guardado local existente. No se modifica MediaPipe, su canvas explícito ni el seguimiento 2D.

## Plan

- [x] Probar validación de objetivos, selección correcta/incorrecta, etiquetas no actuales, orden de retos, puntuación única y tres ejercicios.
- [x] Implementar dominio en `src/missions/classroom.ts` y controlador con referencia sincronizada en `useClassroomMission.ts`.
- [x] Reutilizar Practice con preguntas y finalización opcionales, conservando su comportamiento anterior.
- [x] Añadir presentación, barra de reto y resumen; incorporar Misiones en ambos menús y compartir el visor existente.
- [x] Verificar misión completa, errores, pausa, progreso, audio solicitado por gesto, móvil, regresión iPhone y funcionamiento anterior.
- [x] Revisar visualmente y documentar resultados.

## Cambios y pruebas realizadas

Archivos nuevos: `src/missions/classroom.ts` (transiciones, objetivos, preguntas y puntos), `useClassroomMission.ts` (referencia sincronizada contra eventos repetidos), `ClassroomMission.tsx` (entrada, presentación, reto y resumen), `tests/mission.test.ts` y `tests/browser/missions.spec.ts`.

Se modificaron `App.tsx` y estilos para añadir Misiones a ambos menús y compartir un único visor. El visor permanece montado cuando está oculto, pero la captura se detiene al cambiar de sección; así no se pierde su referencia al empezar o continuar. `Practice.tsx` acepta opcionalmente preguntas y una finalización externa; su modo anterior sigue igual. Cada instancia usa un identificador propio para su campo de respuesta. El ejercicio de misión permanece montado y oculto al visitar otra sección para conservar lo escrito.

`npm test`: **30 pruebas unitarias aprobadas**. Cubren tres objetivos válidos y distintos, inicio repetido, objeto incorrecto, etiqueta no observada, transición ordenada, búsqueda y respuestas sin doble puntuación, finalización solo con tres respuestas y conservación de estadísticas globales.

`npm run build`: aprobado. No se añadieron dependencias y se mantuvo el mismo contenido del worker del detector y su canvas explícito para Chrome de iPhone.

`npm run test:e2e`: **13 pruebas aprobadas**. Se conservan las 11 anteriores, incluidas ejecución real del detector offline, identificación de Chrome en iPhone, etiquetas, selección, ejercicios y progreso. Las dos nuevas comprueban navegación móvil, misión completa, instrucción de audio en inglés solicitada desde gesto, cámara abierta una sola vez durante los tres objetos, selección incorrecta sin puntos, toque repetido sin puntos extra, escritura a medias conservada al cambiar secciones, resumen de 60 puntos, captura cerrada y puntos guardados tras recargar.

Revisión independiente: sin hallazgos importantes de estado, puntuación, navegación o recursos. Se añadió además una protección para que un segundo evento de inicio no vuelva a abrir la cámara ni reinicie la misión en curso.

Capturas inspeccionadas: `mission-intro-mobile.png`, `mission-camera-mobile.png` y `mission-summary-mobile.png`. La cámara y la salida de audio de las pruebas son controladas: se verifican los parámetros de la instrucción y su activación por gesto; no se afirma haber escuchado la voz en un iPhone físico. La detección real sigue teniendo sus límites de precisión. El usuario debe confirmar el nuevo recorrido y audio en su teléfono.

## Ejecución y límites

Abrir `http://localhost:4173/?v=6` con `npm run build` y `npm run preview`. Elegir **Misiones → Empezar y escuchar**. La misión inicial busca Book, Chair y Backpack; «Cambiar objetos» permite preparar otros antes de empezar. En un teléfono se necesita el enlace HTTPS temporal o un despliegue seguro.

Los puntos acumulados y estadísticas se guardan en el dispositivo con el mismo repositorio existente. El avance de la misión se conserva mientras la página permanezca abierta y se reinicia al recargar. Repetir o reiniciar es una nueva práctica y puede sumar puntos nuevamente; no es un sistema competitivo ni una validación antifraude. El audio depende de voces disponibles y algunas requieren conexión. Ninguna imagen se guarda o se envía a un servicio de reconocimiento.
