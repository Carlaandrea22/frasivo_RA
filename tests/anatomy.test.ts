import { describe, expect, it } from 'vitest';
import { torsoTransform, segmentTransform, demoPose, anatomyParts } from '../src/medicine/anatomy';

describe('anatomy alignment', () => {
  it('maps torso corners to the shoulders and hip midpoint, including tilt', () => {
    const pose = demoPose.map(p => ({ ...p }));
    pose[12] = { x: .25, y: .2, visibility: 1 }; pose[11] = { x: .65, y: .3, visibility: 1 };
    pose[24] = { x: .3, y: .55, visibility: 1 }; pose[23] = { x: .6, y: .65, visibility: 1 };
    const m = torsoTransform(pose)!;
    [4, 1, 0, 3.5, 250, 200].forEach((value, i) => expect(m[i]).toBeCloseTo(value));
    expect(m[0] * 50 + m[2] * 100 + m[4]).toBeCloseTo(450);
    expect(m[1] * 50 + m[3] * 100 + m[5]).toBeCloseTo(600);
  });
  it('maps an articulated segment from its proximal to distal endpoint', () => {
    const m = segmentTransform([{ x: .2, y: .3, visibility: 1 }, { x: .5, y: .7, visibility: 1 }], 0, 1)!;
    expect(m[4]).toBe(200); expect(m[5]).toBe(300);
    expect(m[2] * 100 + m[4]).toBeCloseTo(500);
    expect(m[3] * 100 + m[5]).toBeCloseTo(700);
  });
  it('hides missing, low confidence, nonfinite and collapsed anchors', () => {
    expect(torsoTransform([])).toBeNull();
    const pose = demoPose.map(p => ({ ...p })); pose[11].visibility = .2;
    expect(torsoTransform(pose)).toBeNull();
    pose[11] = { x: NaN, y: .2, visibility: 1 }; expect(torsoTransform(pose)).toBeNull();
    expect(segmentTransform(demoPose, 11, 11)).toBeNull();
    expect(segmentTransform([{ x: .2, y: .3, visibility: .1 }], 0, 1)).toBeNull();
  });
  it('provides bilingual selectable structures in all three layers', () => {
    for (const layer of ['muscles', 'bones', 'organs']) {
      expect(anatomyParts.filter(p => p.layer === layer).length).toBeGreaterThanOrEqual(4);
    }
    expect(new Set(anatomyParts.map(p => p.id)).size).toBe(anatomyParts.length);
    for (const part of anatomyParts) { expect(part.en).toBeTruthy(); expect(part.es).toBeTruthy(); expect(part.description).toBeTruthy(); }
  });
});
