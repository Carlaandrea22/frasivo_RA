# Cuentas reales y PostgreSQL con Docker

## Arrancar

Requisitos: Docker Desktop con motor Linux iniciado. Desde la raíz:

```powershell
npm run docker:up
```

El script genera `.env` con secretos aleatorios si no existe. Compose crea:

- `db`: PostgreSQL 17, sin puerto publicado y con volumen persistente.
- `migrate`: migraciones versionadas y permisos, ejecutadas una vez por arranque.
- `app`: Node 24, API y aplicación en `http://localhost:4173`.

Abrir la app, elegir **Crear cuenta**, introducir correo, contraseña de
12–128 caracteres, nombre, carrera y nivel. Los perfiles locales anteriores
no son cuentas y no se importan automáticamente. No hay cuentas predeterminadas.

El avatar permite editar nombre/carrera/nivel o cerrar la sesión actual.
La misma cuenta puede iniciar sesión en otro navegador o dispositivo conectado
al mismo servidor. Las estadísticas se recuperan de PostgreSQL.

Para desarrollo de interfaz: mantener Docker encendido y ejecutar `npm run dev`.
Vite envía `/api` al servidor de cuentas en 4173. `npm run preview` usa 4174
y el mismo backend; es una vista previa adicional, no reemplaza PostgreSQL.

## Persistencia

El volumen `frasivo-explore_postgres-data` conserva usuarios, sesiones y
progreso aunque se recreen los contenedores. Para detenerlos sin borrar datos:

```powershell
npm run docker:stop
```

Para volver a arrancarlos: `npm run docker:up`. Conservar `.env`: contiene las
credenciales del volumen existente y la firma de sesiones. No versionarlo ni
compartirlo. El comando `docker compose down -v` borra el volumen y sus usuarios.
No es parte del arranque ni de las pruebas.

El enlace HTTPS temporal necesita la computadora, Docker y cloudflared activos.
Cambiar de hostname requiere volver a iniciar sesión porque la cookie pertenece
al dominio anterior; los usuarios y contraseñas siguen en la misma base.

## Autenticación y aislamiento

- Hash scrypt con sal aleatoria, N=32768, r=8, p=3. No se guarda la contraseña.
- Cookie de sesión opaca firmada, HttpOnly y SameSite=Lax; Secure en HTTPS.
- Sesiones en PostgreSQL, duración de siete días, identificador nuevo al entrar
  y destrucción al cerrar sesión. Cerrar una sesión no expulsa otros dispositivos.
- Token CSRF ligado a la sesión y comprobación de origen en todas las escrituras.
- Límites de intentos, tamaño de solicitudes y validación en el servidor.
- Cada consulta de progreso y perfil usa el identificador de la sesión, sin
  aceptar un usuario elegido por el cliente.
- El rol de la aplicación no es superusuario y no puede crear tablas. Las
  migraciones usan otro proceso y credenciales con permisos administrativos.
- Las rutas `/api` usan `no-store` y se excluyen del service worker. Ningún
  token, contraseña o perfil autenticado se obtiene de localStorage.

API: GET `/api/session`, POST `/api/register`, POST `/api/login`, POST
`/api/logout`, GET/PUT `/api/me`, GET/PUT `/api/progress`, GET `/api/health`.
Perfil y respuestas de sesión no incluyen el hash de la contraseña.

## Guardado y sesiones caducadas

El progreso se mantiene en memoria y se envía en una cola. Si falla la conexión
se muestra el aviso y un botón para reintentar. Recargar antes de completar el
guardado puede perder esos cambios pendientes. No se afirma que se hayan
guardado cuando falla la petición.

Los cambios se aplican como incrementos sobre el progreso actual, dentro de una
transacción con bloqueo por usuario y colección. Cada escritura lleva un UUID
persistente para reintentos: dos dispositivos no sobrescriben sus respuestas y
repetir una petición no duplica puntos. Los totales de otro dispositivo aparecen
en una pestaña abierta cuando se recarga; no hay actualización en tiempo real.

Si falta o cambia la sesión, se cancela la cola anterior y se consulta de nuevo
al servidor. No se reenvían respuestas pendientes bajo otra cuenta. Si falla el
cierre por falta de conexión, la interfaz lo informa y no simula haber salido.

## Alcance

Registro y login son reales. No hay verificación del correo, recuperación de
contraseña por email ni edición de email/contraseña: no se configuró un servicio
de correo. La cuenta requiere conexión para iniciar sesión; el modo offline conserva los
recursos educativos y el avance en memoria de una página que ya estaba abierta.
La puntuación es didáctica y no está diseñada para rankings competitivos.

## Pruebas

```powershell
npm test
npm run test:server
npm run test:docker
```

`test:docker` usa el proyecto separado `frasivo-explore-tests`, PostgreSQL y un
volumen exclusivos de pruebas, con aplicación en 4181. Ejecuta comprobaciones
de API reales y las pruebas de navegador. Las pruebas de regresión de interfaz
usan un mock de la frontera API; `auth-real.spec.ts` usa el servidor y PostgreSQL
sin mocks. Solo se crean cuentas sintéticas `@example.test` en esa base de pruebas.

También se comprobó que usuario, sesión y progreso sobreviven a recrear los
contenedores, manteniendo el volumen. La base de uso normal permanece separada.

Referencias: [scrypt y configuración recomendada, OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[sesiones, Express](https://github.com/expressjs/session),
[transacciones, node-postgres](https://node-postgres.com/features/transactions).

Resultados de esta implementación: 41 pruebas unitarias frontend, 3 de servidor, 4 de API y 28 de navegador aprobadas, además de build y revisión independiente. Se inspeccionaron las capturas `auth-login-mobile.png` y `auth-register-mobile.png`. En el túnel HTTPS se verificaron cookie Secure/HttpOnly/SameSite=Lax, respuesta no-store y rechazo401 de credenciales inválidas.
