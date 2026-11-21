# Inglés enfocado en tu carrera Implementation Plan

**Goal:** Inicio mediante perfil local, elección de Medicina, Gastronomía o Ingeniería de Sistemas y nivel básico/intermedio/avanzado; vocabulario y preguntas adaptados a ambos datos.
**Architecture:** Perfil validado en almacenamiento local; catálogos por carrera; generación de preguntas y progreso de carrera separados de la exploración del entorno. Mantener las funciones previas.
**Tech Stack:** React, TypeScript, Vite, Three.js, Vitest y Playwright.

## Alcance y decisiones
- El usuario autorizó implementar el recorrido. Se continúa directamente en la rama actual conservando el módulo 3D ya creado.
- Perfil local, sin simular autenticación de servidor ni pedir contraseñas. Nombre, carrera y nivel autodeclarado. Cambio de perfil y salida disponibles; guardado robusto.
- Tres carreras exactas. Tres grupos de nivel: A1–A2, B1–B2, C1–C2; no representan un examen de certificación.
- Diez palabras iniciales por carrera; Sistemas conserva sus modelos. Medicina y Gastronomía muestran fichas y señalan modelos pendientes hasta incorporar GLB reales.
- Preguntas de traducción para básico, contexto con opciones para intermedio y definición en inglés con respuesta escrita para avanzado.
- Estadísticas de carrera separadas. No mezclar clases del detector cotidiano con vocabulario profesional.

## Tareas
- [x] Pruebas de perfil inválido/persistencia y preguntas por carrera/nivel; observar fallos.
- [x] Dominio de perfiles, catálogos y preguntas con progreso por carrera.
- [x] Inicio, edición/salida, portada personalizada, explorar objetos por carrera, practicar y colección.
- [x] Adaptar fixtures de regresión para usuarios con perfil; añadir recorrido real de inicio y cambios de carrera/nivel.
- [x] Pruebas completas, build, navegador, revisión independiente y documentación.

## Riesgos de revisión
Almacenamiento bloqueado/corrupto; cambiar carrera con cámara activa; preguntas obsoletas tras cambiar nivel; mezclar estadísticas de carreras; presentar modelos inexistentes como disponibles.

Resultado final: 38 pruebas unitarias, 25 de navegador y build aprobados. Revisión independiente detectó pérdida de estado al abrir el editor; se corrigió conservando LearningApp y suspendiendo cámara/audio. Revisión de la corrección sin hallazgos importantes. La memoria de sesión conserva el progreso incluso con almacenamiento bloqueado.

Capturas inspeccionadas: inicio móvil y escritorio, colección de Medicina. Enlace temporal verificado con HTTP 200 y el hash de la compilación nueva. Sin publicación de commits ni archivos GLB nuevos.
