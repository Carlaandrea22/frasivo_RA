# Regiones del atlas para Explorar

Los GLB de este directorio derivan de las mallas existentes de BodyParts3D:
**BodyParts3D, © The Database Center for Life Science licensed under CC
Attribution 4.0 International.** Fuentes y licencia:
[FUENTES.md](../../../../assets/anatomy/FUENTES.md).

Regenerar desde la raíz del repositorio:

```sh
node scripts/generate-explorar-regions.mjs
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
