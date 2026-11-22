import { describe, expect, it } from 'vitest';
import { estructuras } from '../src/content/anatomy/catalogo';
import { anotaciones } from '../src/content/anotaciones/anatomia';
import { filtrarEstructuras, distribuirEtiquetas } from '../src/features/explorar/atlas';

describe('atlas de Explorar', () => {
  it('busca sin tildes ni mayúsculas en ambos idiomas y respeta la categoría', () => {
    expect(filtrarEstructuras(estructuras, 'huesos', ' FÉMUR ').map(i => i.id)).toEqual(['femur']);
    expect(filtrarEstructuras(estructuras, 'organos', 'HEART').map(i => i.id)).toEqual(['heart']);
    expect(filtrarEstructuras(estructuras, 'musculos', 'femur')).toEqual([]);
  });
  it('tiene las quince partes del corazón y anclajes para cuatro huesos', () => {
    expect(estructuras.find(i => i.id === 'heart')?.partes).toHaveLength(15);
    for (const id of ['heart', 'femur', 'tibia', 'humerus', 'radius']) {
      const item = estructuras.find(i => i.id === id)!;
      expect(item).toBeDefined();
      expect(anotaciones.filter(a => a.estructuraId === id).map(a => a.parteId).sort())
        .toEqual(item.partes.map(p => p.id).sort());
    }
    for (const item of estructuras) {
      expect(item.miniatura).toBeTruthy();
      expect(item.revision.estado).toBe('provisional');
      for (const id of item.relacionadas) expect(estructuras.some(i => i.id === id)).toBe(true);
    }
    for (const note of anotaciones) {
      expect(note.punto).toHaveLength(3);
      expect(note.punto.every(Number.isFinite)).toBe(true);
    }
  });
  it('separa seis etiquetas, conserva la seleccionada y descarta puntos fuera de vista', () => {
    const points = Array.from({ length: 15 }, (_, i) => ({ id: String(i), x: 150 + i, y: 140, visible: true }));
    const labels = distribuirEtiquetas([...points, { id: 'hidden', x: 2, y: 2, visible: false }], 343, 420, '14');
    expect(labels).toHaveLength(6);
    expect(labels.some(l => l.id === '14')).toBe(true);
    expect(labels.some(l => l.id === 'hidden')).toBe(false);
    for (const side of ['left', 'right']) {
      const ys = labels.filter(l => l.side === side).map(l => l.labelY).sort((a,b) => a-b);
      expect(ys.every((y,i) => y >= 50 && y <= 380 && (!i || y - ys[i-1] >= 54))).toBe(true);
    }
  });
});
