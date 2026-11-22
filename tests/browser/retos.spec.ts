import { expect, test } from '@playwright/test';

test('agrupa las variantes de Ubica las partes y permite elegir un modelo o empezar al azar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos');
  await expect(page.locator('.retos-page article')).toHaveCount(4, { timeout: 2000 });
  await page.getByRole('link', { name: 'Elegir práctica' }).click();
  const modelo = page.getByRole('combobox', { name: 'Modelo o recorrido' });
  await modelo.selectOption('lungs');
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('region', { name: 'Modelo 3D de Pulmones' })).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.getByRole('button', { name: /^Pista/ })).toHaveCount(0);
  await expect(page.locator('.retos-drop')).toHaveCount(5);
  await expect(page.getByRole('group', { name: 'Recuadros fuera de vista' })).toBeVisible();
  const verResultado = page.getByRole('button', { name: 'Ver resultado', exact: true });
  await expect(verResultado).toBeDisabled();
  await expect(verResultado).toHaveAccessibleDescription('Coloca todas las etiquetas de este modelo para continuar.');
  const etiquetas = ['Lóbulo superior derecho', 'Lóbulo medio derecho', 'Lóbulo inferior derecho', 'Lóbulo superior izquierdo', 'Lóbulo inferior izquierdo'];
  for (const [i, etiqueta] of etiquetas.entries()) {
    await page.getByRole('group', { name: 'Etiquetas de partes' }).getByRole('button', { name: etiqueta, exact: true }).click();
    await page.getByRole('button', { name: `Recuadro ${i+1}, vacío`, exact: true }).click();
  }
  await verResultado.click();
  await expect(page.getByText('5 de 5', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Repetir', exact: true }).click();
  await expect(modelo).toHaveValue('lungs');
  await page.getByRole('link', { name: 'Volver a los retos' }).click();
  await page.getByRole('link', { name: 'Elegir práctica' }).click();
  await page.getByRole('button', { name: 'Aleatorio', exact: true }).click();
  await expect(modelo).toHaveCount(0);
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('region', { name: /^Modelo 3D de / })).toHaveAttribute('data-viewer-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('Señala la estructura abre huesos, músculos y órganos, y puede elegir al azar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos');
  const abrir = page.getByRole('link', { name: 'Elegir modelo para Señala la estructura', exact: true });
  await abrir.click();
  const selector = page.getByRole('combobox', { name: 'Modelo o recorrido' });
  await expect(selector.locator('optgroup').filter({ has: page.locator('option[value="tibia"]') })).toHaveAttribute('label', 'Huesos');
  const modelos = [
    ['tibia', 'Tibia'], ['biceps_brachii', 'Bíceps braquial'], ['lungs', 'Pulmones'],
    ['skull', 'Cráneo'], ['spine', 'Columna vertebral'], ['brain', 'Cerebro'],
    ['liver', 'Hígado'], ['small_intestine', 'Intestino delgado'], ['large_intestine', 'Intestino grueso'],
  ];
  for (const [id, nombre] of modelos) {
    await selector.selectOption(id);
    await page.getByRole('button', { name: 'Empezar reto' }).click();
    await expect(page.getByRole('region', { name: `Modelo 3D de ${nombre}`, exact: true })).toHaveAttribute('data-viewer-state', 'ready');
    await expect(page.getByRole('heading', { name: /^Toca:/ })).toBeVisible();
    await page.getByRole('button', { name: 'Salir', exact: true }).click();
    await page.getByRole('link', { name: 'Salir del reto' }).click();
    await abrir.click();
  }
  await page.getByRole('button', { name: 'Aleatorio', exact: true }).click();
  await expect(selector).toHaveCount(0);
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('region', { name: /^Modelo 3D de / })).toHaveAttribute('data-viewer-state', 'ready');
});

test('un modelo elegido en Señala guarda su resultado y se puede repetir', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#explorar/estructura/lungs');
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
  await page.getByRole('link', { name: 'Elegir modelo para Señala la estructura' }).click();
  const selector = page.getByRole('combobox', { name: 'Modelo o recorrido' });
  await expect(selector).toHaveValue('lungs');
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
  await expect(page.getByRole('group', { name: 'Piezas fuera de vista' })).toBeVisible();
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: `Pieza ${i}`, exact: true }).click();
    await page.getByRole('button', { name: i < 5 ? 'Siguiente' : 'Ver resultado', exact: true }).click();
  }
  await expect(page.getByText('5 de 5', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Repetir', exact: true }).click();
  await expect(selector).toHaveValue('lungs');
});

