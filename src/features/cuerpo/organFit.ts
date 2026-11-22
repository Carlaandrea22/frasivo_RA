type Vector = readonly [number, number, number];
type OrganFit = { scale: Vector; offset: Vector };

// Adjusted in the BodyParts3D torso frame (metres, +X anatomical left,
// +Y superior, +Z anterior). Both views use these same proportions.
const organFits: Readonly<Partial<Record<string, OrganFit>>> = {
  // Extend toward the diaphragm, with the lung apices held near 1.38 m.
  lungs: { scale: [1.165, 1.12, 1], offset: [0, -.1656, 0] },
  heart: { scale: [.93, 1, 1], offset: [.011, -.014, .012] },
  liver: { scale: [1.052, 1, 1], offset: [-.024, -.016, 0] },
  stomach: { scale: [1, 1, 1], offset: [.017, -.008, 0] },
  small_intestine: { scale: [1.1, 1.025, 1], offset: [0, -.029675, 0] },
  large_intestine: { scale: [1.055, 1.035, 1], offset: [0, -.02674, 0] },
};

export function organFit(id: string) {
  return organFits[id];
}

export function fittedOrganSprite(id: string, bounds: readonly number[]): readonly number[] {
  const fit = organFit(id);
  if (!fit) return bounds;
  const [x, y, width, height] = bounds;
  const [sx, sy] = fit.scale;
  const [dx, dy] = fit.offset;
  return [x*sx + dx, y*sy - dy, width*sx, height*sy];
}
