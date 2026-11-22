import type { BodyPoint } from './anatomy';

export type DetectorKind = 'pose' | 'hand' | 'face';
export type Specialist = Exclude<DetectorKind, 'pose'>;
export type DetectorState = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface HandRegion {
  landmarks: BodyPoint[];
  worldLandmarks: BodyPoint[];
  side: 'left' | 'right';
  confidence: number;
}

export interface FaceRegion {
  landmarks: BodyPoint[];
  /** The canonical-to-observed transform, ordered by row. */
  matrix: number[];
  jawOpen: number;
}

export interface RegionalHint {
  fullBody: boolean;
  detailedHands: boolean;
  detailedFace?: boolean;
}

export interface DetectorStat {
  frames: number;
  fps: number;
  ms: number | null;
  status: DetectorState;
}

export function chooseDetector(
  hint: RegionalHint,
  status: Readonly<Record<DetectorKind, DetectorState>>,
  last: Readonly<Record<DetectorKind, number>>,
  now: number,
  active: Specialist | null,
): DetectorKind {
  if (hint.fullBody) {
    if (hint.detailedHands && status.hand === 'ready' && now - last.hand >= 300 && now - last.pose < 155) return 'hand';
    if (hint.detailedFace && status.face === 'ready' && now - last.face >= 360 && now - last.pose < 155) return 'face';
    return 'pose';
  }
  if (active && status[active] === 'ready') {
    const alternate = active === 'hand' ? 'face' : 'hand';
    if (now - last.pose >= 550) return 'pose';
    if (status[alternate] === 'ready' && now - last[alternate] >= 550) return alternate;
    return active;
  }
  let next: DetectorKind = 'pose';
  for (const detector of ['hand', 'face'] as const) {
    if (status[detector] === 'ready' && last[detector] < last[next]) next = detector;
  }
  return next;
}
