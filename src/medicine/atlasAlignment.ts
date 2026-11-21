import type { AnatomyLayer, BodyPoint, Matrix } from './anatomy';
import anchors from '../../assets/anatomy/body/anchors.json';

type Vec2 = readonly [number, number];
type SpriteBounds = [number, number, number, number];
type Side = 'left' | 'right';
type Limb = 'upper_arm' | 'forearm' | 'thigh' | 'shin' | 'hand' | 'foot';
type Group = 'trunk' | 'abdomen' | 'head' | 'pelvis' | `${Limb}_${Side}`;
export type Facing = 'front' | 'back' | 'side' | 'unknown';

const landmark = {
  eye_left: 2, eye_right: 5, ear_left: 7, ear_right: 8,
  shoulder_left: 11, shoulder_right: 12, elbow_left: 13, elbow_right: 14,
  wrist_left: 15, wrist_right: 16, pinky_left: 17, pinky_right: 18,
  index_left: 19, index_right: 20, thumb_left: 21, thumb_right: 22,
  hip_left: 23, hip_right: 24, knee_left: 25, knee_right: 26,
  ankle_left: 27, ankle_right: 28, heel_left: 29, heel_right: 30, toe_left: 31, toe_right: 32,
} as const;

type Joint = keyof typeof landmark;
type Matrices = Record<Group, Matrix | null>;

export interface AtlasPart {
  id: string;
  term: string;
  layer: AnatomyLayer;
  group: Group;
  sprite: readonly number[];
  demoSprite?: readonly number[];
}

export const atlasParts = anchors.parts as AtlasPart[];
export const referenceFrame = anchors.reference;

const joints = {
  upper_arm: ['shoulder', 'elbow'], forearm: ['elbow', 'wrist'],
  thigh: ['hip', 'knee'], shin: ['knee', 'ankle'],
} as const;
const sides = ['left', 'right'] as const;

function rest(joint: Joint): Vec2 {
  const [x, y] = (anchors.anchors as Record<string, number[]>)[joint];
  return [x, -y];
}

