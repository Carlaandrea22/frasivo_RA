# Persona C · Casos clínicos y Mi progreso

Implementa la entrevista simulada, la revisión del razonamiento y el historial de aprendizaje. Trabaja en `src/features/casos/`, `src/features/progreso/`, `src/content/casos/` y las pruebas de los módulos. La base incluye un caso provisional de dolor anterior de rodilla con borradores para las 27 rutas de entrevista. Las pantallas completas, los recursos y la revisión del caso forman parte de esta tarea.

Crea tu rama desde `Luis` y abre el PR hacia `Luis`. Sigue [Contribuir a LumAR](../../CONTRIBUTING.md). Consulta los tipos, rutas y métodos de persistencia en la [arquitectura](../ARQUITECTURA.md). Coordina con A cambios en `src/shared/` o `src/content/types.ts`, y con B los identificadores y enlaces que permitan repasar anatomía desde un caso o desde el progreso.

## Caso clínico

1. **Presentación.** En la lista y en el inicio del caso, muestra un título y una descripción que preserven el descubrimiento del diagnóstico. Al abrirlo, muestra al paciente animado con un recurso configurable. En el chat, el paciente explica en español y en primera persona por qué consulta.
2. **Entrevista.** Presenta tres preguntas por turno y permite escoger una. La entrevista dura exactamente tres turnos. Ofrece las opciones de los turnos siguientes a partir del historial de elecciones, sin repetir preguntas ya hechas. Muestra el historial de preguntas y respuestas y el avance de los tres turnos. Comprueba que las 27 secuencias posibles mantengan la coherencia del paciente y aporten evidencia suficiente para plantear una hipótesis razonada, aunque algunas dejen información para revisar.
3. **Hipótesis.** Al terminar, el paciente pregunta **«¿Qué podría ser, doctor/a?»**. Muestra tres hipótesis con exactamente una respuesta correcta y permite confirmar la elegida.
4. **Razonamiento inicial.** Antes de revelar la solución, guía al estudiante para resumir el caso, declarar su hipótesis, explicar qué hallazgos la apoyan y anotar qué información le falta. Conserva esa primera versión como trabajo propio.
5. **Tutor y revisión.** Muestra al tutor como un personaje distinto, con su propio recurso visual y guion en español. Sus preguntas y sugerencias ayudan a examinar evidencia, omisiones y alternativas. Permite que el estudiante edite su razonamiento final. Guarda la versión inicial, la revisada y las sugerencias del tutor por separado para que estén disponibles en **Mis prácticas**.
6. **Revisión del caso.** Después de la revisión del estudiante, muestra si acertó, la explicación, los hallazgos que respaldan la solución y por qué las alternativas encajan menos. Recupera las preguntas que hizo, señala las omisiones relevantes y presenta un consejo para la próxima entrevista. Muestra por separado el acierto del diagnóstico, la pertinencia de las preguntas y la justificación. Para la justificación, ofrece una autoevaluación y una referencia con que compararla, sin asignar una nota automática a la calidad del texto. Da opciones para repetir el caso, hacer otro o abrir la anatomía relacionada.

El contenido de pacientes y tutores se ejecuta con respuestas y preguntas previstas en sus guiones. Define los recursos definitivos de forma que puedan reemplazar a los provisionales desde el contenido sin modificar el flujo de entrevista o de revisión. Completa la revisión profesional de las 27 rutas, de las tres hipótesis y de la explicación con su referencia antes de marcar el caso como revisado.

## Mi progreso y Mis prácticas

| Vista | Información y acciones |
| --- | --- |
| **Exploración** | Muestra las estructuras consultadas con enlaces a sus fichas, de acuerdo con las consultas registradas. |
| **Retos y casos** | Muestra intentos y resultados de retos, casos realizados y sus resultados. Diferencia el intento, el resultado objetivo y el trabajo escrito. |
| **Mis prácticas** | Permite volver al caso y leer el razonamiento inicial, el revisado y las sugerencias del tutor con su autoría identificada. |
| **Repaso** | Propone volver a las estructuras, retos o casos relacionados con los errores y actividades realmente registrados. Incluye un enlace a cada destino. |

Reconoce los logros que se desprenden de actividad guardada. Presenta los puntos y estadísticas migrados como historial anterior, fuera del recuento de consultas. Cuando todavía falte actividad, ofrece un enlace a una práctica o a Explorar 3D. Usa avisos internos para repasar o reanudar actividades según la información disponible.

## Criterios de aceptación

- [ ] La lista y el inicio del caso omiten el diagnóstico. El paciente se distingue visualmente del tutor y explica su motivo de consulta en primera persona.
- [ ] Se recorren las 27 rutas de tres turnos y tres opciones con pruebas. Cada turno depende del historial, las preguntas elegidas no se repiten y el chat conserva el orden de la entrevista.
- [ ] El caso presenta tres hipótesis con una correcta. La guía y el tutor preceden a la solución. La confirmación de una hipótesis queda registrada en el intento.
- [ ] Tras recargar, Mis prácticas recupera el texto inicial y el revisado, con los comentarios del tutor identificados. La revisión del caso muestra evidencia, alternativas, preguntas, omisiones, consejo, autoevaluación y referencia con las tres dimensiones diferenciadas.
- [ ] Se puede repetir el caso, abrir otro desde el catálogo y visitar una estructura relacionada. Un intento nuevo conserva accesibles los resultados y escritos de los anteriores.
- [ ] Mi progreso lee consultas, intentos y resultados independientes. Los enlaces de repaso funcionan y las estadísticas anteriores aparecen fuera del volumen de consultas. Comprueba los estados con y sin actividad.
- [ ] El PR incluye pruebas de las ramas y el flujo principal, compilación y verificación móvil y de escritorio. Indica qué recursos visuales, guiones y referencias siguen provisionales o pendientes de revisión profesional.
