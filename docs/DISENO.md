# Frasivo Explore — diseño inicial

Solicitud: desarrollar una PWA independiente en esta carpeta, pendiente de conocer la tecnología de Frasivo. La autorización del usuario para comenzar permite avanzar con decisiones técnicas provisionales.

Objetivo: aprender vocabulario A1–A2 con objetos del entorno. Cámara → detecciones con confianza → ficha bilingüe y audio → tres ejercicios → resumen y progreso local.

Alternativas consideradas: web/PWA (elegida por el usuario, Frasivo ya es PWA); Android nativo (mayor distribución e integración separadas). React + TypeScript + Vite es una elección provisional del desarrollador, no una tecnología confirmada de Frasivo.

Límites: sin integración de cuentas, sin servicios de IA remotos, sin fotos guardadas, sin anclajes espaciales ni 3D. EfficientDet-Lite0 reconoce categorías COCO. El catálogo se amplió a 28 categorías compatibles tras la prueba del usuario; incluye objetos de clase, utensilios y alimentos. Door, Lamp, Banknote y Pen son vocabulario exclusivamente manual, sin clases inventadas del detector.

Arquitectura: vocabulario y evaluación puros; repositorio de progreso local sustituible; cámara con limpieza de recursos y detección en Web Worker; interfaz adaptable. Modelo y WASM se sirven desde el mismo origen. Service worker almacena aplicación y recursos para uso sin conexión tras instalación completa. Audio sujeto a las voces del sistema.

Dirección visual provisional: verde bosque #176454, menta #E8F3EC, papel #F8FAF7, tinta #183C34 y amarillo #E9C871. Tipografía system sans con encabezados amplios, alineación izquierda, visor como elemento principal, vocabulario lateral y navegación inferior móvil. No se afirma reproducir una identidad visual todavía desconocida.

Validación: pruebas de filtrado, cuestionarios, puntuación, datos dañados y almacenamiento; build TypeScript; navegador en escritorio/móvil; cámara real pendiente de hardware y permisos. Permiso denegado, falta de cámara y cancelación deben terminar captura y mostrar recuperación.
