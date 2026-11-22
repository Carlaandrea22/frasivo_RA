# Etapa F · Enlaces de Cuerpo, créditos y verificación

«Ver en Explorar 3D» abre la ficha correspondiente desde la etiqueta de Cuerpo. Los dos lados de mano y pie enlazan a las fichas de referencia derechas. Los huesos individuales de la cabeza enlazan al cráneo o a la mandíbula según corresponda. Las vértebras del cuello enlazan a la vértebra cervical típica y la tráquea abre la ficha de tráquea y bronquios principales.

Créditos identifica los ocho archivos de Human Reference Atlas adaptados para el catálogo, sus autores y su licencia. [Fuentes de los modelos](../../../../../assets/anatomy/FUENTES.md) · [Archivos HRA por ficha](../e/FUENTES.md)

## Capturas a 375 px

| Etiqueta en Cuerpo | Ficha en Explorar 3D | Evidencia |
| --- | --- | --- |
| Escápula | Escápula | [Enlace](enlace-escapula.png) · [Ficha](../c/ficha-scapula.png) |
| Falange proximal del índice | Mano ósea derecha | [Enlace](enlace-mano.png) · [Ficha](../c/ficha-hand.png) |
| Falanges del pie | Pie óseo derecho | [Enlace](enlace-pie.png) · [Destino después de pulsar](destino-pie.png) |
| Vejiga | Vejiga urinaria | [Enlace](enlace-vejiga.png) · [Ficha](../e/ficha-urinary_bladder.png) |

## Verificación

Las 54 fichas alcanzaron al menos **59,96 FPS** y el p95 máximo fue **18,70 ms**. Se midieron en Chrome 157 con Metal en un Apple M5 Pro, CPU 4× y viewport táctil de 375 × 812 px. El giro tuvo un segundo de calentamiento y tres segundos de muestreo, con las regiones, etiquetas y oclusión activas. El GLB más pesado fue el cráneo, con **648,080 kB**. [Triángulos, tamaño, FPS y p95 de cada ficha](giro-54-fichas.csv)

Los 362 clips de pronunciación, los 54 GLB de ficha y los recursos de Cuerpo coinciden byte a byte con la etapa E. El service worker precarga 427 recursos y **19.460.588 bytes**. Los 54 GLB de Explorar se descargan al abrir las fichas. Los 55 clips añadidos en la etapa E se guardan al reproducirlos por primera vez.

Pasaron `npm run build`, las 192 pruebas unitarias y las 120 pruebas de navegador con un trabajador. Las pruebas de navegador verifican los enlaces de escápula, pectoral, vejiga, mano y pie, y los ocho créditos de HRA.
