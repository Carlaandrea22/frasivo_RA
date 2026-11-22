import type { AnatomyLayer, BodyPoint, Matrix } from './anatomy';
import anchors from '../../../assets/anatomy/body/anchors.json';
import { fittedOrganSprite } from './organFit';

type Vec2 = readonly [number, number];
type SpriteBounds = [number, number, number, number];
type Side = 'left' | 'right';
type Limb = 'upper_arm' | 'forearm' | 'thigh' | 'shin' | 'hand' | 'foot';
type Group = 'trunk' | 'abdomen' | 'head' | 'pelvis' | `${Limb}_${Side}`;
export type Facing = 'front' | 'back' | 'side' | 'unknown';

export const landmark = {
  eye_left: 2, eye_right: 5, ear_left: 7, ear_right: 8,
  shoulder_left: 11, shoulder_right: 12, elbow_left: 13, elbow_right: 14,
  wrist_left: 15, wrist_right: 16, pinky_left: 17, pinky_right: 18,
  index_left: 19, index_right: 20, thumb_left: 21, thumb_right: 22,
  hip_left: 23, hip_right: 24, knee_left: 25, knee_right: 26,
  ankle_left: 27, ankle_right: 28, heel_left: 29, heel_right: 30, toe_left: 31, toe_right: 32,
} as const;

export type Joint = keyof typeof landmark;
type Matrices = Record<Group, Matrix | null>;

export interface AtlasPart {
  id: string;
  term: string;
  layer: AnatomyLayer;
  group: Group;
  sprite: readonly number[];
  demoSprite?: readonly number[];
  backSprite?: readonly number[];
  labelPoint?: readonly [number, number];
  backLabelPoint?: readonly [number, number];
  view?: 'front' | 'back' | 'both';
}

export const atlasParts = (anchors.parts as AtlasPart[]).map(part => {
  if (part.term === 'liver' || part.term === 'stomach') return { ...part, group: 'trunk' } as AtlasPart;
  if (/^abdomen_(left|right)$/.test(part.group)) return { ...part, group: 'abdomen' } as AtlasPart;
  return part;
});
export const referenceFrame = anchors.reference;

export const limbJoints = {
  upper_arm: ['shoulder', 'elbow'], forearm: ['elbow', 'wrist'],
  thigh: ['hip', 'knee'], shin: ['knee', 'ankle'],
} as const;
export const sides = ['left', 'right'] as const;

export function visibleRegion(aspect: number, viewportAspect: number): SpriteBounds {
  // The SVG and video share the same centered cover crop.
  const width = Math.min(aspect, viewportAspect), height = Math.min(1, aspect / viewportAspect);
  return [(aspect - width)/2, (1 - height)/2, width, height];
}

export function pointInFrame(point: BodyPoint | undefined, aspect: number, region: SpriteBounds, confidence = .65): Vec2 | null {
  if (!point || !((point.visibility ?? 0) >= confidence)) return null;
  const [left, top, width, height] = region;
  const x = point.x * aspect, y = point.y;
  return x >= left && x <= left + width && y >= top && y <= top + height ? [x, y] : null;
}

export function atlasSpriteId(part: AtlasPart, live: boolean, frontFeet: ReadonlySet<Group>, facing?: Facing) {
  if (live && facing === 'back' && part.backSprite) return `${part.id}_back`;
  if ((!live || frontFeet.has(part.group)) && part.demoSprite) return `${part.id}_front`;
  return part.id;
}

export function atlasSprite(part: AtlasPart, live: boolean, frontFeet: ReadonlySet<Group>, facing?: Facing): readonly number[] {
  if (live && part.id === 'brain') {
    // Fit the frontal illustration into the cranial vault above the atlas eye line.
    return [-.054, -1.64, .108, .086];
  }
  if (live && facing === 'back' && part.backSprite) return part.backSprite;
  const bounds = (!live || frontFeet.has(part.group)) && part.demoSprite ? part.demoSprite : part.sprite;
  return part.layer === 'organs' ? fittedOrganSprite(part.id, bounds) : bounds;
}

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

