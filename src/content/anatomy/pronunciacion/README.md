# Pronunciación de Explorar

Clips sintetizados con [Piper](https://github.com/OHF-Voice/piper1-gpl) y la
[voz femenina en inglés estadounidense `en_US-ljspeech-medium`](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD).
El repositorio del modelo indica licencia MIT y usa el [conjunto LJ Speech](https://keithito.com/LJ-Speech-Dataset/)
de dominio público, con grabaciones de Linda Johnson para LibriVox.
La app distribuye solo los clips. Se reproducen desde los recursos del atlas.

Para regenerar los MP3 con Python 3.12, instala `piper-tts==1.8.0` y
`imageio-ffmpeg`, descarga el modelo y su archivo `.onnx.json` desde
[Piper Voices](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/medium)
en un directorio de trabajo y ejecuta `python scripts/generate-explorar-audio.py RUTA/en_US-ljspeech-medium.onnx`.
Revisa la pronunciación de los términos nuevos antes de incorporarlos.
