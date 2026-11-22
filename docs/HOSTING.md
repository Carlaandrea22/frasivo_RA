# Publicar LumAR en Cloudflare Pages

Carla conecta `Carlaandrea22/frasivo_RA` desde **Workers & Pages → Crear aplicación → Pages → Conectar a Git**. [Integración con Git en Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)

| Campo | Valor |
| --- | --- |
| Rama de producción | `main` |
| Preset de framework | Ninguno |
| Comando de compilación | `npm run build` |
| Directorio de salida | `dist` |
| Directorio raíz | Dejar vacío |
| Variables de entorno | Ninguna obligatoria |

La versión de Node.js es `22.12.0` y Pages la lee de `.node-version`. [Imagen de compilación](https://developers.cloudflare.com/pages/configuration/build-image/)

## Flujo de publicación

1. El equipo trabaja en sus ramas y abre los pull requests hacia `Luis`, donde se integran los cambios.
2. Comprueba que GitHub Actions haya pasado para el commit de `Luis` y prueba ese commit en la vista previa de Pages.
3. Adelanta `main` hasta `Luis` mediante un avance directo (`git merge --ff-only origin/Luis`) y sube `main` sin `--force`. Cloudflare Pages compila y publica el commit de `main` con los despliegues automáticos de producción habilitados. [Control de ramas en Pages](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)

## Vistas previas de ramas

Activa los despliegues de vista previa para `Luis` y las demás ramas del equipo. `Luis` tiene el alias `https://luis.<proyecto>.pages.dev`, que apunta a su último despliegue correcto. Para comprobar un commit específico, usa el enlace del despliegue que aparece en el PR o en **Deployments**. [Despliegues de vista previa](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

## Fallos y vuelta a una versión anterior

- Si falla una compilación, abre **Workers & Pages → LumAR → Deployments**, elige el despliegue y entra en **View details → Build log**. [Diagnóstico de Pages](https://developers.cloudflare.com/pages/configuration/debugging-pages/)
- Para volver a una versión publicada, abre **Deployments**, busca un despliegue de producción que funcionara y selecciona **⋯ → Rollback to this deployment**. Confirma el cambio. [Rollback en Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- Cloudflare Pages y GitHub Actions ejecutan sus comprobaciones por separado. Revisa **Checks** antes de integrar un PR y comprueba el resultado de Actions en `main` y del despliegue en Pages después de publicar.

## Activar el chatbot (Carla)

1. En Cloudflare, abre **Workers & Pages → frasivo-ra → Settings → Variables and Secrets**.
2. Selecciona **Production** y pulsa **Add**. Escribe `OPENROUTER_API_KEY` como nombre, pega la clave en el valor y elige **Secret** o **Encrypt**, según cómo aparezca el control. Pulsa **Save**.
3. Selecciona **Preview** y repite el paso para guardar el secreto de ese entorno. Si quieres elegir otro modelo, agrega `OPENROUTER_MODEL` como variable de texto con un identificador de OpenRouter. `OPENROUTER_FALLBACK_MODELS` admite identificadores separados por comas. Elige modelos con proveedores que acepten la política de privacidad. [Secretos de Pages](https://developers.cloudflare.com/pages/functions/bindings/#secrets) · [Enrutamiento de OpenRouter](https://openrouter.ai/docs/guides/routing/provider-selection)
4. En **Settings → Functions → Compatibility Flags**, agrega `enable_request_signal` en **Production** y **Preview** si la fecha de compatibilidad es anterior al 17 de noviembre de 2026. Así el servidor recibe la cancelación cuando el estudiante pulsa «Detener». [Compatibilidad de `Request.signal`](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-requestsignal-for-incoming-requests)
5. En **Deployments**, vuelve a desplegar el último commit que incluya Chat, en cada entorno donde guardaste el secreto. Abre el menú del despliegue y elige **Retry deployment**. Pages genera `_routes.json` a partir de `functions/api/chat.ts` y limita la invocación a `/api/chat`. [Enrutamiento de Pages](https://developers.cloudflare.com/pages/functions/routing/#functions-invocation-routes)
6. Abre la pestaña **Chat**, elige «Explícame el fémur» y comprueba que se muestre la respuesta a medida que llega. Si aparece «El chat aún no está activado», revisa el secreto y confirma que el despliegue se volvió a ejecutar en el entorno correcto.

El modelo predeterminado es `qwen/qwen3-30b-a3b-instruct-2507`. Nebius Token Factory, un proveedor compatible con la política de privacidad, publica USD 0,10 por millón de tokens de entrada y USD 0,30 por millón de salida. [Catálogo y proveedores del modelo](https://openrouter.ai/qwen/qwen3-30b-a3b-instruct-2507)

Para probar localmente, guarda `OPENROUTER_API_KEY` en `.dev.vars`, en la raíz del worktree, y reinicia `npm run dev` o `npm run preview`. Git ignora el archivo. Usa los mismos nombres de variable que en Pages y conserva la clave fuera del código y de las variables públicas de Vite.
