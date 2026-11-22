# Pose test fixture

`pose.jpg` is the upstream MediaPipe pose sample, fetched from https://storage.googleapis.com/mediapipe-assets/pose.jpg on 2026-11-21. It is used only by the browser integration test to exercise the real local model through a canvas camera stream, never shipped in the application. Upstream project: https://github.com/google-ai-edge/mediapipe.

- `pose-front.jpg` reproduce el retrato de [Library of Congress, cph.3c32093](https://www.loc.gov/pictures/item/2005692477/), de alrededor de 1870 y en dominio público. Se usan dos recortes del mismo original, cuerpo completo y torso sin caderas.
- `pose-back.jpg` es la miniatura de 500 px de [*Man Standing – Back View – Kolkata 2011-01-25 0239*](https://commons.wikimedia.org/wiki/File:Man_Standing_-_Back_View_-_Kolkata_2011-01-25_0239.JPG), de Biswarup Ganguly, bajo [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). La prueba reencuadra la foto y la captura incluye la interfaz.

Las fotos adicionales se consultaron el 21 de noviembre de 2026. Ambos archivos se usan únicamente como entrada de prueba y quedan fuera del build.

## Primeros planos de Cuerpo

Playwright alimenta la cámara con estas imágenes usando un flujo de vídeo generado por un canvas. Las capturas de prueba en `docs/renovacion/cuerpo-regiones/` y `docs/renovacion/cuerpo-musculos-organos/` reencuadran los originales y añaden la interfaz de LumAR y, cuando el seguimiento lo permite, la capa anatómica.

| Archivo | Autor, fuente y licencia |
| --- | --- |
| `region-hand-open.jpg` | *Palm, fingers*, Genusfotografen (Tomas Gunnarsson) / Wikimedia Sverige. Miniatura de 500 px. [Original](https://commons.wikimedia.org/wiki/File:Palm,_fingers.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `region-hand-bent.jpg` | *Fist 1*, Mizunoryu. Miniatura de 330 px. [Original](https://commons.wikimedia.org/wiki/File:Fist_1.JPG) · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `region-hand-dorsal.jpg` | *Hand, fingers - back*, Genusfotografen (Tomas Gunnarsson) / Wikimedia Sverige. Miniatura de 500 px. [Original](https://commons.wikimedia.org/wiki/File:Hand,_fingers_-_back.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `region-face-front.jpg` | *President Barack Obama*, Pete Souza / White House. Recorte de la foto reutilizada por MediaPipe en `portrait.jpg`. Dominio público. [Original](https://commons.wikimedia.org/wiki/File:President_Barack_Obama.jpg) |
| `region-face-profile.jpg` | *Barack Obama profile*, foto de Pete Souza y recorte de Tktru. Miniatura de 500 px. [Original](https://commons.wikimedia.org/wiki/File:Barack_Obama_profile.jpg) · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `region-foot.jpg` | *Foot-outside*, Aarchiba. Miniatura de 330 px. Dominio público. [Original](https://commons.wikimedia.org/wiki/File:Foot-outside.jpg) |

Cada captura que reutiliza una foto CC BY-SA se distribuye bajo la misma licencia de la foto. Para torso y cuerpo completo se reutiliza el retrato de la Library of Congress citado arriba.