test('Señala ofrece siete piezas numeradas en el cráneo y la columna', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const [id, nombre] of [['skull', 'Cráneo'], ['spine', 'Columna vertebral']]) {
    await page.goto(`/#practicar/retos/senalar/estructura/${id}`);
    await expect(page.getByRole('combobox', { name: 'Modelo o recorrido' })).toHaveValue(id);
    await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar reto' }).click();
    await expect(page.getByRole('region', { name: `Modelo 3D de ${nombre}`, exact: true })).toHaveAttribute('data-viewer-state', 'ready');
    await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
    await expect(page.getByRole('button', { name: /^Pieza \d+$/ })).toHaveCount(7);
    for (let i = 1; i <= 7; i++) {
      await page.getByRole('button', { name: `Pieza ${i}`, exact: true }).click();
      await page.getByRole('button', { name: i === 7 ? 'Ver resultado' : 'Siguiente', exact: true }).click();
    }
    await expect(page.getByText('7 de 7', { exact: true })).toBeVisible();
  }
});

test('Entrenamiento permite usar una pista, corregir la respuesta y repasar el error guardado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos/repaso-musculos');
  await expect(page.getByRole('button', { name: 'Empezar reto' })).toBeVisible({ timeout: 2000 });
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await page.getByRole('button', { name: /Pista/ }).click();
  await expect(page.getByText('Piensa en el músculo de la cara anterior del brazo.')).toBeVisible();
  await page.getByRole('button', { name: /Cuádriceps femoral/ }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('Vuelve a intentarlo', { exact: true })).toBeVisible();
  const [ficha] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Ver en Explorar 3D' }).click(),
  ]);
  await expect(ficha.getByRole('heading', { name: 'Bíceps braquial', level: 1 })).toBeVisible();
  await ficha.close();
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await page.getByRole('button', { name: /Bíceps braquial/ }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: /Recto femoral/ }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText('2 de 2', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Repasar errores' }).click();
  await expect(page.getByRole('link', { name: 'Ver en Explorar 3D' })).toHaveAttribute('href', '#explorar/estructura/biceps_brachii');
});