export function atlasPlacement(points: BodyPoint[] | null, aspect: number, viewportAspect = aspect, bones = false, allowBack = false) {
  const region = visibleRegion(aspect, viewportAspect);
  const [minX, minY, width, height] = anchors.bounds;
  const demoScale = Math.min(aspect * .88 / width, .94 / height);
  const demo = verticalFit([minX + width/2, minY + height/2], [aspect/2, .5], demoScale);
  const matrices = {} as Matrices;
  const frontFeet = new Set<Group>();
  for (const part of atlasParts) matrices[part.group] = points ? null : demo;
  const inFrame = (sorted: AtlasPart[], facing: Facing = 'front') => sorted.filter(part => {
    if (part.layer === 'bones' && (facing === 'back' ? !part.view : part.view === 'back')) return false;
    const matrix = matrices[part.group];
    return matrix && overlapsVisibleFrame(matrix, atlasSprite(part, Boolean(points), frontFeet, facing), region);
  });
  if (!points) return { matrices, frontFeet, facing: 'front' as Facing, complete: true, visible: inFrame(atlasParts) };

  function observed(index: number, confidence = .65): Vec2 | null {
    return pointInFrame(points?.[index], aspect, region, confidence);
  }

  const locate = (joint: Joint, confidence?: number) => observed(landmark[joint], confidence);
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
    else if (dx > .7 * shoulderWidth && (allowBack || (faceFront && faceWidth > .10 * shoulderWidth) || !nose)) facing = 'front';
    else facing = 'side';
  } else if (faceFront) {
    facing = 'front';
  }
  const back = facing === 'back';
  if ((back && !allowBack) || (facing !== 'front' && !bones && !allowBack))
    return { matrices, frontFeet, facing, complete: false, visible: [] as AtlasPart[] };

  if (left && right && scale > 0) {
    const at = midpoint(left, right);
    const restShoulders = midpoint(rest('shoulder_left'), rest('shoulder_right'));
    const trunk = verticalFit(restShoulders, at, scale);
    if (back) { trunk[0] *= -1; trunk[4] = at[0] - restShoulders[0]*trunk[0]; }
    matrices.trunk = trunk;
    if (leftHip && rightHip) {
      const base = midpoint(leftHip, rightHip);
      const restBase = midpoint(rest('hip_left'), rest('hip_right'));
      const hipFit = fitSegment(rest('hip_right'), rest('hip_left'), rightHip, leftHip, back);
      if (hipFit && (leftHip[0] > rightHip[0]) !== back && distance(leftHip, rightHip) >= .24 * shoulderWidth) {
        matrices.pelvis = hipFit;
        const expected = distance(restBase, midpoint(rest('shoulder_left'), rest('shoulder_right'))) * scale;
        const vertical = base[1] - at[1];
        if (vertical >= .44 * expected && vertical <= 1.65 * expected && Math.abs(base[0] - at[0]) < shoulderWidth*.45) {
          // Anchor abdominal pieces at the hips and limit vertical compression to seated proportions.
          const abdomen = verticalFit(restBase, base, Math.min(scale, scale * vertical / expected));
          if (back) { abdomen[0] *= -1; abdomen[4] = base[0] - restBase[0]*abdomen[0]; }
          matrices.abdomen = abdomen;
        }
      }
    }
  } else if (leftHip && rightHip && leftHip[0] > rightHip[0]) {
    matrices.pelvis = fitSegment(rest('hip_right'), rest('hip_left'), rightHip, leftHip);
  }

  const earWidth = earLeft && earRight ? distance(earLeft, earRight) : 0;
  if (back && earLeft && earRight && left && right && earLeft[0] < earRight[0]
    && earWidth > .18 * shoulderWidth && earWidth < .68 * shoulderWidth
    && Math.max(earLeft[1], earRight[1]) < midpoint(left, right)[1] - .12 * shoulderWidth) {
    const restRight = rest('ear_right'), restLeft = rest('ear_left');
    const [x, y] = midpoint(earLeft, earRight);
    const earScale = earWidth / distance(restLeft, restRight);
    // Rear ear estimates may fall inside the hair. Keep their center and roll while limiting the scale.
    const ratio = Math.min(scale, Math.max(scale * .78, earScale)) / earScale;
    const fitEar = (ear: Vec2): Vec2 => [x + (ear[0] - x) * ratio, y + (ear[1] - y) * ratio];
    matrices.head = fitSegment(restRight, restLeft, fitEar(earRight), fitEar(earLeft), true);
  } else if (!back && eyeLeft && eyeRight && faceFront) {
    const eyeFit = fitSegment(rest('eye_right'), rest('eye_left'), eyeRight, eyeLeft);
    const earFit = earLeft && earRight && earLeft[0] > earRight[0]
      ? fitSegment(rest('ear_right'), rest('ear_left'), earRight, earLeft) : null;
    if (eyeFit && earFit && Math.hypot(earFit[0], earFit[1]) > .6 * Math.hypot(eyeFit[0], eyeFit[1])) {
      const a = eyeFit[0] * .45 + earFit[0] * .55;
      const b = eyeFit[1] * .45 + earFit[1] * .55;
      const [x, y] = midpoint(rest('eye_left'), rest('eye_right'));
      const [u, v] = midpoint(eyeLeft, eyeRight);
      matrices.head = [a, b, -b, a, u - a*x + b*y, v - b*x - a*y];
    } else matrices.head = eyeFit;
  }

  function foreshortened(a: Joint, b: Joint, projected: number, minimum: number) {
    const zA = points?.[landmark[a]]?.z, zB = points?.[landmark[b]]?.z;
    return projected < minimum || (zA !== undefined && zB !== undefined && Math.abs(zA - zB)*aspect > projected*1.35);
  }

  for (const side of sides) {
    const heel = `heel_${side}` as const, toe = `toe_${side}` as const, ankle = `ankle_${side}` as const;
    const h = locate(heel, .40), f = locate(toe, bones ? .53 : .65);
    const supportedAnkle = locate(ankle, .52);
    const hip = locate(`hip_${side}`), knee = locate(`knee_${side}`, .52);
    const legLength = hip && supportedAnkle ? distance(hip, supportedAnkle) : 0;
    const kneeProgress = hip && knee && supportedAnkle && legLength > .01
      ? ((knee[0]-hip[0])*(supportedAnkle[0]-hip[0])+(knee[1]-hip[1])*(supportedAnkle[1]-hip[1]))/legLength**2
      : null;
    const legSupported = Boolean(leftHip && rightHip && h && f && supportedAnkle
      && distance(h, f) < Math.max(.04, scale*.34) && distance(h, supportedAnkle) < Math.max(.016, scale*.12));
    const armSupported = Boolean(locate(`shoulder_${side}`) && locate(`wrist_${side}`));
    for (const limb of Object.keys(limbJoints) as (keyof typeof limbJoints)[]) {
      const leg = limb === 'thigh' || limb === 'shin';
      if (leg && !bones && (!leftHip || !rightHip)) continue;
      if (bones && leg && kneeProgress !== null && (kneeProgress < .07 || kneeProgress > .96)) continue;
      const [from, to] = limbJoints[limb];
      const a = `${from}_${side}` as Joint, b = `${to}_${side}` as Joint;
      const confidence = leg ? (legSupported ? .52 : .65) : (armSupported ? .52 : .65);
      const actualA = locate(a, confidence), actualB = locate(b, confidence);
      if (!actualA || !actualB) continue;
      const projected = distance(actualA, actualB);
      const expected = distance(rest(a), rest(b)) * scale;
      const plausibleLength = projected >= Math.max(.018, expected*.44) && (!scale || projected <= expected*1.9);
      // Depth can be noisy under loose clothing. Trust a well-sized 2D segment when both ends are supported.
      const supported = leg ? limb === 'shin' && legSupported : armSupported;
      if (plausibleLength && (!foreshortened(a, b, projected, .018) || (supported && scale > 0 && projected >= expected*.72))) {
        matrices[`${limb}_${side}`] = fitSegment(rest(a), rest(b), actualA, actualB, back);
      }
    }
    const wrist = `wrist_${side}` as const, index = `index_${side}` as const;
    const pinky = `pinky_${side}` as const, thumb = `thumb_${side}` as const;
    const w = locate(wrist), i = locate(index, .52), p = locate(pinky, .52), t = locate(thumb, .52);
    if (w && i && p && t) {
      const end = midpoint(i, p), restEnd = midpoint(rest(index), rest(pinky)), span = distance(w, end);
      if (span > Math.max(.013, scale*.065) && (!scale || span < scale*.25)
        && distance(i, p) > .08*span && distance(i, p) < 1.65*span && distance(w, t) < 1.5*span) {
        const reflect = cross(w, end, t) * cross(rest(wrist), restEnd, rest(thumb)) < 0;
        matrices[`hand_${side}`] = fitSegment(rest(wrist), restEnd, w, end, reflect);
      }
    }
    const k = locate(ankle, legSupported ? .52 : .65);
    if (legSupported && h && f && k) {
      const span = distance(h, f), reach = distance(k, f);
      if (distance(k, h) < Math.max(.013, reach*.7) && reach < Math.max(.035, scale*.27)) {
        const group = `foot_${side}` as const;
        if (!foreshortened(heel, toe, span, Math.max(.015, scale*.065))) {
          if (back) {
            matrices[group] = fitSegment(rest(heel), rest(toe), h, f, true);
          } else {
            const [ankleX, ankleY] = anchors.spriteAnchors[bones ? heel : ankle];
            const [toeX, toeY] = anchors.spriteAnchors[toe];
            matrices[group] = fitSegment([ankleX, ankleY], [toeX, toeY], bones ? h : k, f);
          }
        } else if (!back && f[1] > k[1] + reach*.45 && reach >= Math.max(.012, scale*.035)) {
          matrices[group] = bones && span >= .01
            ? fitSegment(rest(heel), rest(toe), h, f)
            : !bones ? fitSegment(rest(ankle), rest(toe), k, f) : null;
          frontFeet.add(group);
        }
      }
    }
  }

  const complete = Boolean((nose || earLeft || earRight) && left && right && leftHip && rightHip
    && sides.every(side => locate(`knee_${side}`) && locate(`ankle_${side}`)));
  return { matrices, frontFeet, facing, complete, visible: inFrame(atlasParts, facing) };
}

export function atlasMatrices(points: BodyPoint[] | null, aspect: number): Matrices {
  return atlasPlacement(points, aspect).matrices;
}
