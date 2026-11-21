import { expect, it } from 'vitest';
import { layoutLabels } from '../src/overlayLayout';
import { createObjectTracker } from '../src/objectTracking';

it('mantiene las etiquetas dentro de un visor móvil incluso junto a los bordes', () => {
  const tracks = createObjectTracker().update([{ label: 'chair', score: .9, box: { x: 0, y: 0, width: .1, height: .2 } }, { label: 'laptop', score: .8, box: { x: .9, y: .85, width: .1, height: .15 } }], 0);
  const labels = layoutLabels(tracks, { width: 350, height: 263 });
  expect(labels).toHaveLength(2);
  for (const l of labels) {
    expect(l.x).toBeGreaterThanOrEqual(0);
    expect(l.y).toBeGreaterThanOrEqual(0);
    expect(l.x + l.width).toBeLessThanOrEqual(350);
    expect(l.y + l.height).toBeLessThanOrEqual(263);
  }
});
it('separa etiquetas de dos objetos cercanos y conserva su identidad', () => {
  const tracks = createObjectTracker().update([{ label: 'chair', score: .9, box: { x: .2, y: .2, width: .15, height: .3 } }, { label: 'cup', score: .9, box: { x: .36, y: .2, width: .1, height: .15 } }], 0);
  const [a, b] = layoutLabels(tracks, { width: 350, height: 263 });
  expect([a.trackId, b.trackId]).toEqual(tracks.map(t => t.trackId));
  expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
});
it('no dibuja etiquetas en un contenedor sin dimensiones', () => {
  const tracks = createObjectTracker().update([{ label: 'chair', score: .9, box: { x: .2, y: .2, width: .2, height: .3 } }], 0);
  expect(layoutLabels(tracks, { width: 0, height: 0 })).toEqual([]);
});
