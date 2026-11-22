# Publicar LumAR en Cloudflare Pages

Carla conecta `Carlaandrea22/frasivo_RA` desde **Workers & Pages → Crear aplicación → Pages → Conectar a Git**. [Integración con Git en Pages](https://developers.cloudflare.com/pages/get-started/git-integration/)

| Campo | Valor |
| --- | --- |
| Rama de producción | `Luis` |
| Preset de framework | Ninguno |
| Comando de compilación | `npm run build` |
| Directorio de salida | `dist` |
| Directorio raíz | Dejar vacío |
| Variables de entorno | Ninguna obligatoria |

La versión de Node.js es `22.12.0` y Pages la lee de `.node-version`. [Imagen de compilación](https://developers.cloudflare.com/pages/configuration/build-image/)

## Vistas previas de ramas

Activa los despliegues de vista previa para las ramas del equipo. Cada rama tiene un alias con el formato `https://<rama-en-minúsculas>.<proyecto>.pages.dev`. Pages sustituye los caracteres no alfanuméricos de la rama por guiones. Para comprobar un commit específico, usa el enlace del despliegue que aparece en el PR o en **Deployments**. [Despliegues de vista previa](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

## Fallos y vuelta a una versión anterior

- Si falla una compilación, abre **Workers & Pages → LumAR → Deployments**, elige el despliegue y entra en **View details → Build log**. [Diagnóstico de Pages](https://developers.cloudflare.com/pages/configuration/debugging-pages/)
- Para volver a una versión publicada, abre **Deployments**, busca un despliegue de producción que funcionara y selecciona **⋯ → Rollback to this deployment**. Confirma el cambio. [Rollback en Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- Cloudflare Pages publica si su compilación pasa aunque GitHub Actions falle. Antes de unir un PR, revisa **Checks**. Después de actualizar `Luis`, revisa en **Actions** la ejecución del commit publicado.
