# Arquitectura de LumAR

LumAR usa React, TypeScript, Vite y Three.js. `src/features/` agrupa las pantallas por módulo, `src/content/` contiene los datos didácticos y `src/shared/` contiene las interfaces que usan varios módulos. El punto de entrada, la navegación inferior, los Créditos y la integración del service worker pertenecen a la base que mantiene A. Cuerpo y su AR viven en `src/features/cuerpo/`, incluido el seguimiento con MediaPipe, la captura de pose y la exportación para el visor nativo.

## Rutas

Cada módulo exporta un arreglo `routes` en su propio `src/features/*/routes.ts`. Vite registra esos archivos con `import.meta.glob`. Para añadir una pantalla, usa el tipo `RouteDefinition` de `src/shared/navegacion/index.ts`. Define `path` sin el prefijo `#` y `Screen` como el componente que recibe `params` con los segmentos dinámicos. Usa `cuerpo`, `explorar`, `practicar` o `progreso` en `tab` para indicar qué pestaña queda activa también en el enlace directo.

| Ruta | Pantalla | Responsable |
| --- | --- | --- |
| `#cuerpo` | Cámara y atlas corporal | A |
| `#explorar` | Catálogo de Explorar 3D | B |
| `#explorar/:categoria` | Catálogo filtrado por categoría | B |
| `#explorar/estructura/:id` | Visor y ficha de estructura | B |
| `#practicar` | Entrada a Retos de anatomía y Casos clínicos | A |
| `#practicar/retos` | Lista de retos | B |
| `#practicar/retos/:id` | Detalle o práctica de un reto | B |
| `#practicar/casos` | Lista de casos | C |
| `#practicar/casos/:id` | Entrevista, razonamiento y revisión del caso | C |
| `#progreso` | Resumen de actividad | C |
| `#progreso/practicas` | Trabajos y razonamientos | C |
| `#progreso/creditos` | Créditos | A |

Enlaza a los hashes de la tabla con enlaces navegables. Al abrir una pantalla por enlace directo, recargar o recorrer el historial con Atrás y Adelante, debe corresponder la vista al hash. Los enlaces antiguos `#explorar-3d`, `#mi-progreso` y `#creditos` se resuelven como `#explorar`, `#progreso` y `#progreso/creditos`, respectivamente, sin añadir una entrada adicional al historial.

## Interfaz y visor compartidos

