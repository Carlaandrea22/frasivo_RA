# LumAR · Anatomía humana

LumAR combina la exploración de anatomía con la práctica inicial de entrevistas y razonamiento clínico. La interfaz está en español y las estructuras incluyen su término en inglés y pronunciación con la voz del dispositivo.

- **Cuerpo** muestra huesos, músculos y órganos sobre la cámara con MediaPipe Pose Lite. «Fijar esqueleto» conserva una pose para abrirla en el visor 3D o en AR Quick Look en iPhone compatible. El procesamiento ocurre en el dispositivo.
- **Explorar 3D**, **Retos de anatomía**, **Casos clínicos** y **Mi progreso** tienen pantallas base. Incluyen ejemplos provisionales para que el equipo complete cada módulo en paralelo.

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