test('Repaso breve permite elegir huesos, músculos u órganos y empezar al azar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos');
  await expect(page.locator('.retos-page article')).toHaveCount(4);
  const abrir = page.getByRole('link', { name: 'Elegir tema para Repaso breve', exact: true });
  await abrir.click();
  const tema = page.getByRole('combobox', { name: 'Tema', exact: true });
  await expect(tema.locator('optgroup')).toHaveCount(3);

  const repasos = [
    ['repaso-huesos', ['Tibia', 'Radio', 'Acetábulo', 'Tróclea humeral']],
    ['repaso-musculos', ['Bíceps braquial', 'Recto femoral']],
    ['repaso-organos', ['Ventrículo izquierdo', 'Tres', 'Intercambiar oxígeno y dióxido de carbono entre el aire y la sangre.']],
    ['repaso-huesos-ampliacion', ['Olécranon', 'Maléolo lateral', 'Manubrio']],
    ['repaso-musculos-ampliacion', ['Porción acromial', 'Cúbito', 'Levantar el talón']],
    ['repaso-organos-ampliacion', ['Región pilórica', 'Por la posición del hígado.']],
    ['repaso-craneo-columna', ['Frontal', 'Mandíbula', 'Región torácica', 'Atlas (C1)', 'Axis (C2)', 'Cóccix']],
    ['repaso-cerebro-digestion', ['Cerebelo', 'Bilis', 'Duodeno', 'Colon transverso']],
  ] as const;
  for (const [id, respuestas] of repasos) {
    await expect(tema.locator(`option[value="${id}"]`)).toHaveCount(1);
    await tema.selectOption(id);
    await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar reto' }).click();
    await expect(page.getByText(`Pregunta 1 de ${respuestas.length}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Pista/ })).toHaveCount(0);
    for (const [i, respuesta] of respuestas.entries()) {
      await page.getByRole('group', { name: 'Respuestas' }).getByRole('button', { name: respuesta, exact: true }).click();
      await page.getByRole('button', { name: i === respuestas.length-1 ? 'Ver resultado' : 'Siguiente', exact: true }).click();
    }
    await expect(page.getByText(`${respuestas.length} de ${respuestas.length}`, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Otro reto' }).click();
    await abrir.click();
  }

  await page.getByRole('button', { name: 'Aleatorio', exact: true }).click();
  await expect(tema).toHaveCount(0);
  await page.evaluate(() => { Math.random = () => .85; });
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('heading', { name: 'Cráneo y columna vertebral', exact: true })).toBeVisible();
  await expect(page.getByText('Pregunta 1 de 6', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Respuestas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('coloca etiquetas por arrastre y por toques en el modelo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#practicar/retos/partes-femur');
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.locator('.retos-drop')).toHaveCount(3);
  await expect(page.locator('.retos-drop--overlay').first()).toBeVisible();
  const ficha = (name: string) => page.getByRole('group', { name: 'Etiquetas de partes' }).getByRole('button', { name });
  const recuadro = (number: number) => page.getByRole('button', { name: new RegExp(`^Recuadro ${number},`) });
  await ficha('Cabeza del fémur').dragTo(recuadro(1));
  await expect(recuadro(1)).toHaveText(/Cabeza del fémur/);
  await ficha('Cuerpo del fémur').click();
  await recuadro(2).click();
  await recuadro(2).click();
  await expect(recuadro(2)).toHaveAccessibleName('Recuadro 2, vacío');
  await ficha('Cuerpo del fémur').click();
  await recuadro(2).click();
  await ficha('Cóndilos femorales').click();
  await recuadro(3).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('¡Correcto!')).toBeVisible();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText('3 de 3', { exact: true })).toBeVisible();
});

test('desde la ficha del fémur se elige un reto y se forman tres parejas', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#explorar/estructura/femur');
  await page.getByRole('link', { name: 'Practicar esta estructura' }).click();
  await expect(page.getByRole('link', { name: 'Elegir práctica' })).toHaveAttribute('href', '#practicar/retos/ubicar/estructura/femur');
  await page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' }).click();
  await expect(page.getByRole('combobox', { name: 'Tema', exact: true })).toHaveValue('femur-funcion');
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '¿Salir del reto?' })).toBeVisible();
  await page.keyboard.press('Escape');
  const funciones = page.getByRole('group', { name: 'Funciones' });
  for (const [nombre, funcion] of [['Fémur', /Soportar gran parte/], ['Tibia', /Transmitir el peso/], ['Rótula', /Mejorar la palanca/]] as const) {
    await expect(page.getByRole('heading', { name: nombre, exact: true, level: 3 })).toBeVisible();
    await funciones.getByRole('button', { name: funcion }).click();
  }
  await expect(page.getByRole('heading', { name: 'Revisa tus parejas' })).toBeFocused();
  const parejas = page.getByRole('region', { name: 'Tus parejas' });
  const pareja = (nombre: string) => parejas.getByRole('listitem').filter({ has: page.getByText(nombre, { exact: true }) });
  await parejas.getByRole('button', { name: 'Editar pareja de Fémur' }).click();
  await expect(page.getByRole('heading', { name: 'Fémur', exact: true, level: 3 })).toBeFocused();
  const intercambio = funciones.getByRole('button', { name: /Transmitir el peso/ });
  await expect(intercambio).toContainText('Intercambiar con Tibia');
  await intercambio.click();
  await expect(pareja('Fémur')).toContainText('Transmitir el peso');
  await expect(pareja('Tibia')).toContainText('Soportar gran parte');
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText('3 de 3', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('Relaciona permite escoger temas de las tres categorías o empezar al azar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos');
  await expect(page.locator('.retos-page article')).toHaveCount(4);
  const abrir = page.getByRole('link', { name: 'Elegir tema para Relaciona estructura y función' });
  await abrir.click();
  const tema = page.getByRole('combobox', { name: 'Tema', exact: true });
  await expect(tema.locator('optgroup')).toHaveCount(3);

  const ejemplos = [
    ['funcion-huesos', [['Hueso coxal', /Transmite cargas al miembro inferior/], ['Húmero', /palanca para los movimientos del brazo/], ['Radio', /pronación y supinación del antebrazo/]]],
    ['funcion-musculos', [['Bíceps braquial', /Flexiona el codo/], ['Cuádriceps femoral', /Extiende la rodilla/]]],
    ['funcion-organos', [['Corazón', /Mantiene la circulación pulmonar y sistémica/], ['Pulmones', /intercambiar oxígeno y dióxido de carbono/]]],
    ['funcion-huesos-ampliacion', [['Cúbito', /bisagra del codo/], ['Peroné', /Estabiliza el tobillo/], ['Esternón', /uniones anteriores de las costillas/]]],
    ['funcion-musculos-ampliacion', [['Deltoides', /Eleva el brazo hacia el lado/], ['Tríceps braquial', /Extiende el codo/], ['Gastrocnemio', /levantar el talón/]]],
    ['funcion-organos-ampliacion', [['Estómago', /Almacena el alimento/], ['Riñones', /Filtran la sangre/]]],
    ['funcion-craneo-columna', [
      ['Cráneo', /Protege el encéfalo/], ['Mandíbula', /dientes inferiores/],
      ['Columna vertebral', /protege la médula espinal/], ['Atlas (C1)', /inclinar la cabeza/],
      ['Axis (C2)', /apófisis odontoides/], ['Cóccix', /suelo pélvico/],
    ]],
    ['funcion-cerebro-digestion', [['Cerebro', /Integra la información sensorial/], ['Hígado', /produce bilis/], ['Intestino delgado', /absorbe la mayoría de los nutrientes/], ['Intestino grueso', /agua y las sales restantes/]]],
  ] as const;
  for (const [id, parejas] of ejemplos) {
    await expect(tema.locator(`option[value="${id}"]`)).toHaveCount(1);
    await tema.selectOption(id);
    await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar reto' }).click();
    const verResultado = page.getByRole('button', { name: 'Ver resultado', exact: true });
    await expect(verResultado).toHaveAccessibleDescription('Forma todas las parejas para continuar.');
    for (const [estructura, funcion] of parejas) {
      await expect(page.getByRole('heading', { name: estructura, exact: true, level: 3 })).toBeVisible();
      await page.getByRole('group', { name: 'Funciones' }).getByRole('button', { name: funcion }).click();
    }
    if (id === 'funcion-craneo-columna') {
      const resumen = page.getByRole('region', { name: 'Tus parejas' });
      for (const [estructura] of parejas) {
        await expect(resumen.getByRole('button', { name: `Editar pareja de ${estructura}`, exact: true })).toBeVisible();
      }
    }
    await verResultado.click();
    await expect(page.getByText(`${parejas.length} de ${parejas.length}`, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Otro reto' }).click();
    await abrir.click();
  }

  await page.getByRole('button', { name: 'Aleatorio', exact: true }).click();
  await expect(tema).toHaveCount(0);
  await page.evaluate(() => { Math.random = () => .85; });
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('heading', { name: 'Cráneo y columna vertebral', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Funciones' }).getByRole('button')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('Evaluación del corazón selecciona en 3D y guarda la corrección al terminar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/#practicar/retos/corazon-3d');
  await page.getByRole('button', { name: 'Evaluación', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar reto' }).click();
  await expect(page.getByRole('button', { name: /^Pista/ })).toHaveCount(0);
  await expect(page.locator('[data-viewer-state="ready"]')).toBeVisible();
  const canvas = page.locator('canvas');
  const size = await canvas.boundingBox();
  await canvas.click({ position: { x: size!.width * .58, y: size!.height * .40 } });
  await expect(page.getByText('Pieza seleccionada')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('.retos-feedback')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
  const pieza = page.getByRole('button', { name: 'Pieza 1', exact: true });
  await pieza.focus();
  await page.keyboard.press('Enter');
  await expect(pieza).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Mostrar números para seleccionar' }).click();
  await canvas.click({ position: { x: size!.width * .37, y: size!.height * .58 } });
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado del reto' })).toBeVisible();
  await expect(page.getByText('Respuesta correcta:', { exact: false }).filter({ hasText: 'Válvula mitral' })).toBeVisible();
  const data = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith('lumar.progress:v1:event:')).map(([, value]) => JSON.parse(value)));
  expect(data.filter(event => event.kind === 'practice' && event.activityId === 'corazon-3d')).toHaveLength(1);
  expect(data.filter(event => event.kind === 'demonstration' && event.activityId === 'corazon-3d')).toHaveLength(1);
  await page.getByRole('link', { name: 'Otro reto' }).click();
  await expect(page.getByRole('link', { name: /Último resultado:/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.getByText('Prácticas realizadas · 1')).toBeVisible();
});

test.describe('Ubica las partes con varios modelos', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 900 } });

  const retos = [
    { id: 'partes-huesos', modelos: [
      ['Tibia', 'Cóndilos tibiales', 'Cuerpo de la tibia', 'Maléolo medial'],
      ['Húmero', 'Cabeza del húmero', 'Cuerpo del húmero', 'Tróclea humeral'],
      ['Radio', 'Cabeza del radio', 'Cuerpo del radio', 'Apófisis estiloides'],
      ['Hueso coxal', 'Ilion', 'Isquion', 'Pubis', 'Acetábulo'],
      ['Rótula', 'Base de la rótula', 'Vértice de la rótula', 'Cara articular'],
    ] },
    { id: 'partes-musculos', modelos: [
      ['Bíceps braquial', 'Cabeza larga', 'Cabeza corta'],
      ['Cuádriceps femoral', 'Recto femoral', 'Vasto lateral', 'Vasto medial', 'Vasto intermedio'],
    ] },
    { id: 'partes-organos', modelos: [
      ['Corazón', 'Aurícula derecha', 'Ventrículo derecho', 'Aurícula izquierda', 'Ventrículo izquierdo'],
      ['Pulmones', 'Lóbulo superior derecho', 'Lóbulo medio derecho', 'Lóbulo inferior derecho', 'Lóbulo superior izquierdo', 'Lóbulo inferior izquierdo'],
    ] },
    { id: 'partes-craneo-columna', modelos: [
      ['Cráneo', 'Frontal', 'Parietales', 'Temporales', 'Occipital', 'Cigomáticos', 'Maxilares', 'Mandíbula'],
      ['Columna vertebral', 'Atlas (C1)', 'Axis (C2)', 'Región cervical', 'Región torácica', 'Región lumbar', 'Sacro', 'Cóccix'],
    ] },
    { id: 'partes-cerebro-digestion', modelos: [
      ['Cerebro', 'Hemisferio derecho', 'Hemisferio izquierdo', 'Cerebelo', 'Tronco encefálico'],
      ['Hígado', 'Porción hepática derecha', 'Porción hepática izquierda', 'Lóbulo caudado'],
      ['Intestino delgado', 'Duodeno', 'Yeyuno', 'Íleon'],
      ['Intestino grueso', 'Ciego', 'Colon ascendente', 'Colon transverso', 'Colon descendente', 'Colon sigmoide', 'Recto'],
    ] },
  ];

  for (const { id, modelos } of retos) test(`cambia entre los modelos de ${id} y suma todas las etiquetas`, async ({ page }) => {
    const entrenamiento = id === 'partes-musculos';
    if (entrenamiento) {
      await page.goto('/#practicar/retos/ubicar');
      await page.getByRole('combobox', { name: 'Modelo o recorrido' }).selectOption(id);
    } else await page.goto(`/#practicar/retos/${id}`);
    if (!entrenamiento) await page.getByRole('button', { name: 'Evaluación' }).tap();
    await page.getByRole('button', { name: 'Empezar reto' }).tap();
    let total = 0;
    for (const [index, [modelo, ...partes]] of modelos.entries()) {
      await expect(page.getByText(`Modelo ${index+1} de ${modelos.length}`, { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: `Modelo 3D de ${modelo}`, exact: true })).toHaveAttribute('data-viewer-state', 'ready');
      await expect(page.locator('.retos-drop')).toHaveCount(partes.length);
      const accionEvaluacion = index === modelos.length-1 ? 'Ver resultado' : 'Siguiente modelo';
      const avanzar = page.getByRole('button', { name: entrenamiento ? 'Comprobar' : accionEvaluacion, exact: true });
      await expect(avanzar).toBeDisabled();
      const etiquetas = page.getByRole('group', { name: 'Etiquetas de partes' });
      for (const [position, parte] of partes.entries()) {
        await etiquetas.getByRole('button', { name: parte, exact: true }).tap();
        await page.getByRole('button', { name: `Recuadro ${position+1}, vacío`, exact: true }).tap();
      }
      total += partes.length;
      await avanzar.tap();
      if (entrenamiento) {
        await expect(page.getByText('¡Correcto!', { exact: true })).toBeVisible();
        const accion = index === modelos.length-1 ? 'Ver resultado' : 'Siguiente';
        await page.getByRole('button', { name: accion, exact: true }).tap();
      } else await expect(page.locator('.retos-feedback')).toHaveCount(0);
    }
    await expect(page.getByText(`${total} de ${total}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });
});
