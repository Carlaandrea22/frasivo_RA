import { describe, expect, it } from 'vitest';
import { createObjectTracker } from '../src/objectTracking';
import type { RawRecognition } from '../src/learning';

const chair = (x: number, score = .9): RawRecognition => ({ label: 'chair', score, box: { x, y: .2, width: .18, height: .35 } });

describe('identidad espacial independiente del vocabulario', () => {
  it('conserva la selección entre análisis lentos sin retener objetos indefinidamente', () => {
    const tracker = createObjectTracker();
    tracker.setFrameInterval(600);
    const id = tracker.update([chair(.1)], 0)[0].trackId;
    expect(tracker.expire(500)[0].trackId).toBe(id);
    expect(tracker.update([chair(.12)], 650)[0].trackId).toBe(id);
    expect(tracker.expire(2150)).toEqual([]);
  });
  it('mantiene dos sillas separadas y sus identidades aunque cambie el orden de confianza', () => {
    const tracker = createObjectTracker('scan-a');
    const first = tracker.update([chair(.1), chair(.65, .85)], 0);
    expect(first).toHaveLength(2);
    expect(new Set(first.map(t => t.trackId)).size).toBe(2);
    const leftId = first.find(t => t.box.x < .3)!.trackId;
    const rightId = first.find(t => t.box.x > .5)!.trackId;
    const moved = tracker.update([chair(.63, .95), chair(.12, .8)], 100);
    expect(moved.find(t => t.box.x < .3)!.trackId).toBe(leftId);
    expect(moved.find(t => t.box.x > .5)!.trackId).toBe(rightId);
  });
  it('elimina duplicados casi idénticos sin ocultar otro objeto de la misma clase', () => {
    const tracks = createObjectTracker().update([chair(.1), chair(.101, .8), chair(.7)], 0);
    expect(tracks).toHaveLength(2);
    expect(tracks.find(t => t.box.x < .3)!.score).toBe(.9);
  });
  it('suaviza el movimiento pequeño y conserva la confianza actual', () => {
    const tracker = createObjectTracker();
    const first = tracker.update([chair(.1)], 0)[0];
    const next = tracker.update([chair(.14, .7)], 100)[0];
    expect(next.trackId).toBe(first.trackId);
    expect(next.box.x).toBeGreaterThan(.1);
    expect(next.box.x).toBeLessThan(.14);
    expect(next.score).toBe(.7);
  });
  it('retira un objeto por su propia caducidad aunque siga viendo otro', () => {
    const tracker = createObjectTracker();
    const [a, b] = tracker.update([chair(.1), chair(.65)], 0);
    const partial = tracker.update([chair(.65)], 200);
    expect(partial.find(t => t.trackId === a.trackId)?.observed).toBe(false);
    expect(partial.find(t => t.trackId === b.trackId)?.observed).toBe(true);
    expect(tracker.timeUntilExpiry(200)).toBe(250);
    expect(tracker.expire(450).map(t => t.trackId)).toEqual([b.trackId]);
    expect(tracker.expire(650)).toEqual([]);
    expect(tracker.timeUntilExpiry(650)).toBeNull();
  });
  it('no reutiliza la identidad de un objeto que reaparece después de caducar', () => {
    const tracker = createObjectTracker();
    const old = tracker.update([chair(.1)], 0)[0].trackId;
    expect(tracker.update([chair(.1)], 500)[0].trackId).not.toBe(old);
  });
  it('no asigna a una taza la identidad de una silla ni a un salto lejano la identidad anterior', () => {
    const tracker = createObjectTracker();
    const old = tracker.update([chair(.1)], 0)[0].trackId;
    const next = tracker.update([chair(.75), { label: 'cup', score: .9, box: { x: .1, y: .2, width: .18, height: .35 } }], 100);
    expect(next.filter(t => t.observed).every(t => t.trackId !== old)).toBe(true);
  });
  it('descarta cajas inválidas, resultados inseguros y clases no habilitadas', () => {
    const invalid: RawRecognition[] = [chair(.2, .2), { ...chair(.1), box: undefined }, { ...chair(.1), label: 'banknote' }, { ...chair(.1), box: { x: NaN, y: .2, width: .2, height: .3 } }, { ...chair(.1), box: { x: 2, y: .2, width: .2, height: .3 } }, { ...chair(.1), box: { x: .2, y: .2, width: -1, height: .3 } }];
    expect(createObjectTracker().update(invalid, 0)).toEqual([]);
  });
  it('recorta cajas parcialmente fuera de imagen al área visible', () => {
    const [track] = createObjectTracker().update([{ ...chair(0), box: { x: -.1, y: .1, width: .3, height: .3 } }], 0);
    expect(track.box.x).toBe(0);
    expect(track.box.width).toBeCloseTo(.2);
  });
});
