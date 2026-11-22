import { describe, expect, it } from 'vitest';
import { chooseDetector, type DetectorKind, type DetectorState } from '../src/features/cuerpo/regionalDetection';

const ready: Record<DetectorKind, DetectorState> = { pose: 'ready', hand: 'ready', face: 'ready' };
const full = { fullBody: true, detailedHands: false };
const partial = { fullBody: false, detailedHands: false };
const recent = { pose: 950, hand: 800, face: 850 };

describe('regional detector scheduling', () => {
  it('prioritizes pose on a complete body and only samples a hand when needed', () => {
    const last = { ...recent, hand: 690 };
    expect(chooseDetector(full, ready, last, 1000, 'face')).toBe('pose');
    expect(chooseDetector({ ...full, detailedHands: true }, ready, last, 1000, null)).toBe('hand');
    expect(chooseDetector({ ...full, detailedHands: true }, ready, { ...last, pose: 840 }, 1000, null)).toBe('pose');
  });

  it('scans every ready detector until there is a stable specialist', () => {
    expect(chooseDetector(partial, ready, recent, 1000, null)).toBe('hand');
    expect(chooseDetector(partial, ready, { ...recent, hand: 1000 }, 1080, null)).toBe('face');
    expect(chooseDetector(partial, { ...ready, hand: 'unavailable', face: 'loading' }, recent, 1000, null)).toBe('pose');
  });

  it('retains the current specialist while periodically checking pose and the other specialist', () => {
    expect(chooseDetector(partial, ready, recent, 1000, 'face')).toBe('face');
    expect(chooseDetector(partial, ready, { ...recent, pose: 450 }, 1000, 'face')).toBe('pose');
    expect(chooseDetector(partial, ready, { ...recent, hand: 450 }, 1000, 'face')).toBe('hand');
  });
});
