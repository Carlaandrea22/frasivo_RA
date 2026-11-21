# Frasivo Explore

Aplicación independiente de inglés enfocado en tu carrera, con reconocimiento de objetos, escenas 3D y cuentas propias en PostgreSQL. Todavía no está conectada a los servicios de la aplicación Frasivo original.

## Clonar desde GitHub

```shell
git clone https://github.com/Carlaandrea22/frasivo_RA.git
cd frasivo_RA
npm install
npm run docker:up
```

El contenido de `frasivo-explore` está en la raíz del repositorio. `npm install` prepara el modelo y WASM; `npm run dev` genera el worker antes de iniciar. No se versionan `node_modules`, `dist`, modelos descargados, bundles generados ni archivos `.env`. La primera instalación requiere conexión a internet.

## Ejecutar en Windows

Requiere Node.js 22.12+ o 24+, npm y Docker Desktop con el motor Linux iniciado. Docker usa Node 24 y PostgreSQL 17.

```powershell
cd C:\Users\User\Documents\Tareas\frasivo-explore
npm install
npm run docker:up
```

Abre http://localhost:4173, crea tu cuenta con correo y contraseña y elige carrera y nivel. Para desarrollar la interfaz, mantén Docker encendido y ejecuta `npm run dev` (normalmente http://localhost:5173). Activa la cámara y acepta el permiso. Para probar sin cámara, pulsa **Probar sin cámara**, selecciona objetos y entra en **Practicar**. Las selecciones manuales se identifican como tales.

La instalación descarga un modelo EfficientDet-Lite0 de Google (aprox. 7,3 MB) y copia WASM desde el paquete MediaPipe al directorio público. No necesita una API key. Si la descarga se interrumpe, ejecuta `npm run assets`. `package-lock.json` fija las dependencias; en una instalación reproducible puede usarse `npm ci`.

## Producción y PWA

```powershell
npm test
npm run build
npm run preview
```

La aplicación Docker está en http://localhost:4173; la vista previa adicional usa http://localhost:4174 y requiere el backend Docker activo. El service worker solo se registra en producción. Espera a que termine de instalar y almacenar los recursos (aprox. 30 MB incluyendo alternativas WASM), antes de cerrar o desconectar. En Chromium se puede instalar con el botón de la aplicación cuando el navegador lo ofrece; en iPhone usa la opción Añadir a pantalla de inicio de Safari. La disponibilidad de instalación depende del navegador.

Para probar cuentas reales y base de datos aislada usa `npm run test:docker`; ver `docs/CUENTAS_DOCKER.md`. Pruebas de navegador de regresión de interfaz con API simulada: después del build, ejecuta `npm run test:e2e`. Requieren Google Chrome instalado; Playwright abre una sesión temporal, inicia su propio servidor en el puerto 4175 y lo cierra al terminar. No usa tu cámara física: prueba denegación/cancelación con una captura controlada y ejecuta el detector real con una imagen vacía. No mide precisión sobre objetos reales.

Para usar la cámara desde un celular real, expón el servidor completo (interfaz y API del puerto 4173) mediante HTTPS. Una dirección HTTP de la red local como `http://192.168.x.x:5173` normalmente no habilita cámara. `localhost` en el celular apunta al propio celular, no al equipo de desarrollo. El enlace temporal depende del túnel local; no hay alojamiento permanente incluido.

El modo sin conexión depende de que la caché haya terminado y el navegador la conserve. Interfaz, modelo, WASM, fuentes y vocabulario están en el mismo origen. Las voces de pronunciación dependen del dispositivo y algunas necesitan conexión. No se garantiza audio offline. Iniciar sesión requiere conexión al servidor; el progreso pendiente se mantiene en memoria hasta que pueda sincronizarse.

## Funcionalidades

- Cuentas reales con correo y contraseña, sesiones en PostgreSQL y perfil de carrera/nivel editable desde el avatar. Usuarios y progreso persistentes por cuenta. Arranque con `npm run docker:up`; ver `docs/CUENTAS_DOCKER.md`.
- Diez palabras iniciales por carrera y práctica adaptada: traducción, contexto o definición en inglés según el nivel. Progreso separado por carrera. Medicina y Gastronomía señalan sus modelos realistas como pendientes; Sistemas conserva sus diez escenas 3D. Ver `docs/PERFILES_CARRERAS.md`.
- Cinco secciones: **Explorar** (libre), **Explora objetos** (vocabulario de software en 3D), **Misiones** (retos guiados), **Practicar** y **Mis palabras**. Explorar y Misiones comparten cámara y progreso; Explora objetos usa una cámara sin detector y un catálogo independiente.
- **Explora objetos:** diez conceptos de software con representaciones 3D interactivas, significado, IPA, metáfora visual y ejemplo bilingüe. Selección desde una lista, giro, tamaño y pronunciación por botón con voces del dispositivo. Puede usarse sin cámara o superpuesto al video. No incluye anclaje espacial. Ver `docs/EXPLORA_OBJETOS.md`.
- Misión del aula: elegir tres objetos, escuchar cada reto, seleccionarlos en la cámara y hacer tres ejercicios. Máximo 60 puntos: 10 por cada objeto encontrado y 10 por cada respuesta correcta. Ver `docs/MISION_AULA.md` para el diseño, pruebas y límites.

