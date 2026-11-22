# LumAR · Anatomía humana

LumAR es una PWA educativa de anatomía humana en español. La pronunciación de los términos anatómicos en inglés usa clips de audio generados con Piper.

- **Cuerpo** permite consultar el atlas o ver capas de huesos, músculos y órganos sobre la cámara con MediaPipe Pose Lite. Puedes fijar una pose y abrirla en el visor 3D o en AR Quick Look en un iPhone compatible. El procesamiento de la cámara ocurre en el dispositivo.
- **Explorar 3D** ofrece un catálogo de estructuras con modelos interactivos, anotaciones y fichas de anatomía.
- **Retos** propone ejercicios de identificación, ubicación y relación de estructuras, con retroalimentación.
- **Casos clínicos** permite practicar entrevistas simuladas, relacionar síntomas con posibles causas y revisar el razonamiento clínico.
- **Mi progreso** reúne las estructuras consultadas y los resultados de retos y casos para volver a estudiar o practicar.

Retos y Casos clínicos se abren desde **Practicar**.

La renovación disponible en `Luis` reúne 54 fichas, con 24 modelos renovados y 30 fichas provisionales nuevas habilitadas en Retos y Repaso. Las etiquetas de Cuerpo enlazan a la ficha correspondiente cuando está disponible. [Capturas y mediciones de Explorar 3D](docs/renovacion/explorar-modelos/fase2/f/README.md)

## Alojamiento

Cloudflare Pages publica LumAR desde `main`. El equipo integra y prueba los cambios en `Luis` antes de adelantar `main`. [App pública](https://frasivo-ra.pages.dev) · [Vista previa de Luis](https://luis.frasivo-ra.pages.dev) · [Configuración de Cloudflare Pages](docs/HOSTING.md)

## Desarrollo

Se requiere Node.js 22.12 o superior y npm. La primera instalación descarga Pose Landmarker Lite y prepara los archivos WASM de MediaPipe. Si se interrumpe, ejecuta `npm run assets`.

```sh
npm ci
npm run dev
```

La cámara requiere HTTPS o localhost. Para probar desde un teléfono, sirve la compilación mediante HTTPS y concede el permiso en el navegador. El atlas ilustrado se puede usar sin cámara.

## Producción y pruebas

```sh
npm test
npm run build
npm run test:e2e
npm run preview
```

Las pruebas de navegador requieren Chrome. En producción, el service worker de LumAR precarga recursos de la app, Pose Lite y WASM con SIMD. Los navegadores sin SIMD descargan su variante al activar la cámara con conexión y la guardan para usos posteriores.

Explorar descarga el GLB de cada ficha al abrirla y lo guarda para consultas sin conexión. Los clips incorporados con las diez fichas nuevas de órganos quedan disponibles sin conexión tras la primera reproducción.

Consulta la [visión del equipo](docs/LUMAR.md), la [arquitectura](docs/ARQUITECTURA.md), la [guía de contribución](CONTRIBUTING.md) y el [plan de renovación](docs/PLAN_RENOVACION.md).
