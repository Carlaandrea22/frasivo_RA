import type { Matrix } from './anatomy';

export interface BoneTarget {
  id: string;
  x: number;
  y: number;
  centerX?: number;
  source?: string;
  lateral?: boolean;
}

export const posteriorBoneLabels = ['scapula', 'spine', 'ribs', 'sacrum', 'pelvis', 'femur'];

type Point = readonly [number, number];
type Side = 'left' | 'right';

// Local coordinates of opaque points in the orthographic atlas renders.
// The two points on a central mesh let the arrow approach it from either side.
const spritePoints: Record<string, readonly Point[]> = {
  skull: [[.249, .289], [.749, .289]],
  mandible: [[.249, .749], [.749, .749]],
  sternum: [[.399, .450], [.601, .450]],
  spine: [[.401, .580], [.599, .580]],
  ribs_left: [[.820, .461]],
  ribs_right: [[.180, .461]],
  pelvis_left: [[.770, .200]],
  pelvis_right: [[.229, .200]],
  ulna_left: [[.496, .501]],
  ulna_right: [[.496, .501]],
  radius_right: [[.497, .501]],
  humerus_right: [[.497, .501]],
  femur_left: [[.497, .501]],
  femur_right: [[.497, .501]],
  tibia_left: [[.504, .501]],
  fibula_left: [[.492, .501]],
  fibula_right: [[.492, .501]],
  metacarpals_left: [[.478, .499]],
  metacarpals_right: [[.520, .507]],
  foot_phalanges_left: [[.482, .513]],
  foot_phalanges_right: [[.520, .512]],
};

export function boneSpritePoints(id: string, [x, y, w, h]: readonly number[]): Point[] {
  return (spritePoints[id] ?? [[.5, .5]]).map(([u, v]) => [x + u*w, y + v*h]);
}

export function applyBoneTransform([a,b,c,d,tx,ty]: Matrix, [x,y]: Point): Point {
  return [a*x+c*y+tx, b*x+d*y+ty];
}

const centerBones = new Set(['skull', 'mandible', 'ribs', 'spine', 'sternum', 'pelvis', 'sacrum']);
const margin = 8;
const gap = 6;

function targetSide(target: BoneTarget): Side {
  return target.x < (target.centerX ?? .5) ? 'left' : 'right';
}

function room(target: BoneTarget, side: Side) {
  return side === 'left' ? target.x : 1 - target.x;
}

export function arrangeBoneLabels(targets: readonly BoneTarget[], ids: readonly string[], selected: string | undefined, size: {
  width: number; height: number; reservedTop?: number; reservedBottom?: number; cardHeight?: number;
}) {
  const { width, height, reservedBottom = height > 440 ? 76 : 10, cardHeight = 62 } = size;
  if (width <= 0 || height <= 0) return [];
  const cardWidth = Math.min(130, Math.max(86, width*.29));
  const firstTop = Math.max(margin, size.reservedTop ?? 0);
  const latestTop = height - reservedBottom - cardHeight;
  if (latestTop < firstTop) return [];
  const capacity = Math.min(6, 1 + Math.floor((latestTop - firstTop) / (cardHeight + gap)));
  const columns: Record<Side, BoneTarget[]> = { left: [], right: [] };
  const visibleBottom = height - (size.reservedBottom ?? 0);
  const visible = targets.filter(target => target.x >= 0 && target.x <= 1 && target.y >= 0
    && target.y*height <= visibleBottom);
  const central = new Set(centerBones);
  for (const target of visible) if (target.lateral) central.delete(target.id);
  // A touched lateral bone keeps the same side. Reserve those slots before
  // using the roomier column for bones around the midline.
  const orderedIds = [...new Set(ids)].slice(0, 6).sort((a, b) =>
    Number(b === selected) - Number(a === selected) || Number(central.has(a)) - Number(central.has(b)));
  for (const id of orderedIds) {
    const matches = visible.filter(target => target.id === id);
    const options = (id === selected && !central.has(id) ? matches.slice(0, 1) : matches)
      .map(target => ({ target, side: targetSide(target) }))
      .filter(({side}) => columns[side].length < capacity)
      .sort((a,b) => {
        const space = (room(b.target, b.side) - room(a.target, a.side))*width;
        // Significant extra clearance wins. In a nearly centered view,
        // balance the columns without sending arrows across the subject.
        return Math.abs(space) > 34 ? space : columns[a.side].length - columns[b.side].length || space;
      });
    if (options.length) columns[options[0].side].push(options[0].target);
  }

  return (['left', 'right'] as const).flatMap(side => {
    const sort = columns[side].sort((a,b) => a.y - b.y);
    const columnX = side === 'left' ? margin : width-cardWidth-margin;
    let next = firstTop;
    return sort.map((target, index) => {
      const x = target.x*width, y = target.y*height;
      const edge = side === 'left' ? columnX+cardWidth : columnX;
      const insideCardWidth = x >= columnX && x <= columnX+cardWidth;
      const remaining = (sort.length-1-index)*(cardHeight+gap);
      const maxTop = latestTop-remaining;
      const desired = insideCardWidth ? y-cardHeight-gap : y-cardHeight/2;
      let top = Math.max(next, Math.min(maxTop, desired));
      if (insideCardWidth && y >= top && y <= top+cardHeight && y+gap <= maxTop) top = y+gap;
      next = top + cardHeight + gap;
      // A near-edge target can sit under the horizontal footprint of its
      // column. Point from the nearest horizontal border in that case.
      const edgeY = insideCardWidth ? (y < top ? top : top+cardHeight) : top+cardHeight/2;
      return { ...target, side, top, edge: insideCardWidth ? x : edge, edgeY, x, y, columnX, cardWidth };
    });
  });
}
