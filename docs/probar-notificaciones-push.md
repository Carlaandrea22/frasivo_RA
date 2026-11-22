# Probar las notificaciones de LumAR con la app cerrada

La prueba programa un único aviso en el servidor. El minuto empieza cuando la pantalla confirma «Aviso programado». Puedes cerrar LumAR justo después y bloquear el teléfono. Deja la computadora encendida, con Internet y con el servidor de prueba abierto. La entrega al teléfono puede tardar un poco más de un minuto.

## Abrir la versión de prueba por HTTPS

Si usas Tailscale, conecta la computadora y el teléfono a la misma red de Tailscale. Busca el nombre DNS de la computadora en [Machines](https://login.tailscale.com/admin/machines) y sustituye `TU-DNS-TAILSCALE` por ese nombre completo en los comandos y el enlace de abajo. El enlace HTTP con la IP de la Wi-Fi no admite Web Push en el teléfono.

En una terminal, desde la carpeta del proyecto, ejecuta lo siguiente. Si faltan las dependencias, ejecuta `npm install` primero.

```bash
LUMAR_PUSH_SUBJECT=https://TU-DNS-TAILSCALE npm run push:test
```

Copia el «Código de prueba» que imprime la terminal. En otra terminal, habilita el acceso HTTPS privado al servidor.

```bash
tailscale serve --bg --https=8443 4186
```

Si Tailscale pide habilitar Serve o HTTPS, sigue el enlace que imprime o activa los [certificados HTTPS en Tailscale](https://tailscale.com/docs/how-to/set-up-https-certificates) y vuelve a ejecutar el comando. En Linux, si indica que necesitas permisos de administrador, ejecuta `sudo tailscale serve --bg --https=8443 4186`. También puedes usar un HTTPS de confianza que ya tengas y que reenvíe a `127.0.0.1:4186`, pasando su URL como `LUMAR_PUSH_SUBJECT` al iniciar la prueba.

## Hacer la prueba en el teléfono

1. Abre `https://TU-DNS-TAILSCALE:8443/#progreso/notificaciones` en el teléfono.
2. En Android, usa Chrome. En iPhone o iPad con iOS o iPadOS 16.4 o posterior, abre el enlace en Safari, elige **Compartir → Agregar a pantalla de inicio** y abre **LumAR Push** desde ese icono. Desde **Mi progreso** puedes volver a **Prueba de notificaciones** si el icono abre otra pantalla.
3. Ingresa el código de la terminal y toca **Preparar prueba**. Luego toca **Programar aviso en 1 minuto** y, si aparece el permiso de notificaciones, toca **Permitir**.
4. Cuando veas **Aviso programado**, cierra LumAR y bloquea el teléfono. Tras aproximadamente un minuto, busca **LumAR · Prueba de notificación** en la pantalla de bloqueo o en el centro de notificaciones. Si tienes un modo de concentración activo, revisa también el centro de notificaciones.
5. Si no ves el aviso, abre la prueba otra vez y vuelve a ingresar el código. La pantalla te dirá si el envío sigue programado, si el servicio push lo aceptó o si falló. El estado «aceptado» confirma que el servicio recibió el envío. La notificación visible en el teléfono confirma la entrega.

Al terminar, detén el servidor de prueba con `Ctrl+C`. Si habilitaste el puerto de prueba en Tailscale, puedes cerrarlo con `tailscale serve --https=8443 off`.