- Cámara trasera preferida, vista previa, activar/detener, avisos de permisos y errores.
- Etiquetas 2D bilingües sobre cada objeto, selección táctil/teclado y contorno del objeto seleccionado. Dos objetos de la misma clase tienen identidades distintas; las palabras de la sesión se mantienen únicas.
- Seguimiento geométrico básico con suavizado y caducidad individual adaptada a la velocidad del equipo. La ficha existente conserva pronunciación y ejemplos y permite practicar únicamente la palabra seleccionada. Ver `docs/NIVEL2.md` para alcance, pruebas y límites.
- Detector local en un Web Worker, con una imagen en vuelo y pausas entre inferencias.
- Cadencia adaptativa de hasta 10 análisis/s según el dispositivo, indicador de rendimiento y tolerancia visual breve de 450–1500 ms según la cadencia, sin elevar la confianza. Ver `docs/RENDIMIENTO.md` y `docs/NIVEL2.md` para las mediciones y sus límites.
- Etiquetas y recuadros normalizados; solo categorías admitidas con confianza >= 65%. La confianza es una puntuación del modelo, no una garantía de identificación.
- 28 categorías automáticas: silla, mesa de comedor, libro, laptop, botella, taza, celular, mochila, mouse, teclado, tijeras, reloj, control remoto, televisor, paraguas, bolso, maleta, tazón, cuchara, tenedor, cuchillo, banana, manzana, naranja, sándwich, pizza, cepillo de dientes y planta en maceta. El modelo no garantiza detectar objetos pequeños, ocluidos, mal iluminados o mesas de cualquier tipo. La app muestra la lista en «¿Qué puedo reconocer con la cámara?».
- 32 fichas bilingües con IPA y pronunciación. Door, Lamp, Banknote y Pen son exclusivamente manuales y están indicados como «Solo manual». No hay detección ni identificación de denominaciones de billetes.
- Tres ejercicios: identificar, escribir una palabra y relacionar inglés con español. Usa primero palabras de la sesión; si faltan distractores se toman del catálogo.
- Diez puntos por acierto; resumen de sesión; aciertos, errores y palabras para repasar.
- Progreso versionado por usuario en PostgreSQL, con cola de sincronización e incrementos idempotentes para conservar respuestas de distintos dispositivos. Una palabra se considera reforzada con >= 2 aciertos y precisión >= 80%; descubrirla no la marca automáticamente como aprendida.
- Cambio de pestaña o aplicación detiene el escaneo. No se pide micrófono, no se guardan fotos ni se envían a un servidor.

## Estructura e integración futura

| Archivo | Responsabilidad |
| --- | --- |
| `src/App.tsx`, `src/styles.css` | Pantallas y diseño adaptable provisional |
| `src/Practice.tsx` | Ejercicios y resumen de sesión |
| `src/missions/` | Misión del aula, transiciones, objetivos, audio solicitado y resumen |
| `src/vocabulary.ts` | Catálogo bilingüe independiente de React |
| `src/SupportedObjects.tsx` | Categorías automáticas y límites del modelo visibles |
| `src/learning.ts` | Filtrado, preguntas y puntuación |
| `src/storage.ts` | Contrato de almacenamiento y adaptador local |
| `src/useCamera.ts` | Permisos y ciclo de vida de cámara/worker |
| `src/scanning.ts` | Cadencia de análisis y categorías admitidas |
| `src/objectTracking.ts` | Identidad temporal, asociación de detecciones y caducidad individual |
| `src/overlayLayout.ts`, `src/ObjectOverlay.tsx` | Colocación, interacción y selección de etiquetas 2D |
| `src/detector.worker.ts` | MediaPipe y detecciones normalizadas |
| `scripts/prepare-assets.mjs` | Modelo y WASM locales |
| `scripts/build-sw.mjs` | Caché versionada de producción |
| `scripts/build-worker.mjs` | Bundle de worker clásico compatible con el cargador WASM |
| `tests/` | Pruebas del dominio y almacenamiento |

Cuando se conozca Frasivo: reutilizar su navegación, sustituir el adaptador de progreso por sus servicios, adoptar sus estilos y revisar su política de caché. **No registrar este service worker por separado en el mismo scope que la PWA existente**: integrar sus recursos en el service worker de Frasivo. Las rutas absolutas actuales suponen despliegue en la raíz; si se monta en `/explore/`, adaptar base de Vite, rutas de recursos, manifiesto y scope. La lógica de vocabulario, preguntas y puntuación puede trasladarse aunque Frasivo no utilice React.

## Límites y pruebas en dispositivos

Explorar usa reconocimiento 2D con etiquetas sobre video. Explora objetos añade modelos 3D didácticos sobre la cámara; no hay anclajes espaciales ni avatares. Las cuentas sincronizan perfil y progreso entre dispositivos; los contadores de otra pestaña se actualizan al recargar. Los objetos de la sesión permanecen en memoria; se conservan las estadísticas de respuestas tras recargar. El progreso confirmado permanece en PostgreSQL al borrar los datos del navegador. La puntuación didáctica no sirve para rankings competitivos.

Hay que validar cámara trasera, precisión, batería, rendimiento y voces en los Android/iPhone objetivo antes de publicar. Ver `docs/VERIFICACION.md` para distinguir comprobaciones realizadas y pendientes.

Modelo: [MediaPipe Object Detector](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector). Requisitos de cámara: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Revisar las licencias de las dependencias y del modelo para la distribución final.