function midpoint(left: Vec2, right: Vec2): Vec2 {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function cross(a: Vec2, b: Vec2, point: Vec2) {
  return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
}

function fitSegment(from: Vec2, to: Vec2, actualFrom: Vec2, actualTo: Vec2, reflect = false): Matrix | null {
  const x = (to[0] - from[0]) * (reflect ? -1 : 1), y = to[1] - from[1];
  const u = actualTo[0] - actualFrom[0], v = actualTo[1] - actualFrom[1];
  const squared = x*x + y*y;
  if (squared < .000001 || Math.hypot(u, v) < .008) return null;
  let a = (x*u + y*v) / squared;
  let b = (x*v - y*u) / squared;
  const c = -b, d = a;
  if (reflect) { a = -a; b = -b; }
  return [a, b, c, d, actualFrom[0] - a*from[0] - c*from[1], actualFrom[1] - b*from[0] - d*from[1]];
}

function verticalFit(from: Vec2, to: Vec2, scale: number): Matrix {
  return [scale, 0, 0, scale, to[0] - from[0]*scale, to[1] - from[1]*scale];
}

function overlapsVisibleFrame(matrix: Matrix, bounds: readonly number[], region: SpriteBounds) {
  const [x, y, width, height] = bounds;
  const [a, b, c, d, tx, ty] = matrix;
  const cx = x + width/2, cy = y + height/2;
  const projectedX = a*cx + c*cy + tx, projectedY = b*cx + d*cy + ty;
  const halfWidth = (Math.abs(a)*width + Math.abs(c)*height)/2;
  const halfHeight = (Math.abs(b)*width + Math.abs(d)*height)/2;
  const [left, top, visibleWidth, visibleHeight] = region;
  return projectedX + halfWidth > left && projectedX - halfWidth < left + visibleWidth
    && projectedY + halfHeight > top && projectedY - halfHeight < top + visibleHeight;
}

export function atlasPlacement(points: BodyPoint[] | null, aspect: number, viewportAspect = aspect) {
  // The SVG uses xMidYMid slice, the same center crop as object-fit: cover.
  const visibleWidth = Math.min(aspect, viewportAspect), visibleHeight = Math.min(1, aspect / viewportAspect);
  const region: SpriteBounds = [(aspect - visibleWidth)/2, (1 - visibleHeight)/2, visibleWidth, visibleHeight];
  const [minX, minY, width, height] = anchors.bounds;
  const demoScale = Math.min(aspect * .88 / width, .94 / height);
  const demo = verticalFit([minX + width/2, minY + height/2], [aspect/2, .5], demoScale);
  const matrices = {} as Matrices;
  for (const part of atlasParts) matrices[part.group] = points ? null : demo;
  const inFrame = (sorted: AtlasPart[]) => sorted.filter(part => {
    const matrix = matrices[part.group];
    return matrix && overlapsVisibleFrame(matrix, points ? part.sprite : part.demoSprite ?? part.sprite, region);
  });
  if (!points) return { matrices, facing: 'front' as Facing, complete: true, visible: inFrame(atlasParts) };

  function observed(index: number): Vec2 | null {
    const point = points?.[index];
    if (!point || (point.visibility ?? 0) < .65 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    const [left, top, width, height] = region;
    const x = point.x * aspect, y = point.y;
    return x >= left && x <= left + width && y >= top && y <= top + height ? [x, y] : null;
  }

  const locate = (joint: Joint) => observed(landmark[joint]);
  const left = locate('shoulder_left'), right = locate('shoulder_right');
  const leftHip = locate('hip_left'), rightHip = locate('hip_right');
  const eyeLeft = locate('eye_left'), eyeRight = locate('eye_right');
  const earLeft = locate('ear_left'), earRight = locate('ear_right');
  const nose = observed(0);
  const shoulderWidth = left && right ? distance(left, right) : 0;
  const restShoulderWidth = distance(rest('shoulder_right'), rest('shoulder_left'));
  const scale = left && right ? Math.abs(left[0] - right[0]) / restShoulderWidth : 0;
  const faceWidth = eyeLeft && eyeRight ? eyeLeft[0] - eyeRight[0] : 0;
  const faceFront = nose && faceWidth > .01;
  let facing: Facing = 'unknown';
  if (left && right && shoulderWidth > .035) {
    const dx = left[0] - right[0];
    if (dx < -.7 * shoulderWidth && (!faceFront || faceWidth <= .20 * shoulderWidth)) facing = 'back';
    else if (dx > .7 * shoulderWidth && ((faceFront && faceWidth > .10 * shoulderWidth) || !nose)) facing = 'front';
    else facing = 'side';
  } else if (faceFront) {
    facing = 'front';
  }
  if (facing !== 'front') return { matrices, facing, complete: false, visible: [] as AtlasPart[] };

  if (left && right && scale > 0) {
    const at = midpoint(left, right);
    matrices.trunk = verticalFit(midpoint(rest('shoulder_left'), rest('shoulder_right')), at, scale);
    if (leftHip && rightHip) {
      const base = midpoint(leftHip, rightHip);
      const restBase = midpoint(rest('hip_left'), rest('hip_right'));
      const hipFit = fitSegment(rest('hip_right'), rest('hip_left'), rightHip, leftHip);
      if (hipFit && leftHip[0] > rightHip[0] && distance(leftHip, rightHip) >= .24 * shoulderWidth) {
        matrices.pelvis = hipFit;
        const expected = distance(restBase, midpoint(rest('shoulder_left'), rest('shoulder_right'))) * scale;
        const vertical = base[1] - at[1];
        if (vertical >= .44 * expected && vertical <= 1.65 * expected && Math.abs(base[0] - at[0]) < shoulderWidth*.45) {
          // Anchor abdominal pieces at the hips and limit vertical compression to seated proportions.
          matrices.abdomen = verticalFit(restBase, base, Math.min(scale, scale * vertical / expected));
        }
      }
    }
  } else if (leftHip && rightHip && leftHip[0] > rightHip[0]) {
    matrices.pelvis = fitSegment(rest('hip_right'), rest('hip_left'), rightHip, leftHip);
  }

  if (eyeLeft && eyeRight && faceFront) {
    const eyeFit = fitSegment(rest('eye_right'), rest('eye_left'), eyeRight, eyeLeft);
    const earFit = earLeft && earRight && earLeft[0] > earRight[0]
      ? fitSegment(rest('ear_right'), rest('ear_left'), earRight, earLeft) : null;
    if (eyeFit && earFit && Math.hypot(earFit[0], earFit[1]) > .6 * Math.hypot(eyeFit[0], eyeFit[1])) {
      matrices.head = eyeFit.map((value, i) => value * .45 + earFit[i] * .55) as Matrix;
    } else matrices.head = eyeFit;
  }

  function foreshortened(a: Joint, b: Joint, projected: number, minimum: number) {
    const zA = points?.[landmark[a]]?.z, zB = points?.[landmark[b]]?.z;
    return projected < minimum || (zA !== undefined && zB !== undefined && Math.abs(zA - zB)*aspect > projected*1.35);
  }

  for (const side of sides) {
    for (const limb of Object.keys(joints) as (keyof typeof joints)[]) {
      if ((limb === 'thigh' || limb === 'shin') && (!leftHip || !rightHip)) continue;
      const [from, to] = joints[limb];
      const a = `${from}_${side}` as Joint, b = `${to}_${side}` as Joint;
      const actualA = locate(a), actualB = locate(b);
      if (actualA && actualB && !foreshortened(a, b, distance(actualA, actualB), Math.max(.018, distance(rest(a), rest(b)) * scale * .44))) {
        matrices[`${limb}_${side}`] = fitSegment(rest(a), rest(b), actualA, actualB);
      }
    }
    const wrist = `wrist_${side}` as const, index = `index_${side}` as const;
    const pinky = `pinky_${side}` as const, thumb = `thumb_${side}` as const;
    const w = locate(wrist), i = locate(index), p = locate(pinky), t = locate(thumb);
    if (w && i && p && t) {
      const end = midpoint(i, p), restEnd = midpoint(rest(index), rest(pinky)), span = distance(w, end);
      if (span > Math.max(.012, scale*.052) && distance(i, p) > .15*span && !foreshortened(wrist, index, distance(w, i), .012)) {
        const reflect = cross(w, end, t) * cross(rest(wrist), restEnd, rest(thumb)) < 0;
        matrices[`hand_${side}`] = fitSegment(rest(wrist), restEnd, w, end, reflect);
      }
    }
    const heel = `heel_${side}` as const, toe = `toe_${side}` as const;
    const ankle = `ankle_${side}` as const;
    const h = locate(heel), f = locate(toe), k = locate(ankle);
    if (leftHip && rightHip && h && f && k && distance(k, h) < distance(h, f)*1.3
      && !foreshortened(heel, toe, distance(h, f), Math.max(.015, scale*.065))) {
      const [hx, hy] = anchors.spriteAnchors[heel];
      const [tx, ty] = anchors.spriteAnchors[toe];
      matrices[`foot_${side}`] = fitSegment([hx, hy], [tx, ty], h, f);
    }
  }

  const complete = Boolean((nose || earLeft || earRight) && left && right && leftHip && rightHip
    && sides.every(side => locate(`knee_${side}`) && locate(`ankle_${side}`)));
  return { matrices, facing, complete, visible: inFrame(atlasParts) };
}

export function atlasMatrices(points: BodyPoint[] | null, aspect: number): Matrices {
  return atlasPlacement(points, aspect).matrices;
}
