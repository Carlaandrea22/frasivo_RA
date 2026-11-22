import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { createModelScene, projectAnchors } from '../src/shared/visor3d/modelScene';

function nestedModel() {
  const root = new Group();
  const parent = new Group();
  const branch = new Group();
  const piece = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  const sibling = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  parent.position.x = 3;
  branch.position.x = -2;
  branch.userData.nodeId = 'detail';
  sibling.name = 'sibling';
  sibling.position.x = -6;
  branch.add(piece);
  parent.add(branch, sibling);
  root.add(parent);
  return { root, piece, sibling };
}

describe('escena del visor 3D compartido', () => {
  it('aísla una rama anidada y conserva la transformación de sus antecesores', () => {
    const { root, piece, sibling } = nestedModel();
    const model = createModelScene(root, 'detail');

    expect(model?.objects).toEqual([piece]);
    expect(model?.selectionId(piece)).toBe('detail');
    expect(model?.bounds.min.toArray()).toEqual([.5, -.5, -.5]);
    expect(model?.bounds.max.toArray()).toEqual([1.5, .5, .5]);
    expect(sibling.layers.isEnabled(0)).toBe(false);
  });

  it('proyecta coordenadas locales con el encuadre actual y oculta puntos descartados', () => {
    const { root } = nestedModel();
    const model = createModelScene(root, 'detail')!;
    const camera = new PerspectiveCamera(90, 2, .01, 100);
    camera.position.z = 5;
    camera.updateMatrixWorld();
    const anchors = [
      { id: 'here', nodeId: 'detail', point: [0, 0, .5] },
      { id: 'hidden', nodeId: 'sibling', point: [0, 0, 0] },
      { id: 'outside', nodeId: 'detail', point: [0, 20, 0] },
    ] as const;

    let points = projectAnchors(model, camera, anchors, 200, 100);
    expect(points[0].visible).toBe(true);
    expect(points[0].x).toBeCloseTo(100 + 50 / 4.5);
    expect(points[0].y).toBeCloseTo(50);
    expect(points[1].visible).toBe(false);
    expect(points[2].visible).toBe(false);

    camera.position.z = 2;
    camera.updateMatrixWorld();
    points = projectAnchors(model, camera, anchors, 200, 100);
    expect(points[0].x).toBeCloseTo(100 + 50 / 1.5);
  });

  it('oculta un punto detrás de una caja visible y conserva un anclaje de superficie', () => {
    const root = new Group();
    const blockerGroup = new Group();
    const target = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const blocker = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    target.name = 'target';
    blocker.position.z = 2;
    blockerGroup.add(blocker);
    root.add(target, blockerGroup);
    const model = createModelScene(root)!;
    const camera = new PerspectiveCamera(60, 1, .01, 100);
    camera.position.z = 5;
    camera.updateMatrixWorld();

    const anchors = [{ id: 'surface', nodeId: 'target', point: [0, 0, .49] }] as const;
    const projected = () => projectAnchors(model, camera, anchors, 100, 100)[0];
    expect(projected()).toEqual({ id: 'surface', x: 50, y: 50, visible: false });
    blockerGroup.visible = false;
    expect(projected().visible).toBe(true);
    blockerGroup.visible = true;
    blocker.material.visible = false;
    expect(projected().visible).toBe(true);
    blocker.material.visible = true;
    blocker.layers.set(1);
    expect(projected().visible).toBe(true);
    camera.layers.enable(1);
    expect(projected().visible).toBe(false);
    model.visible.delete(blocker);
    expect(projected().visible).toBe(true);
  });

  it('mueve las coordenadas durante el giro y actualiza la visibilidad con la siguiente comprobación', () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
    const model = createModelScene(root)!;
    const camera = new PerspectiveCamera(60, 1, .01, 100);
    camera.position.z = 5;
    camera.updateMatrixWorld();
    const anchors = [{ id: 'surface', point: [.2, 0, .5] }] as const;
    const blocked: boolean[] = [];

    const [front] = projectAnchors(model, camera, anchors, 100, 100, { blocked, sample: true });
    expect(front.x).toBeGreaterThan(50);
    expect(front.visible).toBe(true);

    camera.position.z = -5;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const [during] = projectAnchors(model, camera, anchors, 100, 100, { blocked, sample: false });
    expect(during.x).toBeLessThan(50);
    expect(during.visible).toBe(true);
    const [settled] = projectAnchors(model, camera, anchors, 100, 100, { blocked, sample: true });
    expect(settled.x).toBe(during.x);
    expect(settled.visible).toBe(false);
  });
});
