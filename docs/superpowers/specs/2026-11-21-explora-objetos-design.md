# Explora objetos: vocabulario de software en 3D

## Objetivo y recorrido

Añadir una sección «Explora objetos» a Frasivo Explore. El usuario selecciona
un término de una lista precargada y ve una representación didáctica 3D sobre
la imagen de la cámara, con pronunciación, significado y ejemplo bilingüe.
La primera colección es Software; no habrá selector de carreras vacías.

## Alternativas y elección

- Reconocer palabras impresas con la cámara: requeriría OCR y no corresponde
  al recorrido elegido.
- Seleccionar en la app y presentar 3D sobre cámara: recorrido elegido por el
  usuario; permite controlar el contenido y utilizar la cámara habitual.
- Colocar modelos sobre superficies con seguimiento espacial: una ampliación
  posterior con requisitos y compatibilidad distintos.

## Alcance de esta entrega

- Diez términos propuestos: array, stack, queue, thread, repository,
  deployment, framework, middleware, inheritance y dependency.
- Cada ficha contiene traducción, explicación breve, pronunciación escrita,
  ejemplo en inglés, traducción y explicación de la metáfora visual.
- Diez representaciones 3D diferenciadas: casillas ordenadas, pila, fila,
  hilos de ejecución, repositorio, transferencia a servidor, estructura,
  intermediario, jerarquía y componentes conectados.
- Rotación y ajuste de tamaño del modelo con controles táctiles accesibles;
  botón para restablecer la vista.
- Cámara trasera solicitada por gesto y modo de estudio sin cámara. Cambiar
  la palabra no vuelve a pedir permisos. Salir o enviar la app al fondo
  detiene la captura. Gestionar denegación y permisos pendientes cancelados.
- Conservar navegación, ejercicios, misiones y progreso actuales. El nuevo
  catálogo no se mezcla con las clases del detector de objetos cotidianos.

## Decisiones propuestas por el implementador

- Mantener React, TypeScript y Vite. Añadir Three.js para geometría 3D real
  con fondo transparente; modelos geométricos locales sin descargas externas.
- Separar catálogo educativo, construcción de escenas y pantalla del módulo.
  La cámara del módulo no carga MediaPipe porque no necesita reconocer objetos.
- Reutilizar la pronunciación mediante voces del dispositivo, activada con
  botones. «Precargado» se refiere al vocabulario; no se promete audio grabado.
- Mantener la estética verde existente y adaptar la navegación móvil para
  cinco destinos sin desbordamiento.
- Rotular con claridad «3D sobre cámara»: el modelo sigue en pantalla y no
  queda anclado a la mesa ni sigue objetos físicos. Sin reconocimiento de
  palabras, anclajes, medición de profundidad u oclusión en esta versión.
- Si WebGL no está disponible, mostrar explicación accesible y el contenido
  educativo; no sustituir silenciosamente el modelo por una imagen.
- Liberar stream, animaciones, geometrías, materiales y contexto al salir.
  Respetar movimiento reducido y conservar recursos dentro de la PWA.

## Verificación

Comprobar las diez fichas y escenas, selección y controles, manejo de cámara,
audio solicitado por gesto, salida y limpieza, vista móvil y alternativa sin
WebGL. Ejecutar pruebas existentes y build. Inspeccionar el renderizado real
en navegador; distinguir pruebas con captura controlada de pruebas en teléfono.

## Criterio de entrega

Desde la navegación se entra a Explora objetos, se elige cualquiera de las
diez palabras y se obtiene su escena 3D diferenciada, ficha y pronunciación.
Se puede estudiar sin cámara y volver a las secciones anteriores.
