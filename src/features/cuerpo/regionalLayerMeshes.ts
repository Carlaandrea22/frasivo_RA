import {
  BufferAttribute, type BufferGeometry, DynamicDrawUsage, type Matrix4,
  Mesh, MeshStandardMaterial, PlaneGeometry, ShaderMaterial, Vector2, Vector3,
} from 'three';
import type { BodyPoint } from './anatomy';
import { controlsByMuscle, faceControlCoordinates } from './faceExpressionControls';
import { videoPoint } from './regionalTransforms';

type Segment = { start: Vector3; end: Vector3 };
const influences = 3;

interface Skin {
  geometry: BufferGeometry;
  positions: ReturnType<BufferGeometry['getAttribute']>;
  rest: Float32Array;
  indices: Uint16Array;
  weights: Float32Array;
}

const controlPoints = new Map(Object.entries(faceControlCoordinates).map(([index, [x, y, z]]) => [
  Number(index), new Vector3(x*.01075, y*.00999+1.52488, z*.00749+.13901),
]));

function bindSkin(geometry: BufferGeometry, controlIds: readonly number[], distance: (point: Vector3, id: number) => number) {
  const positions = geometry.getAttribute('position');
  const rest = new Float32Array(positions.count*3);
  const indices = new Uint16Array(positions.count*influences);
  const weights = new Float32Array(indices.length);
  const point = new Vector3();
  const closest = controlIds.map(id => ({ id, distance: 0 }));
  for (let vertex = 0; vertex < positions.count; vertex++) {
    point.fromBufferAttribute(positions, vertex).toArray(rest, vertex*3);
    for (const control of closest) control.distance = distance(point, control.id);
    closest.sort((a, b) => a.distance-b.distance);
    let total = 0;
    for (let influence = 0; influence < influences; influence++) {
      const offset = vertex*influences+influence;
      const control = closest[influence];
      indices[offset] = control.id;
      weights[offset] = 1/(control.distance+.000012)**2;
      total += weights[offset];
    }
    for (let offset = vertex*influences; offset < (vertex+1)*influences; offset++) weights[offset] /= total;
  }
  if (positions instanceof BufferAttribute) positions.setUsage(DynamicDrawUsage);
  const normals = geometry.getAttribute('normal');
  if (normals instanceof BufferAttribute) normals.setUsage(DynamicDrawUsage);
  geometry.computeBoundingBox();
  geometry.boundingBox?.expandByScalar(.055);
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius += .055;
  return { geometry, indices, positions, rest, weights } satisfies Skin;
}

