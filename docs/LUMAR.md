# LumAR

LumAR es una PWA educativa de anatomía humana. Permite pasar del cuerpo en cámara a un modelo 3D, practicar lo observado y aplicar ese conocimiento en una entrevista clínica simulada. La interfaz, las definiciones y las explicaciones van en español. La pronunciación de los términos en inglés usa clips de audio generados con Piper.

Cloudflare Pages publica LumAR desde `main`. El equipo integra los cambios en `Luis` y adelanta `main` cuando el commit pasa GitHub Actions y se comprueba en la vista previa. [App pública](https://frasivo-ra.pages.dev) · [Vista previa de Luis](https://luis.frasivo-ra.pages.dev) · [Configuración de Cloudflare Pages](HOSTING.md)

## Recorrido

| Sección | Qué hace el estudiante |
| --- | --- |
| **Cuerpo** | Usa el atlas o activa la cámara para ver capas de huesos, músculos y órganos. Puede fijar una pose, girar el esqueleto capturado en el visor 3D y abrir la opción de AR disponible en el dispositivo. |
| **Explorar 3D** | Busca una estructura por nombre, la observa aislada en 3D, activa sus anotaciones y consulta qué es, dónde está, qué función cumple y dónde practicarla. |
| **Retos** | Practica la identificación, ubicación y relación de estructuras, y revisa la retroalimentación. |
| **Casos clínicos** | Practica entrevistas con pacientes simulados, relaciona síntomas con posibles causas y revisa su razonamiento. |
| **Mi progreso** | Consulta las estructuras exploradas y los resultados de sus prácticas. Desde aquí también abre Créditos. |

Retos y Casos clínicos se abren desde **Practicar**.

## Modelo de aprendizaje

LumAR aplica los cinco componentes del modelo de Marcel Lebrun al diseño de las actividades.

| Componente | Aplicación en LumAR |
| --- | --- |
| **Informar** | Relacionar el cuerpo en cámara y en AR con modelos 3D, etiquetas, fichas de ubicación y función, y pronunciación en inglés. |
| **Motivar** | Proponer metas alcanzables como consultar una estructura o completar una práctica y reconocer únicamente la actividad registrada. |
| **Activar** | Colocar etiquetas, identificar piezas, relacionar estructuras con funciones y hacer repasos breves. |
| **Interactuar** | Elegir preguntas y recibir respuestas de un paciente simulado. Un tutor con un guion propio invita a reconsiderar la evidencia. El intercambio con compañeros y docentes queda para una etapa posterior. |
| **Producir** | Redactar un razonamiento guiado, revisarlo después de dialogar con el tutor y conservar ambas versiones para volver a leerlas. |

Marcel Lebrun describe los cinco componentes y presenta el modelo en video. [Texto de Marcel Lebrun](https://lebrunremy.be/WordPress/?p=593) · [Presentación en video](https://www.youtube.com/watch?v=IODpULBMBpI) · [Publicación original](https://blogdemarcel.wordpress.com/2008/04/02/un-modele-dapprentissage-pour-les-technologies/)

## Responsabilidades de los módulos

Los módulos comparten la navegación y los contratos de contenido. La actividad se registra localmente en el dispositivo.

| Persona | Responsabilidad |
| --- | --- |
| **A** | Base de LumAR, Cuerpo y AR, interfaces compartidas e integración. |
| **B** | Explorar 3D y Retos de anatomía, con catálogo, anotaciones, modelos y ejercicios. [Tarea de B](tareas/persona-b-explorar-retos.md) |
| **C** | Casos clínicos y Mi progreso, con guiones, recursos del paciente y del tutor, y revisión de prácticas. [Tarea de C](tareas/persona-c-casos-progreso.md) |

El contenido y los recursos provisionales se identifican como material didáctico de desarrollo mientras estén pendientes de revisión.

Los avisos de esta etapa se muestran dentro de la app. Los recordatorios en el dispositivo son una ampliación futura con servidor, activación voluntaria, programación y frecuencia configurables, y enlaces a la actividad correspondiente.

Los módulos y sus puntos de integración están en la [arquitectura](ARQUITECTURA.md). El flujo de ramas y revisión está en [Contribuir a LumAR](../CONTRIBUTING.md).

## Capturas de la base

Estas capturas documentan la primera versión de la interfaz en Chrome a 375 px.

- [Cuerpo](renovacion/lumar-base/cuerpo.png) · [Pose fijada](renovacion/lumar-base/cuerpo-fijar.png)
- [Catálogo de huesos](renovacion/lumar-base/catalogo.png) · [Fémur en 3D](renovacion/lumar-base/explorar-3d.png)
- [Practicar](renovacion/lumar-base/practicar.png) · [Reto de muestra](renovacion/lumar-base/retos.png) · [Caso de muestra](renovacion/lumar-base/casos.png)
- [Mi progreso](renovacion/lumar-base/progreso.png) · [Mis prácticas](renovacion/lumar-base/mis-practicas.png)
