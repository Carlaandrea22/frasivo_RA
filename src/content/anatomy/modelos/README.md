# Modelos de Explorar 3D

Cada GLB de `fichas/` corresponde a una ficha y se descarga al abrirla. El manifiesto registra la versión, el miembro ZIP, el concepto anatómico y el hash de cada fuente. BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. [Fuentes del atlas](../../../../assets/anatomy/FUENTES.md) · [Manifiesto de Explorar](../../../../scripts/explorar-detail-sources.json)

## Regenerar

Descarga los OBJ en las rutas del manifiesto bajo `assets/_fuentes/`. En Blender, carga el contenido de `scripts/prepare-explorar-detail.py` y llama a `prepare(model, repo, output)` para cada entrada de `fichas` del manifiesto. `repo` es la raíz absoluta del repositorio y `output`, el GLB de preparación con nombre `<id>.glb` en `assets/_fuentes/explorar-fase2/b/preparados/`. El script limpia la geometría, aplica el presupuesto de triángulos y exporta normales ponderadas, materiales PBR y oclusión ambiental en `COLOR_0`.

Desde la raíz del repositorio:

```sh
node scripts/generate-explorar-regions.mjs scripts/explorar-detail-sources.json --write-project-metadata
npm exec --yes --package=gltfpack@1.3.0 -- node scripts/generate-explorar-fichas.mjs
node scripts/generate-explorar-thumbnails.mjs
```

El generador asigna los triángulos preparados a los nodos de cada ficha, calcula los anclajes sobre su superficie y registra el recuento, el área y los límites de la fuente preparada. Para una prueba parcial, omite `--write-project-metadata` y pasa directorios de entrada y salida alternativos. La compresión Meshopt conserva los nombres de los nodos y cuantiza posiciones y normales. El corazón en corte de LumAR conserva sus 15 partes y coordenadas.

Cuando hay OBJ separados, los nombres de región siguen la clasificación del manifiesto. Cuando comparten una superficie, el script transfiere las regiones de referencia a los nuevos triángulos. Las regiones estimadas y los anclajes siguen pendientes de revisión anatómica. [Procedencia por ficha y mediciones](../../../../docs/renovacion/explorar-modelos/fase2/b/README.md)