function deform(skin: Skin, influencePoint: (point: Vector3, id: number) => Vector3) {
  const { geometry, indices, positions, rest, weights } = skin;
  const source = new Vector3(), point = new Vector3();
  for (let vertex = 0; vertex < positions.count; vertex++) {
    source.fromArray(rest, vertex*3);
    point.set(0, 0, 0);
    for (let offset = vertex*influences; offset < (vertex+1)*influences; offset++) {
      point.addScaledVector(influencePoint(source, indices[offset]), weights[offset]);
    }
    positions.setXYZ(vertex, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function makeHandTendonSkin(geometry: BufferGeometry, segments: readonly Segment[]) {
  const axes = segments.map(({ start, end }) => end.clone().sub(start));
  const point = new Vector3();
  return bindSkin(geometry, segments.map((_, index) => index), (position, id) => {
    const axis = axes[id], base = segments[id].start;
    const along = Math.max(0, Math.min(1, point.subVectors(position, base).dot(axis)/axis.lengthSq()));
    return position.distanceToSquared(point.copy(base).addScaledVector(axis, along));
  });
}

export function updateHandTendonSkin(skin: Skin, localFits: readonly (Matrix4 | null)[]) {
  const point = new Vector3();
  deform(skin, (source, id) => {
    const fit = localFits[id];
    return fit ? point.copy(source).applyMatrix4(fit) : source;
  });
  skin.geometry.computeBoundingBox();
  skin.geometry.computeBoundingSphere();
}

export function makeFaceMuscleSkin(geometry: BufferGeometry, id: string) {
  const controls = controlsByMuscle[id];
  if (!controls) return undefined;
  return bindSkin(geometry, controls, (point, index) => {
    const control = controlPoints.get(index)!;
    return (point.x-control.x)**2+(point.y-control.y)**2+.2*(point.z-control.z)**2;
  });
}

/** Measure expression motion in head-local space so the rigid face fit remains the base pose. */
export function faceMuscleMotion(points: readonly BodyPoint[], aspect: number, fit: Matrix4, visibility: number) {
  const inverse = fit.clone().invert();
  const offsets = new Map<number, Vector3>();
  for (const [index, rest] of controlPoints) {
    const point = points[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const offset = videoPoint(point, aspect, points[4]?.z ?? 0).applyMatrix4(inverse).sub(rest);
    // The normalized landmark z is approximate. Limit that component to preserve thickness.
    offset.z = Math.max(-.012, Math.min(.012, offset.z))*.45;
    offsets.set(index, offset.clampLength(0, .022).multiplyScalar(visibility));
  }
  return offsets;
}

export function smoothFaceMotion(current: Map<number, Vector3>, next: ReadonlyMap<number, Vector3>, alpha: number) {
  let moved = false;
  for (const [index, offset] of next) {
    const before = current.get(index);
    if (!before) { current.set(index, offset); moved = true; continue; }
    if (before.distanceToSquared(offset) < .00015**2) continue;
    before.lerp(offset, alpha);
    moved = true;
  }
  return moved;
}

export function updateFaceMuscleSkin(skin: Skin, offsets: ReadonlyMap<number, Vector3>) {
  const point = new Vector3();
  deform(skin, (source, id) => {
    const offset = offsets.get(id);
    return offset ? point.copy(source).add(offset) : source;
  });
}

export function regionalSurfaceVertices(mesh: Mesh) {
  const positions = mesh.geometry.getAttribute('position');
  const point = new Vector3();
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  const center = bounds.getCenter(new Vector3());
  const extent = bounds.getSize(new Vector3());
  const bilateral = ['orbicularis_oculi', 'zygomaticus_major', 'masseter', 'temporalis', 'buccinator'].includes(mesh.name);
  const shifts = bilateral ? [-.32, .32] : [0];
  return shifts.map(shift => {
    let vertex = 0, minimum = Infinity;
    const x = center.x+extent.x*shift;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      const distance = (point.x-x)**2+(point.y-center.y)**2+.22*(point.z-bounds.max.z)**2;
      if (distance < minimum) { minimum = distance; vertex = i; }
    }
    return vertex;
  });
}

export function makeMouthOpening() {
  const center = { value: new Vector2() }, radius = { value: new Vector2(1, 1) };
  const axis = { value: new Vector2(1, 0) };

  function clip(material: MeshStandardMaterial) {
    material.onBeforeCompile = shader => {
      shader.uniforms.anatomyMouthCenter = center;
      shader.uniforms.anatomyMouthRadius = radius;
      shader.uniforms.anatomyMouthAxis = axis;
      shader.vertexShader = `varying vec2 vAnatomyMouthPosition;\n${shader.vertexShader}`.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvAnatomyMouthPosition = (modelMatrix * vec4(transformed, 1.0)).xy;',
      );
      shader.fragmentShader = `uniform vec2 anatomyMouthCenter;
        uniform vec2 anatomyMouthRadius;
        uniform vec2 anatomyMouthAxis;
        varying vec2 vAnatomyMouthPosition;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>',
        `vec2 mouthOffset = vAnatomyMouthPosition - anatomyMouthCenter;
        vec2 mouthSide = vec2(-anatomyMouthAxis.y, anatomyMouthAxis.x);
        vec2 mouthLocal = vec2(dot(mouthOffset, anatomyMouthAxis), dot(mouthOffset, mouthSide));
        if (length(mouthLocal / anatomyMouthRadius) < 0.94) discard;
        #include <opaque_fragment>`,
      );
    };
    material.customProgramCacheKey = () => 'anatomy-mouth-opening';
  }

  function align(landmarks: readonly BodyPoint[], aspect: number) {
    const [left, right, upper, lower] = [78, 308, 13, 14].map(index => landmarks[index]);
    if (![left, right, upper, lower].every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y))) return;
    const horizontal = new Vector2((right.x-left.x)*aspect, left.y-right.y);
    const width = horizontal.length();
    axis.value.copy(horizontal).normalize();
    const height = Math.abs((lower.x-upper.x)*aspect*axis.value.y + (lower.y-upper.y)*axis.value.x);
    center.value.set((upper.x+lower.x)*aspect/2, 1-(upper.y+lower.y)/2);
    radius.value.set(Math.max(.0001, width*.53), Math.max(.0001, height*.57));
  }

  function visibleAt(point: Vector3) {
    const x = point.x-center.value.x, y = point.y-center.value.y;
    const horizontal = (x*axis.value.x+y*axis.value.y)/radius.value.x;
    const vertical = (-x*axis.value.y+y*axis.value.x)/radius.value.y;
    return Math.hypot(horizontal, vertical) >= .94;
  }

  return { align, clip, visibleAt };
}

