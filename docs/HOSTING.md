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
