# Corazón en corte · Modelo de prueba

Prototipo didáctico en Blender con **15 estructuras seleccionables**. Es un **modelo esquemático de anatomía simplificada**. Las proporciones, la colocación de válvulas y vasos, los colores y la forma de las cavidades están simplificados para enseñar vocabulario. La vista anterior abierta permite distinguir las cuatro cámaras y las cuatro válvulas.

| Archivo | Tamaño (bytes) | Uso |
| --- | ---: | --- |
| [heart-cutaway.blend](heart-cutaway.blend) | 220 337 | Fuente editable. Contiene la colección de piezas y un estudio separado para la captura |
| [heart-cutaway.glb](heart-cutaway.glb) | 290 852 | Visor Three.js y prueba de Scene Viewer en Android |
| [heart-cutaway.usdz](heart-cutaway.usdz) | 720 627 | Exportación directa de Blender para probar Quick Look en iPhone |

Las mallas están en metros, con la punta inferior en el plano de colocación. Los materiales son planos y no tienen texturas externas ni compresión que exija un decodificador adicional. Cada nodo es una pieza independiente. `pulmonary_veins` agrupa dos entradas esquemáticas en una sola pieza seleccionable.

| Tipo | IDs de nodo |
| --- | --- |
| Cámaras | `right_atrium`, `right_ventricle`, `left_atrium`, `left_ventricle` |
| Válvulas | `tricuspid_valve`, `pulmonary_valve`, `mitral_valve`, `aortic_valve` |
| Vasos | `aorta`, `superior_vena_cava`, `inferior_vena_cava`, `pulmonary_trunk`, `right_pulmonary_artery`, `left_pulmonary_artery`, `pulmonary_veins` |

La fuente de Blender es para edición. Publicar los binarios GLB y USDZ para distribución. Queda pendiente validar colocación, orientación y materiales de AR en un Android y un iPhone físicos.

Chrome con Three.js r187 cargó los 15 IDs exactos y renderizó 16 604 triángulos. La prueba seleccionó un ventrículo con un clic en el modelo y una válvula desde la lista. Blender volvió a abrir la fuente y reimportó las 15 mallas del USDZ. [Vista renderizada en Blender](../../../docs/renovacion/corazon-blender.png) · [Verificación visual en Three.js](../../../docs/renovacion/corazon-threejs.png)

En esta revisión, la válvula aórtica se ubica en la salida del ventrículo izquierdo, junto a la base de la aorta. La válvula pulmonar se ubica en la salida del ventrículo derecho, junto a la base del tronco pulmonar.