export function makeBrainWindow() {
  const center = { value: new Vector2() }, radius = { value: new Vector2(1, 1) };
  const up = { value: new Vector2(0, 1) };
  const window = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vWindowUv;
      void main() {
        vWindowUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec2 vWindowUv;
      void main() {
        float r = length(vWindowUv);
        float feather = 1.0 - smoothstep(0.86, 1.0, r);
        float border = smoothstep(0.81, 0.92, r);
        vec3 rim = mix(vec3(0.14, 0.10, 0.13), vec3(0.72, 0.77, 0.73), border);
        gl_FragColor = vec4(rim, mix(0.38, 0.72, border) * feather);
      }`,
  }));
  window.name = 'brain-window';
  window.frustumCulled = false;

  function clip(material: MeshStandardMaterial) {
    material.transparent = true;
    material.onBeforeCompile = shader => {
      shader.uniforms.anatomyWindowCenter = center;
      shader.uniforms.anatomyWindowRadius = radius;
      shader.uniforms.anatomyWindowUp = up;
      shader.vertexShader = `varying vec2 vAnatomyWindowPosition;\n${shader.vertexShader}`.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvAnatomyWindowPosition = (modelMatrix * vec4(transformed, 1.0)).xy;',
      );
      shader.fragmentShader = `uniform vec2 anatomyWindowCenter;
        uniform vec2 anatomyWindowRadius;
        uniform vec2 anatomyWindowUp;
        varying vec2 vAnatomyWindowPosition;\n${shader.fragmentShader}`.replace(
        '#include <opaque_fragment>',
        `vec2 windowOffset = vAnatomyWindowPosition - anatomyWindowCenter;
        vec2 windowRight = vec2(anatomyWindowUp.y, -anatomyWindowUp.x);
        vec2 windowLocal = vec2(dot(windowOffset, windowRight), dot(windowOffset, anatomyWindowUp));
        float anatomyWindowEdge = length(windowLocal / anatomyWindowRadius);
        diffuseColor.a *= 0.91 * (1.0 - smoothstep(0.80, 0.96, anatomyWindowEdge));
        if (diffuseColor.a < 0.01) discard;
        #include <opaque_fragment>`,
      );
    };
    material.customProgramCacheKey = () => 'anatomy-cranial-window';
  }

  function align(mesh: Mesh, eyes: Vector3, forehead: Vector3) {
    const projectedCenter = new Vector3(0, 1.592, .080).applyMatrix4(mesh.matrix);
    const rise = up.value.set(forehead.x-eyes.x, forehead.y-eyes.y).length();
    if (rise < .005) return 0;
    up.value.multiplyScalar(1/rise);
    const right = new Vector2(up.value.y, -up.value.x);
    const matrix = mesh.matrix.elements;
    const horizontalExtent = Math.hypot(
      (matrix[0]*right.x+matrix[1]*right.y)*.077,
      (matrix[4]*right.x+matrix[5]*right.y)*.067,
      (matrix[8]*right.x+matrix[9]*right.y)*.098,
    );
    const depth = Math.hypot(matrix[2]*.077, matrix[6]*.067, matrix[10]*.098);
    const side = (projectedCenter.x-eyes.x)*right.x+(projectedCenter.y-eyes.y)*right.y;
    // Track the brow and hairline so the opening never reaches the eyes.
    center.value.set(eyes.x, eyes.y).addScaledVector(up.value, rise*.64)
      .addScaledVector(right, Math.max(-horizontalExtent*.55, Math.min(horizontalExtent*.55, side)));
    radius.value.set(horizontalExtent, rise*.53);
    window.position.set(center.value.x, center.value.y, projectedCenter.z-depth-.005);
    window.rotation.z = Math.atan2(-up.value.x, up.value.y);
    window.scale.set(radius.value.x, radius.value.y, 1);
    return Math.max(0, center.value.clone().sub(new Vector2(eyes.x, eyes.y)).dot(up.value)-radius.value.y);
  }

  function visibleAt(point: Vector3) {
    const x = point.x-center.value.x, y = point.y-center.value.y;
    return Math.hypot((x*up.value.y-y*up.value.x)/radius.value.x, (x*up.value.x+y*up.value.y)/radius.value.y) < .95;
  }

  return { window, clip, align, visibleAt };
}
