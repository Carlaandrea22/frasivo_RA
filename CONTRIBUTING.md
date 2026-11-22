# Contribuir a LumAR

`Luis` es la rama de integración de LumAR. `main` conserva la app anterior hasta que el equipo decida integrar LumAR. La persona A mantiene la base, Cuerpo, AR y los puntos compartidos. B implementa [Explorar 3D y Retos de anatomía](docs/tareas/persona-b-explorar-retos.md). C implementa [Casos clínicos y Mi progreso](docs/tareas/persona-c-casos-progreso.md). Los contratos y las rutas están en la [arquitectura](docs/ARQUITECTURA.md).

## Trabajar en paralelo

1. Parte de `Luis`, que contiene la base compartida. Crea tu propia rama con `git switch -c codex/<tu-modulo> Luis`, sustituyendo `<tu-modulo>` por `explorar-retos`, `casos-progreso` o el nombre de tu tarea.
2. Trabaja en los archivos de tu módulo y de su contenido. Registra nuevas rutas desde el `routes.ts` del módulo. Si necesitas cambiar `src/shared/` o `src/content/types.ts`, acuerda con A el contrato y el orden de integración. Avisa al otro módulo si el cambio afecta identificadores o enlaces que consume.
3. Haz commits pequeños que agrupen cambios relacionados y expliquen qué se modificó. Abre el PR con `Luis` como destino. Incluye los pasos de verificación, la evidencia de pruebas y los recursos o contenidos aún provisionales.
4. A integra los PR y verifica los enlaces entre módulos, las rutas antiguas, el progreso de una instalación previa y el flujo existente de Cuerpo y AR.

## Desarrollo y verificación

Usa Node.js 22.12 o superior y npm. La instalación prepara los recursos de MediaPipe. Si esa preparación se interrumpe, vuelve a ejecutarla con `npm run assets`.

```sh
npm ci
npm run dev
```

Antes de pedir la revisión, ejecuta las pruebas y la compilación. Usa las pruebas de navegador para verificar recorridos de interfaz y los enlaces entre rutas. La suite requiere Chrome.

GitHub Actions ejecuta **Build y pruebas en Chrome** en cada PR dirigido a `Luis` y cada push a esa rama. El pull request debe pasar esta revisión antes de unirse. Si Playwright falla, los artefactos de la ejecución incluyen el reporte y las capturas disponibles.

```sh
npm test
npm run build
npm run test:e2e
```

Revisa el flujo en móvil y escritorio, la navegación con teclado y Atrás/Adelante, los enlaces directos y la persistencia tras recargar. Para probar cámara y AR en un teléfono compatible, sirve la compilación por HTTPS. Documenta en el PR las comprobaciones físicas que sigan pendientes.

### Probar un PR en el celular

1. Abre el PR hacia `Luis` y espera el despliegue de vista previa de Cloudflare Pages. Busca el enlace del último commit en el PR o en **Deployments** en Pages.
2. Abre ese enlace HTTPS en el navegador del celular. Si vas a probar Cuerpo, concede el permiso de cámara cuando la app lo solicite.
3. Anota en el PR el dispositivo, el navegador y el recorrido que probaste. La vista previa y GitHub Actions tienen estados independientes. [Configuración del alojamiento](docs/HOSTING.md)

## Contenido didáctico

- Escribe la interfaz y las explicaciones en español. Usa `EnglishTerm` para el término inglés de cada estructura y genera su clip con la voz compartida.
- Mantén identificadores estables para datos que ya tengan enlaces o actividad guardada. Registra la fuente, el estado de revisión profesional y los créditos de cada recurso incorporado según corresponda.
- Identifica textos, casos o recursos visuales provisionales y deja visible su estado mientras permanezcan pendientes de validación.

### Clips de pronunciación

Usa Python 3.12 e instala `piper-tts==1.8.0` e `imageio-ffmpeg` en un entorno virtual fuera del repositorio. Descarga `en_US-ljspeech-medium.onnx` y su archivo `.onnx.json` en `assets/_fuentes/voces/`. [Piper Voices](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/medium)

```sh
python3.12 -m venv /tmp/lumar-voz
/tmp/lumar-voz/bin/pip install piper-tts==1.8.0 imageio-ffmpeg
/tmp/lumar-voz/bin/python scripts/generate-cuerpo-audio.py \
  assets/_fuentes/voces/en_US-ljspeech-medium.onnx "English term"
```

Sin términos explícitos, el script completa el vocabulario de Cuerpo. Conserva los MP3 existentes y genera los nuevos a 48 kbps. Escucha el resultado antes de incorporar el MP3 a `src/content/anatomy/pronunciacion/`.
