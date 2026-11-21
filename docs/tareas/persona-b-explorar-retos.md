# Persona B · Explorar 3D y Retos de anatomía

Implementa el recorrido desde el catálogo hasta la inspección de una estructura y la práctica de lo observado. Trabaja en `src/features/explorar/`, `src/features/retos/`, sus pruebas y el contenido de anatomía, anotaciones y ejercicios. La base incluye el fémur (*femur*) y un reto para relacionar estructura con función como referencias de integración. Los recorridos y el resto del contenido se completan en esta tarea.

Crea tu rama desde `Luis` y abre el PR hacia `Luis`. Sigue [Contribuir a LumAR](../../CONTRIBUTING.md). Consulta los tipos, componentes y rutas en la [arquitectura](../ARQUITECTURA.md). Coordina con A cualquier cambio en `src/shared/` o `src/content/types.ts` y usa el registro compartido para que C pueda mostrar los resultados en Mi progreso.

## Explorar 3D

1. Construye el catálogo con **Huesos**, **Músculos** y **Órganos**. Cada entrada tiene miniatura, nombre en español y término en inglés. Facilita la búsqueda por cualquiera de esos nombres y da una respuesta clara cuando no haya coincidencias.
2. Abre la estructura por su ID y carga el GLB aislando el nodo correspondiente con el visor compartido. Permite girar y acercar la pieza con los controles del visor. Ofrece la pronunciación en inglés con la voz del dispositivo.
3. Usa los puntos de unión del modelo para dibujar las flechas y sus etiquetas en español. Recalcula su posición al orbitar, acercar o redimensionar. Separa las etiquetas que podrían superponerse y oculta las que queden fuera de la vista. Incluye un control para mostrar y ocultar anotaciones.
4. Muestra la definición, ubicación y función de la estructura seleccionada y enlaza a los retos relacionados. Registra la consulta en el almacenamiento compartido para que aparezca al volver a Mi progreso.

## Retos de anatomía

| Actividad | Interacción esperada |
| --- | --- |
| **Colocar etiquetas** | Arrastrar cada etiqueta a su destino o tocar la etiqueta y después el destino. Ambas acciones permiten completar el mismo reto. |
| **Seleccionar en 3D** | Identificar y seleccionar la pieza indicada en el modelo. La órbita y el zoom permiten inspeccionarla durante el reto. |
| **Relacionar estructura y función** | Emparejar cada estructura con la función que le corresponde. |
| **Repaso breve** | Responder preguntas cortas sobre las estructuras relacionadas. |

- En **Entrenamiento**, da retroalimentación al responder, ofrece pistas y permite reintentar. Conserva el resultado y las pistas realmente usadas.
- En **Evaluación**, reserva la corrección, las explicaciones y el resultado para el final. El resumen muestra los aciertos y errores, y cada error enlaza a la ficha de la anatomía correspondiente.
- Registra cada intento con el modo, la actividad y su desempeño mediante el servicio compartido. Los enlaces del resultado deben seguir funcionando al copiar el hash o al volver a él desde Mi progreso.

## Recursos y revisión

- Aprovecha los recursos anatómicos existentes cuya malla y nombre correspondan con la estructura. Completa las miniaturas, los modelos o nodos faltantes, las posiciones de las anotaciones y las actividades requeridas.
- Documenta la procedencia y la licencia de cada recurso agregado. Completa la fuente y el estado de revisión profesional en fichas y retos. Las ilustraciones, los textos y los datos pendientes de revisión conservan su identificación de material provisional.
- Comprueba con la malla visible que lateralidad, anclajes y flechas señalan la estructura descrita. Completa la revisión anatómica de las definiciones, ubicaciones, funciones y respuestas antes de marcar el contenido como revisado.

## Criterios de aceptación

- [ ] El catálogo permite abrir las tres categorías y filtrar por nombres en español o inglés. Las miniaturas corresponden a sus estructuras y un enlace directo abre la ficha correcta.
- [ ] La estructura se aísla y se distingue al girar o acercar. Las flechas siguen a sus puntos y el espacio de etiquetas se mantiene legible al girar, acercar y en una pantalla angosta. Las anotaciones se pueden ocultar.
- [ ] Cada ficha muestra ambos nombres, la acción de pronunciación, definición, ubicación, función y un camino a la práctica relacionada cuando exista.
- [ ] Se pueden completar las cuatro actividades. Colocar etiquetas funciona con arrastre y con toques.
- [ ] El entrenamiento ofrece retroalimentación inmediata, pistas y reintentos. La evaluación difiere la retroalimentación hasta el resultado y permite repasar anatomía desde cada error.
- [ ] Las consultas y los intentos con sus resultados se conservan tras recargar y se pueden consultar desde Mi progreso cuando ambos módulos estén integrados.
- [ ] Las pantallas, modelos y anotaciones manejan sus estados de carga, vacío o error. Verifica el flujo a 375 px, en escritorio y con teclado. Registra las pruebas, la compilación y el estado de los recursos y su revisión en el PR.