- `src/shared/ui/` agrupa `Button`, `Card`, `SearchField`, `Segmented`, `BottomSheet` y `ContentState`. Úsalos para mantener coherencia en los recorridos y conservar sus interacciones de teclado y foco.
- `src/shared/visor3d/Viewer3D` carga GLB, aísla un nodo con `nodeId` y comunica la selección con `onSelect`. `selectedNodeId` permite sincronizar la selección con los controles externos. La pantalla aporta `src`, `label` y la capa que necesite en `children`. La propiedad CSS `--viewer3d-height` permite ajustar la altura del visor.
- `anchors` recibe puntos con `id`, `nodeId` opcional y `point` en el sistema local del nodo indicado o de la escena GLB cuando se omite `nodeId`. `onProject` devuelve `id`, `x`, `y` en píxeles CSS relativos al lienzo y el indicador `visible`. Explorar usa esos valores para dibujar y distribuir las flechas y las etiquetas. Retos puede reutilizar la selección y la proyección.
- Los puntos fuera de cuadro, en ramas ocultas o tapados por una malla visible se marcan con `visible: false`. El rayo respeta el aislamiento del modelo y las capas de la cámara. Una tolerancia del 1 % del radio de la esfera envolvente conserva los anclajes de superficie. El visor recalcula al cambiar la cámara, el modelo, los puntos o el tamaño del lienzo.
- Usa `EnglishTerm` para mostrar y pronunciar cada término en inglés. Los MP3 de Piper `en_US-ljspeech-medium` se precargan y comparten los nombres de archivo con Explorar y Retos. La voz del dispositivo se usa cuando falta un clip. Para agregar un término, ejecuta `python scripts/generate-cuerpo-audio.py RUTA/en_US-ljspeech-medium.onnx "English term"` en el entorno descrito en la [guía de contribución](../CONTRIBUTING.md#clips-de-pronunciación).

## Contenido

El contrato común está en `src/content/types.ts`. Usa identificadores que permanezcan estables al editar un título o un texto. Las relaciones entre estructuras, anotaciones, ejercicios, casos y registros se hacen por esos identificadores.

| Datos | Ubicación | Información que mantiene el módulo |
| --- | --- | --- |
| Estructuras anatómicas | `src/content/anatomy/` | Categoría, nombres, definición, ubicación, función, modelo y nodo, miniatura y relaciones con prácticas. |
| Anotaciones | `src/content/anotaciones/` | Estructura, texto en español y punto de anclaje en el nodo GLB. |
| Retos | `src/content/ejercicios/` | Tipo de actividad, estructuras relacionadas, opciones, respuesta, pistas y retroalimentación. |
| Casos | `src/content/casos/` | Presentación sin diagnóstico, paciente, tutor, historial de ramas, hipótesis, solución y referencias. Una entrevista tiene tres turnos con tres opciones por turno. Las ramas se resuelven a partir de las preguntas seleccionadas antes. |

Las fichas, anotaciones, retos y casos tienen `revision` con fuentes y estado (`provisional`, `en-revision` o `revisado`). Cuando esté disponible, incluye la persona que revisó el contenido y la fecha. Documenta los créditos y la licencia de los recursos incorporados. El caso define `recursoVisual` para cada personaje, con el indicador `provisional`, de forma que el recurso pueda sustituirse desde el contenido. Los guiones del paciente y el tutor se resuelven localmente. Las preguntas del tutor pueden aplicar a todos los intentos o depender de la hipótesis elegida y de una pregunta omitida.

## Progreso local

`src/shared/progreso/index.ts` expone `getProgress(storage?)`, `queryProgress(filter?, storage?)` y `subscribeProgress(listener)`. Las escrituras pasan por `recordConsultation`, `recordPractice` y `recordDemonstration`. El almacenamiento local usa `lumar.progress:v1` para los metadatos y el prefijo `lumar.progress:v1:event:` para los eventos. Los registros se consultan por tipo, área, grupo, elemento o actividad.

| Registro | Qué representa |
| --- | --- |
| `consultation` | Una consulta de una estructura. Alimenta el historial de exploración. |
| `practice` | Un intento de reto o caso. Guarda aciertos, errores y pistas usadas, con contexto y razonamiento cuando corresponda. |
| `demonstration` | Una evidencia de desempeño asociada a la práctica del mismo destino por `practiceEventId`. Usa el `id` que devuelve `recordPractice`. La corrección de la hipótesis de un caso se distingue de la revisión del razonamiento. |

En `context`, un reto (`kind: 'reto'`) guarda `mode`. Un caso (`kind: 'caso'`) guarda las preguntas de la entrevista en orden en `questionIds` y la hipótesis evaluada en `hypothesisId`. En el razonamiento del caso, `original` y `revised` conservan por separado el resumen, la hipótesis de esa versión, la evidencia y los datos faltantes. `suggestions` guarda las sugerencias del tutor. Mi progreso utiliza estos registros para mostrar intentos, desempeño y trabajos, y construir enlaces de repaso a partir de las estructuras o actividades relacionadas.

Las estadísticas por palabra y los puntos de `frasivo-explore:v1` se importan a `legacy`. En la interfaz se identifican como historial anterior y quedan fuera del total de consultas. La preferencia del panel compacto de Cuerpo se conserva en `frasivo.body.controls-minimized`. Verifica ambos datos al probar una actualización con un perfil existente.

Los avisos internos se generan con la actividad local. La notificación en el dispositivo depende de una ampliación futura con servidor, preferencias de consentimiento y frecuencia, programación y enlace al destino.

## Propiedad de carpetas

| Persona | Carpetas y responsabilidad |
| --- | --- |
| A | `src/features/cuerpo/`, integración de la app, navegación común, Créditos, branding y service worker. Coordina cambios en `src/shared/` y `src/content/types.ts`. |
| B | `src/features/explorar/`, `src/features/retos/`, `src/content/anatomy/`, `src/content/anotaciones/` y `src/content/ejercicios/`. |
| C | `src/features/casos/`, `src/features/progreso/` y `src/content/casos/`. |

Los módulos pueden leer los datos de otros módulos e intercambiar identificadores y enlaces. Cada persona edita sus propias carpetas. Coordina con A antes de modificar una interfaz compartida o `src/content/types.ts`, y avisa al otro módulo cuando el cambio afecte su integración. [Guía de contribución](../CONTRIBUTING.md)

## Chatbot

Luis mantiene `src/features/chatbot/` y `functions/api/chat.ts`. La pestaña Chat abre `#chatbot`. El navegador envía el historial reciente por `POST /api/chat`. La función de Cloudflare Pages añade el prompt de sistema, llama a OpenRouter y devuelve eventos `delta`, `error` y `done`. El servidor local de Vite usa la misma función en `dev` y `preview`.

El navegador guarda hasta 30 mensajes en `localStorage`. La función envía hasta 12 a OpenRouter y limita cada mensaje del estudiante a 1 000 caracteres, el cuerpo a 16 KiB y la salida a 700 tokens. Corta la solicitud a los 60 segundos y propaga la cancelación. Cada instancia aplica un límite en memoria de 20 solicitudes por IP cada 10 minutos.

La función acepta orígenes de LumAR en Pages y de `localhost` o `127.0.0.1`. OpenRouter recibe `provider.data_collection: "deny"` para excluir proveedores que entrenan con los mensajes. La app y la función omiten el contenido de los mensajes en sus registros. El service worker excluye `/api/` de su caché. La clave se lee desde un secreto de Cloudflare o `.dev.vars` en pruebas locales. [Configuración del chatbot](HOSTING.md#activar-el-chatbot-carla)
