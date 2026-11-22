# Regiones de huesos para Explorar

`huesos-regiones.glb` es un derivado de las mallas existentes de BodyParts3D:
**BodyParts3D, © The Database Center for Life Science licensed under CC
Attribution 4.0 International.** Fuentes y licencia:
[FUENTES.md](../../../../assets/anatomy/FUENTES.md).

Regenerar desde la raíz del repositorio:

```sh
node scripts/generate-explorar-regions.mjs
```

Cada hueso conserva su nodo raíz (`femur_left`, `tibia_left`, `humerus_left`,
`radius_left`). Sus hijos identifican las tres regiones disponibles en la
ficha, y `__base` contiene las superficies restantes. Se conservan todos los
triángulos, posiciones, normales y materiales originales; no se crean tapas
ni se muestran cortes físicos. El visor resalta únicamente la malla hija.

Las regiones se asignan por el centro de cada triángulo a máscaras geométricas
en las coordenadas originales del GLB. Los límites son **orientativos y
provisionales**, no segmentaciones anatómicas validadas. Requieren revisión
profesional antes de usarse como límites precisos en una evaluación.
