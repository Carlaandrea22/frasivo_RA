# Cuentas reales con Docker

**Objetivo:** reemplazar la entrada local por registro e inicio de sesión con correo y contraseña, usuarios en PostgreSQL, perfil y progreso por usuario.
**Arquitectura:** Node/Express sirve dist y API en el mismo origen. PostgreSQL 17 y aplicación Node 24 en Docker Compose, volumen persistente, base de datos sin puerto público. Mantener el túnel HTTPS existente hacia 4173.

## Decisiones
- Registro con nombre, email, contraseña de 12–128 caracteres, carrera y nivel.
- Hash scrypt con sal aleatoria; sesiones opacas en cookies HttpOnly/SameSite y store PostgreSQL; rotación al autenticar y destrucción al salir.
- Validación servidor, consultas parametrizadas, protección CSRF/origen, límite de intentos y cuerpos; respuestas de login genéricas. No almacenar contraseñas o tokens en localStorage ni caché PWA.
- Perfil y progreso se obtienen del servidor. No convertir automáticamente perfiles locales previos en cuentas ni mezclar estadísticas entre usuarios.
- Guardado de progreso en cola con estado y reintento; ninguna petición autenticada se almacena en el service worker.
- Sin recuperación por correo ni confirmación de email en esta entrega, porque no hay servicio de correo configurado. Indicar este límite en documentación.
- Secretos locales aleatorios, .env ignorado; .env.example sin secretos reales. Migraciones versionadas al arrancar, sin borrar datos.

## Tareas
- [x] Pruebas de hash, validación, API real/aislamiento y contrato de almacenamiento remoto; observar fallos.
- [x] Backend, migración SQL, sesiones y API de perfil/progreso.
- [x] Registro/login/cierre reales, perfil editable y sincronización; exclusión de /api en PWA.
- [x] Compose/Dockerfile, iniciar y verificar persistencia después de recrear contenedores.
- [x] Regresión de cámara/3D/misiones; pruebas de cuentas entre dos navegadores y dos usuarios.
- [x] Revisión independiente, build, pruebas completas y enlace HTTPS verificado.

## Revisar especialmente
Sesión falsificada/localStorage, contraseñas en respuestas/logs, CSRF, fuga entre usuarios, logout fallido, guardado pendiente al cambiar de cuenta y caché offline con datos de otro usuario.

Resultados finales: 41 pruebas unitarias frontend, 3 pruebas de hash/validación de servidor, 4 pruebas de API contra PostgreSQL y 28 pruebas de navegador aprobadas; compilación aprobada. Se verificó persistencia de usuario, cookie de sesión y progreso al recrear DB/app con su volumen. Revisión independiente: corregidas escrituras simultáneas mediante deltas/transacciones/idempotencia y recuperación de sesiones caducadas (403 SESSION_CHANGED). Revisión de las correcciones sin hallazgos importantes.

Aplicación de uso normal en Docker, 4173; base de pruebas separada detenida al terminar. HTTPS probado: sesión200, credenciales inválidas401, cookie Secure/HttpOnly/SameSite=Lax, API no-store. Enlace temporal nuevo porque el anterior dejó de resolver DNS. No se crearon cuentas predeterminadas en la base de uso normal.
