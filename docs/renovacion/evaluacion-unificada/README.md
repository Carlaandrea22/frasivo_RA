# Evaluación unificada de LumAR

Retos de anatomía y Casos clínicos comparten la tarjeta de resultado, la mascota, el confeti, el selector de modo y las tarjetas de respuesta. El estilo «A · Suave» se aplica mediante los botones, tarjetas y controles segmentados de `src/shared/ui`.

| Aciertos | Reacción final |
| --- | --- |
| 80 % o más | Mascota en celebración y confeti |
| Desde 50 % hasta menos de 80 % | Mascota en reposo |
| Menos de 50 % | Mascota triste |

Con movimiento reducido, el confeti se oculta y la mascota conserva su expresión sin animación.

Al elegir un tipo clínico o la sesión mixta, el estudiante puede ajustar la cantidad, elegir Huesos, Músculos, Órganos o Aleatorio y seleccionar Entrenamiento o Evaluación. Si el tema tiene menos casos que los solicitados, el selector indica cuántos hay y ofrece empezar con esa cantidad. Las sesiones mixtas distribuyen los casos entre tantos tipos como sea posible. Repetir reinicia los mismos casos en el modo elegido.

Mi progreso muestra enlaces a los intentos de Retos y a los resultados por caso clínico. Los resultados clínicos se leen del registro local existente, incluidos los intentos históricos. Se conservaron las claves y el formato de guardado.

## Archivos de Carla y Nicolas

- En Retos, `src/features/retos/{Retos.tsx,Actividades.tsx,retos.css}` de la integración de Carla adopta el selector, las tarjetas y el resumen compartidos.
- En Casos, `src/content/casos/{session,readings,investigations,matchingCases}.ts` contiene las referencias de anatomía que se añadieron o corrigieron. Los casos generales sin una estructura pertinente siguen disponibles en Aleatorio.
- El flujo clínico de Nicolas en `src/features/casos` contiene el selector, el flujo, el resultado y la ruta que abre el historial. `src/features/progreso/PracticeSummary.tsx` añade el enlace a ese resultado.

## Capturas a 375 px

En las capturas de página completa, la navegación inferior aparece al pie.

| Pantalla | Antes | Después |
| --- | --- | --- |
| Inicio de Casos | [PNG](antes-casos-inicio.png) | [PNG](despues-casos-inicio.png) |
| Selector de Casos | [Modo global anterior](antes-casos-selector.png) | [Cantidad, tema y modo](despues-casos-selector.png) |
| Retos con resultado alto | [PNG](antes-retos-alto.png) | [PNG](despues-retos-alto.png) |
| Retos con resultado bajo | [PNG](antes-retos-bajo.png) | [PNG](despues-retos-bajo.png) |
| Casos con resultado alto | [PNG](antes-casos-alto.png) | [PNG](despues-casos-alto.png) |
| Casos con resultado bajo | [PNG](antes-casos-bajo.png) | [PNG](despues-casos-bajo.png) |

## Verificación

```sh
npm run build
npm test
E2E_PORT=4176 npm run test:e2e -- --workers=1
```

[Vista previa de luis-evaluacion](https://luis-evaluacion.frasivo-ra.pages.dev)
