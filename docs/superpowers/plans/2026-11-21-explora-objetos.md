# Explora objetos Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Añadir diez términos de software con escenas 3D interactivas sobre cámara.
**Architecture:** Catálogo independiente, fábrica de escenas Three.js, visor con renderizado bajo demanda y cámara sin detector, pantalla cargada de forma diferida desde App.
**Tech Stack:** React, TypeScript, Vite, Three.js, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-21-explora-objetos-design.md

## Global Constraints
Procesamiento local; ningún envío o guardado de imágenes. Conservar los módulos existentes. Diez términos con ejemplos bilingües. Sin anclaje espacial; identificarlo como 3D sobre cámara. Audio con voces del dispositivo.

## Review Focus
- Permiso pendiente al salir: detener también el stream que llegue tarde.
- WebGL ausente: ficha disponible y aviso claro.
- Fondo o cambio de sección: liberar cámara y recursos del visor.
- Diez términos distintos: escena y ficha deben corresponder a la selección.
- Navegación móvil: cinco destinos accesibles sin desbordamiento.

### Task 1: Contenido y escenas
Files: src/objects/catalog.ts, src/objects/scenes.ts, tests/software-objects.test.ts.
Interfaces: softwareTerms (SoftwareTerm[]); createSoftwareScene(id: SoftwareTermId): Group; disposeSoftwareScene(group: Group): void.
- [x] Crear prueba del catálogo bilingüe y geometrías finitas no vacías, observar fallo.
- [x] Instalar Three.js y tipos, implementar diez escenas procedurales diferenciadas.
- [x] Ejecutar pruebas del dominio.

### Task 2: Pantalla y cámara
Files: src/objects/ExploreObjects.tsx, ObjectViewer.tsx, useObjectCamera.ts, objects.css, src/App.tsx.
Interfaces: ExploreObjects({ onSpeak: (text: string) => void }); ObjectViewer({ termId }); useObjectCamera() con videoRef/start/stop/status/error.
- [x] Crear pruebas de recorrido en navegador, denegación y cancelación, observar fallo antes de la pantalla.
- [x] Construir lista, visor con controles táctiles y teclado, ficha y cámara independiente.
- [x] Añadir carga diferida y quinto destino móvil.
- [x] Verificar navegación, contenido, controles, audio, cámara tardía y alternativa sin WebGL.

### Task 3: Entrega
Files: README.md, docs/EXPLORA_OBJETOS.md.
- [x] Ejecutar npm test, npm run build y npm run test:e2e.
- [x] Inspeccionar capturas de escritorio y móvil y revisar diff.
- [x] Documentar resultados y límites reales. Sin commit ni publicación solicitados.

## Execution ledger
Diseño aprobado por el usuario. Ejecución directa en esta sesión; no se requiere nueva aprobación. Cambios de producto todavía no iniciados al escribir este plan.

Resultado: 33 pruebas unitarias y 20 pruebas de navegador aprobadas; build aprobado. Revisión independiente sin hallazgos importantes; corregida ruta del encabezado. Capturas de escritorio, móvil y cámara controlada inspeccionadas.

Decisión: mantener los cambios en una rama codex/explora-objetos del checkout actual para conservar la vista previa local. No se crearon commits ni se publicó a GitHub.
