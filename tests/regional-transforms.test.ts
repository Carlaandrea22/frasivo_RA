import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import metadata from '../assets/anatomy/regions/anchors.json';
import {
  faceRotation, fitHeadProjection, fitLandmarkPlane, fitRegionalSegment, handCrossSectionScale, handMuscleView,
  visibleNeckFit,
} from '../src/features/cuerpo/regionalTransforms';

describe('ajuste de huesos regionales', () => {
  it('mantiene cada falange entre los dos extremos de un índice doblado', () => {
    const joints = [new Vector3(.47, .5, .0), new Vector3(.49, .61, .01),
      new Vector3(.51, .63, .07), new Vector3(.515, .60, .12)];
    const bones = ['proximal', 'middle', 'distal'] as const;
    const dorsal = new Vector3(0, 0, 1);
    for (const [i, segment] of bones.entries()) {
      const bone = metadata.hand.bones[`phalanx_index_${segment}`];
      const source = [new Vector3().fromArray(bone.start), new Vector3().fromArray(bone.end)] as const;
      const transform = fitRegionalSegment(source, [joints[i], joints[i+1]], dorsal, dorsal, 1.6)!;
      expect(source[0].clone().applyMatrix4(transform).distanceTo(joints[i])).toBeLessThan(1e-6);
      expect(source[1].clone().applyMatrix4(transform).distanceTo(joints[i+1])).toBeLessThan(1e-6);
    }
  });

  it('espeja el tarso sin perder los anclajes de talón, punta y tobillo', () => {
    const source = {
      base: new Vector3().fromArray(metadata.foot.heel),
      middle: new Vector3().fromArray(metadata.foot.toe),
      tip: new Vector3().fromArray(metadata.foot.ankle),
    };
    const target = {
      base: new Vector3(.19, .45, -.01), middle: new Vector3(.27, .51, .10), tip: new Vector3(.17, .51, .025),
    };
    const transform = fitLandmarkPlane(source, target, true)!;
    expect(transform.determinant()).toBeLessThan(0);
    for (const control of ['base', 'middle', 'tip'] as const) {
      expect(source[control].clone().applyMatrix4(transform).distanceTo(target[control])).toBeLessThan(1e-6);
    }
  });

  it('mantiene el giro de perfil de la matriz facial junto con el ajuste en pantalla', () => {
    const expected = new Quaternion().setFromEuler(new Euler(.06, .9, -.12));
    const matrix = new Matrix4().compose(new Vector3(1, 2, 3), expected, new Vector3().setScalar(1.2));
    const rotation = faceRotation(matrix.clone().transpose().toArray())!;
    expect(rotation.angleTo(expected)).toBeLessThan(1e-6);
    const source = [metadata.head.eyeLeft, metadata.head.eyeRight, metadata.head.nose, metadata.head.chin]
      .map(point => new Vector3().fromArray(point));
    const target = source.map(point => point.clone().applyQuaternion(expected).multiplyScalar(2.3)
      .add(new Vector3(.2, -2.9, .18)));
    const fit = fitHeadProjection(source, target, rotation, [1.5, 1.5, .6, 1])!;
    for (const [i, point] of source.entries()) {
      expect(point.clone().applyMatrix4(fit).distanceTo(target[i])).toBeLessThan(1e-6);
    }
  });

});

describe('ajustes de músculos y órganos regionales', () => {
  it('ajusta el grosor de las piezas a una palma más estrecha con la misma longitud', () => {
    const source = { base: new Vector3(0, 0, 0), middle: new Vector3(-.4, 1, 0), tip: new Vector3(.4, 1, 0) };
    const target = { base: source.base, middle: new Vector3(-.3, 1, 0), tip: new Vector3(.3, 1, 0) };
    expect(handCrossSectionScale(source, target)).toBeCloseTo(.75);
  });

  it('muestra el lado anatómico de la mano y mantiene la vista al pasar de canto', () => {
    expect(handMuscleView(new Vector3(0, 0, 1))).toBe('palmar');
    expect(handMuscleView(new Vector3(0, 0, -1), 'palmar')).toBe('dorsal');
    expect(handMuscleView(new Vector3(.99, 0, .09), 'dorsal')).toBe('dorsal');
    expect(handMuscleView(new Vector3(.99, 0, -.09), 'palmar')).toBe('palmar');
  });

  it('ubica el cuello entre la cabeza y los hombros visibles', () => {
    const source = [new Vector3(0, 1.5, .04), new Vector3(0, 1.3, .04)] as const;
    const top = new Vector3(.45, .60, 0), shoulders = new Vector3(.46, .45, 0);
    const fit = visibleNeckFit(source, top, shoulders, new Quaternion(), 1)!;
    expect(source[0].clone().applyMatrix4(fit).distanceTo(top)).toBeLessThan(1e-6);
    expect(source[1].clone().applyMatrix4(fit).distanceTo(shoulders)).toBeLessThan(1e-6);
    expect(visibleNeckFit(source, top, new Vector3(.46, .67, 0), new Quaternion(), 1)).toBeNull();
    expect(visibleNeckFit(source, top, new Vector3(.46, .29, 0), new Quaternion(), 1)).toBeNull();
  });
});
