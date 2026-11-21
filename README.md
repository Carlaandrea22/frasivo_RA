# Frasivo Explore · Anatomía humana

Atlas móvil de anatomía para aprender vocabulario técnico en inglés. La primera pantalla conserva la cámara corporal local con MediaPipe Pose Lite y superposición SVG de huesos, músculos y órganos. Las capas son ilustraciones aproximadas. La cámara se solicita al pulsar **Activar cámara** y las imágenes se procesan en el dispositivo.

El estado y las etapas pendientes se registran en [el plan de renovación](docs/PLAN_RENOVACION.md). El [corazón en corte](assets/anatomy/cardiovascular/README.md) está preparado como recurso didáctico esquemático para el visor 3D.

## Desarrollo

Se requiere Node.js 22.12 o superior y npm. La primera instalación descarga Pose Landmarker Lite y prepara los archivos WASM de MediaPipe. Si se interrumpe, ejecuta `npm run assets`.

```sh
npm ci
npm run dev
```

La cámara requiere HTTPS o localhost. Para probar desde un teléfono, sirve la compilación mediante HTTPS y concede el permiso en el navegador. El atlas ilustrado se puede usar sin cámara.

## Producción y pruebas

```sh
npm run build
npm test
npm run test:e2e
npm run preview
```

Las pruebas de navegador requieren Chrome. En producción, el service worker precarga Pose Lite, WASM con SIMD y fuentes. Los navegadores sin SIMD descargan su variante al activar la cámara con conexión y la guardan para usos posteriores. El catálogo ampliado, Congelar/Reanudar, el visor 3D y la AR nativa se incorporan en las siguientes etapas.
