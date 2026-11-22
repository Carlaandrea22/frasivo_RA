# LumAR · Anatomía humana

LumAR es una PWA educativa de anatomía humana en español. La pronunciación de los términos anatómicos en inglés usa clips de audio generados con Piper.

- **Cuerpo** permite consultar el atlas o ver capas de huesos, músculos y órganos sobre la cámara con MediaPipe Pose Lite. Puedes fijar una pose y abrirla en el visor 3D o en AR Quick Look en un iPhone compatible. El procesamiento de la cámara ocurre en el dispositivo.
- **Explorar 3D** ofrece un catálogo de estructuras con modelos interactivos, anotaciones y fichas de anatomía.
- **Retos** propone ejercicios de identificación, ubicación y relación de estructuras, con retroalimentación.
- **Casos clínicos** permite practicar entrevistas simuladas, relacionar síntomas con posibles causas y revisar el razonamiento clínico.
- **Mi progreso** reúne las estructuras consultadas y los resultados de retos y casos para volver a estudiar o practicar.

Retos y Casos clínicos se abren desde **Practicar**.

## Alojamiento

Cloudflare Pages publica LumAR desde `main`. El equipo integra y prueba los cambios en `Luis` antes de adelantar `main`. La URL pública está **pendiente**. [Configuración de Cloudflare Pages](docs/HOSTING.md)

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

Consulta la [visión del equipo](docs/LUMAR.md), la [arquitectura](docs/ARQUITECTURA.md) y la [guía de contribución](CONTRIBUTING.md). El [plan de renovación](docs/PLAN_RENOVACION.md) conserva el historial de Cuerpo y «Fijar».
