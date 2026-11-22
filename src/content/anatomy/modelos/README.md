# Regiones del atlas para Explorar

Los GLB de este directorio derivan de las mallas existentes de BodyParts3D:
**BodyParts3D, © The Database Center for Life Science licensed under CC
Attribution 4.0 International.** Fuentes y licencia:
[FUENTES.md](../../../../assets/anatomy/FUENTES.md).

Regenerar desde la raíz del repositorio:

```sh
node scripts/generate-explorar-regions.mjs
```

El cráneo incorpora la mandíbula del GLB de huesos. La columna incorpora
el atlas (`FJ3176`) y el axis (`FJ3177`) del archivo OBJ de BodyParts3D 4.0.
El mapa separa el cóccix en el estrechamiento inferior de la superficie
sacrococcígea `FJ3393`. Ese límite es orientativo y conserva todos los
triángulos de la malla de origen. Para regenerar el GLB que aporta las dos
vértebras, coloca sus OBJ en un directorio y usa el generador desde la raíz.

```sh
node scripts/generate-explorar-vertebrae.mjs directorio-con-los-obj
```

Cada estructura conserva su nodo raíz. Los hijos identifican las partes de
la ficha y `__base` contiene la superficie restante. Se conservan los
triángulos, posiciones, normales y materiales originales. El visor resalta
la malla hija que corresponde a la parte seleccionada.

El generador separa superficies independientes para el esternón, el bíceps,
el cuádriceps, el deltoides, el tríceps, el gastrocnemio, los pulmones y los
riñones. En el modelo pulmonar, los lóbulos medio y superior derechos forman
una superficie conectada. El generador estima su límite a partir de la
posición de los triángulos. También estima los límites del estómago y los
huesos que comparten una malla. El contenido, los límites y los anclajes
quedan pendientes de revisión anatómica.

El cráneo, la columna, el cerebro, el hígado y los dos intestinos reutilizan
los elementos anatómicos de BodyParts3D. El mapa asocia los triángulos de las
mallas reducidas con los elementos de su ontología PART-OF por proximidad a
los vértices originales. El ciego y el sigmoide tienen límites orientativos
porque comparten superficie con otras regiones del colon.

La generación de GLB usa el mapa incluido en el repositorio. Para regenerar
el mapa, usa NumPy y SciPy junto con los archivos de BodyParts3D 4.0 enlazados
en [FUENTES.md](../../../../assets/anatomy/FUENTES.md).

```sh
python scripts/map-explorar-atlas-regions.py partof_element_parts.txt isa_BP3D_4.0_obj_99.zip
node scripts/generate-explorar-regions.mjs
```
