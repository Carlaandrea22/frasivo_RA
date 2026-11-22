import type { Estructura } from '../../content/types';
import type { Viewer3DProjectedAnchor } from '../../shared/visor3d/Viewer3D';

const normalize = (s: string) => s.trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
export function filtrarEstructuras(items: readonly Estructura[], categoria: string, search: string) {
  return items.filter(i => i.categoria === categoria && normalize(`${i.nombreEs} ${i.terminoEn}`).includes(normalize(search)));
}

export function distribuirEtiquetas(points: readonly Viewer3DProjectedAnchor[], width: number, height: number, selected?: string) {
  const limit = width < 600 ? 6 : 12;
  const candidates = points.filter(p => p.visible && p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height)
    .sort((a,b) => Number(b.id === selected) - Number(a.id === selected)).slice(0, limit).sort((a,b) => a.x-b.x);
  return (['left', 'right'] as const).flatMap((side, sideIndex) => {
    const half = Math.ceil(candidates.length / 2);
    const group = candidates.slice(sideIndex ? half : 0, sideIndex ? undefined : half).sort((a,b) => a.y-b.y);
    const gap = Math.min(62, (height - 100) / Math.max(1, group.length-1));
    let last = 50 - gap;
    const ys = group.map(p => { last = Math.max(last+gap, Math.min(height-40, Math.max(50, p.y))); return last; });
    for (let i = ys.length-1; i >= 0; i--) ys[i] = Math.min(ys[i], i === ys.length-1 ? height-40 : ys[i+1]-gap);
    return group.map((p,i) => ({ ...p, side, labelX: side === 'left' ? 6 : width-6, labelY: ys[i] }));
  });
}
