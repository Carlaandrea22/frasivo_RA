# Inglés enfocado en tu carrera

## Inicio y perfil

El primer acceso solicita nombre, carrera y nivel autodeclarado de inglés.
Solo hay tres carreras: Medicina, Gastronomía e Ingeniería de Sistemas.
Los niveles son Básico (A1–A2), Intermedio (B1–B2) y Avanzado (C1–C2).
Son grupos de práctica elegidos por el estudiante, no resultados de un examen.

El perfil ahora pertenece a una cuenta real con correo y contraseña, gestionada por el servidor y PostgreSQL. Registro, sesiones, cierre y progreso están documentados en [CUENTAS_DOCKER.md](CUENTAS_DOCKER.md). Los perfiles locales anteriores no se convierten automáticamente en cuentas.

Abrir el editor detiene cámara y audio. Volver sin cambios conserva la
práctica, lo escrito, los objetos de la sesión y la misión. Cambiar de carrera
o nivel reinicia el recorrido activo para evitar preguntas de otro perfil.

Si falla la conexión, los cambios se conservan en memoria mientras la página siga abierta y se ofrece reintentar. Al caducar o cambiar la sesión no se reenvía la cola anterior bajo otra cuenta.

## Colecciones y preguntas

Cada carrera tiene diez términos iniciales con significado, pronunciación
escrita, voz del dispositivo, ejemplo bilingüe y definición en inglés:

- Medicina: Heart, Brain, Lungs, Liver, Kidney, Stomach, Skull, Nephron,
  Alveoli y Cochlea.
- Gastronomía: Knife, Whisk, Cutting board, Saucepan, Rolling pin, Spatula,
  Colander, Mandoline, Immersion blender y Bain-marie.
- Sistemas: Array, Stack, Queue, Thread, Repository, Deployment, Framework,
  Middleware, Inheritance y Dependency.

La práctica de carrera propone diez preguntas por ronda. En Básico se
relaciona la palabra inglesa con la traducción; en Intermedio se elige el
término que completa una frase; en Avanzado se lee una definición en inglés
y se escribe el término. No se muestra la traducción como pista en los dos
últimos modos. Los aciertos suman diez puntos y las estadísticas se guardan
por carrera, conservándose al cambiar de nivel.

«Mis palabras» muestra primero la colección de la carrera. El vocabulario
general del entorno se conserva en una sección aparte, junto con la cámara
y la misión del aula anteriores. Esa práctica general sigue siendo básica
y no se presenta como contenido profesional adaptado.

## Disponibilidad de modelos

Sistemas conserva sus diez representaciones geométricas 3D. Medicina y
Gastronomía tienen fichas y práctica; indican «Modelo 3D pendiente» y no
solicitan cámara para un objeto sin modelo. Todavía no se recibieron archivos
GLB de esas dos colecciones. No se han sustituido modelos realistas por
imágenes ni por geometrías inventadas. Se incorporarán los archivos después.

El visor Three.js ahora se carga de forma diferida solo cuando se muestra
un modelo disponible. La PWA incluye los nuevos recursos en su caché.

## Archivos

- `src/profile/profile.ts`: contratos, validación y guardado de perfil.
- `src/profile/ProfileSetup.tsx`, `profile.css`: inicio y edición.
- `src/profile/sessionRepository.ts`: memoria de sesión y guardado durable.
- `src/careers/catalog.ts`: contenido por carrera.
- `src/careers/learning.ts`: preguntas y estadísticas por carrera.
- `src/careers/CareerLearning.tsx`: portada, colección y práctica.
- `src/objects/ExploreObjects.tsx`: selección por carrera y disponibilidad.

## Referencias de vocabulario anatómico

Las definiciones breves son contenido de aprendizaje de inglés, no instrucciones
clínicas. Se contrastaron los conceptos microscópicos con fuentes primarias:
[nefrona y función renal, NIDDK](https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work),
[intercambio gaseoso, NHLBI](https://www.nhlbi.nih.gov/health/lungs/breathing-benefits),
[cóclea, NIDCD](https://www.nidcd.nih.gov/glossary/cochlea).

## Validación

Pruebas unitarias de validación de perfiles, datos corruptos, almacenamiento
bloqueado, preguntas por carrera y nivel, estadísticas separadas y memoria
de sesión. Pruebas de navegador del inicio real, persistencia, edición,
cambio de carrera y nivel, cierre, puntos separados, práctica conservada al
cancelar y cámara pendiente liberada al editar. Se ejecuta además la suite
previa completa de exploración, misiones, 3D y funcionamiento offline.

Resultados finales: `npm test`, 38 pruebas aprobadas; `npm run build`, aprobado; `npm run test:e2e`, 25 pruebas aprobadas. Revisión independiente sin hallazgos importantes tras corregir la conservación de la práctica al abrir el editor. Capturas inspeccionadas: `profile-onboarding-desktop.png`, `profile-onboarding-mobile.png` y `profile-medicine-mobile.png`. El build conserva la advertencia informativa del tamaño del visor 3D (aproximadamente 144 kB comprimidos), cargado de forma diferida.
