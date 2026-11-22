# Diseño: conversaciones clínicas coherentes, pistas y orden interactivo

## Objetivo

Mejorar la sesión de cinco casos clínicos sin incorporar inteligencia artificial. Las entrevistas deben sentirse como conversaciones coherentes en inglés, las pistas deben ayudar sin mostrar más información de la ronda actual y los resultados deben reflejar el desempeño real.

La sesión conserva dos entrevistas largas, dos ejercicios de orden y una selección múltiple, presentados en orden aleatorio y guardados en el historial de práctica.

## Entrevistas con 27 rutas

Cada entrevista será un grafo dirigido de tres turnos:

- El primer turno muestra exactamente tres preguntas.
- La respuesta elegida determina las tres preguntas disponibles en el segundo turno.
- La elección del segundo turno determina las tres preguntas del tercer turno.
- Esto produce 3 × 3 × 3, es decir, 27 recorridos posibles.

Los nodos se podrán reutilizar cuando una pregunta sea una continuación natural en más de una ruta. La aplicación guardará cada nodo una sola vez y declarará sus transiciones mediante identificadores. Así se evita duplicar conversaciones completas sin perder coherencia.

Cada nodo contendrá:

- pregunta en inglés y traducción al español;
- respuesta fija del paciente en inglés y su traducción al español;
- pregunta de comprensión en inglés y traducción;
- tres opciones de respuesta en inglés y sus traducciones;
- identificador de la respuesta correcta;
- tres identificadores de continuación cuando todavía falten turnos.

Las respuestas del paciente dejarán de elegirse al azar. La aleatoriedad permanecerá en el orden de los cinco casos y en la disposición inicial de las opciones, pero el contenido escuchado dependerá de la pregunta elegida. Esto mantiene una línea conversacional estable.

## Pistas de traducción en entrevistas

Durante cada uno de los tres turnos de conversación habrá un botón `Pista`:

- traduce al español únicamente las tres preguntas disponibles en ese turno;
- se puede utilizar una vez por turno, hasta tres veces durante la conversación;
- no traduce turnos anteriores ni muestra cuáles preguntas conducen a una ruta concreta.

Durante cada una de las tres preguntas de comprensión también habrá un botón `Pista`:

- traduce únicamente la pregunta actual y sus opciones;
- se puede utilizar una vez por pregunta, hasta tres veces durante la comprensión;
- no señala la opción correcta.

La interfaz mostrará el contador de pistas de la fase actual. Las traducciones se registrarán en el historial como pistas utilizadas, pero no reducirán la puntuación porque ayudan con el idioma sin revelar la respuesta.

## Ritmo visual de la conversación

Después de elegir una pregunta:

1. aparece el mensaje del estudiante;
2. Alex o Sam muestra tres puntos animados durante aproximadamente 500 ms;
3. aparece la respuesta del paciente;
4. se habilita el siguiente grupo de preguntas.

Mientras el paciente escribe, no se podrá elegir otra opción. La animación respetará la preferencia del sistema de reducir movimiento.

Los mensajes usarán burbujas diferenciadas, avatar o inicial del paciente y una transición discreta. La vista se desplazará hacia el último mensaje cuando sea necesario en pantallas pequeñas.

## Comprensión y resultados

Al terminar los tres turnos se mostrarán tres preguntas, una por respuesta escuchada. El resultado utilizará tres niveles:

- verde: 80 % o más;
- amarillo: entre 50 % y 79 %;
- coral: menos de 50 %.

En una entrevista de tres preguntas esto equivale a verde con 3 aciertos, amarillo con 2 y coral con 0 o 1. La tarjeta final mostrará aciertos, errores y pistas utilizadas; el icono y el texto cambiarán según el nivel.

## Ejercicios de orden

Los casos podrán tener cualquier cantidad de acciones desde dos en adelante. La pantalla mostrará todas las acciones como tarjetas en una lista vertical mezclada desde el inicio.

El estudiante podrá:

- arrastrar una tarjeta mediante un asa y soltarla entre otras tarjetas;
- reordenarla con botones de subir y bajar para teclado y accesibilidad;
- reiniciar la mezcla;
- comprobar el orden cuando quiera, siempre que estén todas las tarjetas presentes.

El arrastre se implementará con Pointer Events para que funcione con ratón y pantalla táctil sin añadir una dependencia. Las tarjetas se desplazarán para indicar el destino antes de soltar.

Cada caso permitirá como máximo tres pistas y, para casos cortos, como máximo `cantidad de acciones - 1`. Cada pista colocará y bloqueará la primera acción todavía no resuelta en su posición correcta. Las demás tarjetas seguirán siendo reordenables alrededor de ella. El estado mostrará qué tarjeta fue colocada mediante una pista.

La puntuación distinguirá:

- posiciones correctas resueltas por el estudiante;
- posiciones colocadas con pistas;
- posiciones incorrectas.

Las posiciones asistidas no contarán como aciertos independientes. El nivel de color se calculará sobre el total de acciones para evitar que un ejercicio resuelto mayormente con pistas aparezca como perfecto.

## Selección múltiple

La opción elegida tendrá borde, fondo, indicador circular y marca visibles. Esto hará evidente la selección antes de comprobarla.

Habrá una sola pista. Al utilizarla, la aplicación descartará visualmente una opción incorrecta y la deshabilitará. La pista nunca eliminará la respuesta correcta ni seleccionará una respuesta automáticamente.

El resultado mostrará verde cuando la respuesta sea correcta y coral cuando sea incorrecta, además de indicar si se utilizó la pista.

## Estado, historial y salida

Cada caso administrará sus pistas y su estado localmente. Al completarlo enviará a la sesión:

- aciertos;
- errores;
- posiciones asistidas, cuando corresponda;
- cantidad de pistas utilizadas.

La sesión guardará estos valores mediante el registro de práctica existente. Al terminar los cinco casos mostrará el resumen total y la distribución de desempeño.

Si el estudiante sale antes de terminar, la sesión actual se descarta igual que ahora. No se añadirá persistencia de sesiones incompletas en esta etapa.

## Verificación

Las pruebas unitarias cubrirán:

- que cada entrevista tenga tres opciones en cada turno y 27 rutas válidas;
- que ninguna transición apunte a un nodo inexistente;
- que las pistas de traducción no cambien la respuesta correcta;
- que las pistas de orden coloquen acciones correctas sin superar el límite;
- que la pista de selección múltiple descarte solo una respuesta incorrecta;
- que la puntuación y el nivel de color coincidan con aciertos, errores y ayuda recibida.

Las pruebas de navegador cubrirán una sesión completa, una traducción en ambas fases de entrevista, el indicador de escritura, el reordenamiento de tarjetas, los tres niveles de resultado, la selección visible y las pistas de los tres tipos de caso.
