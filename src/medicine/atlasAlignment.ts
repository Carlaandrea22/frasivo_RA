import type { AnatomyLayer, BodyPoint, Matrix } from './anatomy';
import anchors from '../../assets/anatomy/body/anchors.json';

type Vec2 = readonly [number, number];
export type Technique = 'a' | 'b';

const landmark = {
  ear_left: 7, ear_right: 8,
  shoulder_left: 11, shoulder_right: 12,
  elbow_left: 13, elbow_right: 14,
  wrist_left: 15, wrist_right: 16,
  hip_left: 23, hip_right: 24,
  knee_left: 25, knee_right: 26,
  ankle_left: 27, ankle_right: 28,
} as const;

type Joint = keyof typeof landmark;
type SegmentGroup = 'upper_arm_left' | 'upper_arm_right'
  | 'forearm_left' | 'forearm_right' | 'thigh_left' | 'thigh_right' | 'shin_left' | 'shin_right';
type Group = 'trunk' | 'head' | 'pelvis' | SegmentGroup;

export interface AtlasPart {
  id: string;
  term: string;
  layer: AnatomyLayer;
  group: Group;
  sprite?: [number, number, number, number];
}

const joints: Record<SegmentGroup, [Joint, Joint]> = {
  upper_arm_left: ['shoulder_left', 'elbow_left'],
  upper_arm_right: ['shoulder_right', 'elbow_right'],
  forearm_left: ['elbow_left', 'wrist_left'],
  forearm_right: ['elbow_right', 'wrist_right'],
  thigh_left: ['hip_left', 'knee_left'],
  thigh_right: ['hip_right', 'knee_right'],
  shin_left: ['knee_left', 'ankle_left'],
  shin_right: ['knee_right', 'ankle_right'],
};

export const atlasParts = anchors.parts as AtlasPart[];
export const referenceFrame = anchors.reference;

export function comparisonTechnique(search: string): Technique | null {
  const technique = new URLSearchParams(search).get('tecnica');
  return technique === 'a' || technique === 'b' ? technique : null;
}

function rest(joint: Joint): Vec2 {
  const [x, y] = anchors.anchors[joint];
  return [x, -y];
}

function observed(points: BodyPoint[], joint: Joint, aspect: number): Vec2 | null {
  const point = points[landmark[joint]];
  if (!point || (point.visibility ?? 0) < .6 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (point.x < -.1 || point.x > 1.1 || point.y < -.1 || point.y > 1.1) return null;
  return [point.x * aspect, point.y];
}

function fitSegment(from: Vec2, to: Vec2, actualFrom: Vec2, actualTo: Vec2): Matrix | null {
  const x = to[0] - from[0], y = to[1] - from[1];
  const u = actualTo[0] - actualFrom[0], v = actualTo[1] - actualFrom[1];
  const squared = x*x + y*y;
  if (squared < .000001 || Math.hypot(u, v) < .012) return null;
  const a = (x*u + y*v) / squared;
  const b = (x*v - y*u) / squared;
  return [a, b, -b, a, actualFrom[0] - a*from[0] + b*from[1], actualFrom[1] - b*from[0] - a*from[1]];
}

function midpoint(left: Vec2, right: Vec2): Vec2 {
  return [(left[0]+right[0])/2, (left[1]+right[1])/2];
}

function fitTrunk(points: BodyPoint[], aspect: number): Matrix | null {
  const shoulderLeft = observed(points, 'shoulder_left', aspect);
  const shoulderRight = observed(points, 'shoulder_right', aspect);
  const hipLeft = observed(points, 'hip_left', aspect);
  const hipRight = observed(points, 'hip_right', aspect);
  if (!shoulderLeft || !shoulderRight || !hipLeft || !hipRight) return null;
  const from = midpoint(rest('shoulder_left'), rest('shoulder_right'));
  const to = midpoint(shoulderLeft, shoulderRight);
  const base = midpoint(rest('hip_left'), rest('hip_right'));
  const actualBase = midpoint(hipLeft, hipRight);
  const x = rest('shoulder_left')[0] - rest('shoulder_right')[0];
  const y = rest('shoulder_left')[1] - rest('shoulder_right')[1];
  const u = base[0] - from[0], v = base[1] - from[1];
  const ax = shoulderLeft[0] - shoulderRight[0], ay = shoulderLeft[1] - shoulderRight[1];
  const bx = actualBase[0] - to[0], by = actualBase[1] - to[1];
  const det = x*v - y*u;
  if (Math.abs(det) < .0001 || Math.abs(ax*by - ay*bx) < .004) return null;
  const a = (ax*v - bx*y)/det, c = (bx*x - ax*u)/det;
  const b = (ay*v - by*y)/det, d = (by*x - ay*u)/det;
  return [a, b, c, d, to[0]-a*from[0]-c*from[1], to[1]-b*from[0]-d*from[1]];
}

export function atlasMatrices(points: BodyPoint[] | null, aspect: number): Record<Group, Matrix | null> {
  const [minX, minY, width, height] = anchors.bounds;
  const scale = Math.min(aspect * .88 / width, .92 / height);
  const demo: Matrix = [scale, 0, 0, scale,
    aspect/2 - scale*(minX + width/2), .5 - scale*(minY + height/2)];
  const segment = (from: Joint, to: Joint) => {
    if (!points) return demo;
    const a = observed(points, from, aspect), b = observed(points, to, aspect);
    return a && b ? fitSegment(rest(from), rest(to), a, b) : null;
  };
  const trunk = points ? fitTrunk(points, aspect) : demo;
  let head = segment('ear_right', 'ear_left');
  if (points && head && trunk) {
    // A side-on face compresses the ear baseline. Avoid stamping a tiny frontal skull.
    const headScale = Math.hypot(head[0], head[1]);
    const trunkWidthScale = Math.hypot(trunk[0], trunk[1]);
    if (headScale < trunkWidthScale * .54) head = null;
  }
  return {
    trunk,
    head,
    pelvis: segment('hip_right', 'hip_left'),
    upper_arm_left: segment(...joints.upper_arm_left),
    upper_arm_right: segment(...joints.upper_arm_right),
    forearm_left: segment(...joints.forearm_left),
    forearm_right: segment(...joints.forearm_right),
    thigh_left: segment(...joints.thigh_left),
    thigh_right: segment(...joints.thigh_right),
    shin_left: segment(...joints.shin_left),
    shin_right: segment(...joints.shin_right),
  };
}
