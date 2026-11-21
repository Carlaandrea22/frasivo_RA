# Frasivo Explore Implementation Plan

**Goal:** PWA independiente de reconocimiento y aprendizaje.
**Architecture:** React UI, detector en worker, dominio sin dependencia de React y persistencia versionada.
**Tech Stack:** TypeScript, React, Vite, MediaPipe, Vitest.
**Spec:** DISENO.md

## Global Constraints
Procesamiento local, sin guardar imágenes, etiquetas honestas, español para instrucciones, inglés para aprendizaje. Sin modificar otros proyectos. Desarrollo local autorizado por el usuario.

## Review Focus
Permisos denegados; cancelación durante carga; almacenamiento corrupto o bloqueado; opciones de ejercicios sin duplicados; funcionamiento offline tras preparación de recursos.

### Task 1: Dominio y recursos
- [x] Crear pruebas de filtrado por confianza y categorías, puntuación y persistencia robusta.
- [x] Ejecutar `npm test`: comprobar fallos por funcionalidad ausente.
- [x] Implementar `src/vocabulary.ts`, `src/learning.ts`, `src/storage.ts`.
- [x] Ejecutar suite y comprobar que pasa.

### Task 2: Cámara e interfaz
- [x] Implementar `src/detector.worker.ts`, `src/useCamera.ts`, `src/App.tsx`, `src/styles.css`.
- [x] Reutilizar tipos Word, Recognition, Progress y Question del dominio.
- [x] Probar práctica completa y errores de cámara en navegador; comprobar limpieza de captura.

### Task 3: PWA y entrega
- [x] Añadir manifiesto, iconos, service worker y documentación de ejecución e integración.
- [x] Ejecutar suite, build y revisión de escritorio/móvil.
- [x] Documentar límites medidos y pendientes de dispositivo real.
