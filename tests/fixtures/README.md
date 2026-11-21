# Pose test fixture

`pose.jpg` is the upstream MediaPipe pose sample, fetched from https://storage.googleapis.com/mediapipe-assets/pose.jpg on 2026-11-21. It is used only by the browser integration test to exercise the real local model through a canvas camera stream, never shipped in the application. Upstream project: https://github.com/google-ai-edge/mediapipe.

- `pose-front.jpg` reproduce el retrato de [Library of Congress, cph.3c32093](https://www.loc.gov/pictures/item/2005692477/), de alrededor de 1870 y en dominio público. Se usan dos recortes del mismo original, cuerpo completo y torso sin caderas.
- `pose-back.jpg` es la miniatura de 500 px de [*Man Standing – Back View – Kolkata 2011-01-25 0239*](https://commons.wikimedia.org/wiki/File:Man_Standing_-_Back_View_-_Kolkata_2011-01-25_0239.JPG), de Biswarup Ganguly, bajo [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). La prueba reencuadra la foto y la captura incluye la interfaz.

Las fotos adicionales se consultaron el 21 de noviembre de 2026. Ambos archivos se usan únicamente como entrada de prueba y quedan fuera del build.
