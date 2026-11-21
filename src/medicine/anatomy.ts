export interface BodyPoint { x: number; y: number; visibility?: number }
export type Matrix = [number, number, number, number, number, number];
export type AnatomyLayer = 'muscles' | 'bones' | 'organs';
export interface AnatomyPart { id: string; layer: AnatomyLayer; en: string; es: string; description: string }
export const anatomyParts: AnatomyPart[] = [
  { id: 'pectorals', layer: 'muscles', en: 'Pectorals', es: 'Pectorales', description: 'Músculos del pecho que participan en los movimientos del brazo.' },
  { id: 'biceps', layer: 'muscles', en: 'Biceps', es: 'Bíceps', description: 'Músculo de la parte anterior del brazo que ayuda a flexionar el codo.' },
  { id: 'abdominals', layer: 'muscles', en: 'Abdominals', es: 'Abdominales', description: 'Grupo muscular que ayuda a mover y estabilizar el tronco.' },
  { id: 'quadriceps', layer: 'muscles', en: 'Quadriceps', es: 'Cuádriceps', description: 'Grupo muscular anterior del muslo que participa en la extensión de la rodilla.' },
  { id: 'skull', layer: 'bones', en: 'Skull', es: 'Cráneo', description: 'Conjunto de huesos de la cabeza que protege el cerebro.' },
  { id: 'ribs', layer: 'bones', en: 'Ribs', es: 'Costillas', description: 'Huesos curvos del tórax que ayudan a proteger el corazón y los pulmones.' },
  { id: 'spine', layer: 'bones', en: 'Spine', es: 'Columna vertebral', description: 'Serie de vértebras que sostiene el tronco y protege la médula espinal.' },
  { id: 'pelvis', layer: 'bones', en: 'Pelvis', es: 'Pelvis', description: 'Estructura ósea que une el tronco con las extremidades inferiores.' },
  { id: 'humerus', layer: 'bones', en: 'Humerus', es: 'Húmero', description: 'Hueso del brazo situado entre el hombro y el codo.' },
  { id: 'femur', layer: 'bones', en: 'Femur', es: 'Fémur', description: 'Hueso del muslo situado entre la cadera y la rodilla.' },
  { id: 'tibia', layer: 'bones', en: 'Tibia', es: 'Tibia', description: 'Hueso de la pierna que transmite peso entre la rodilla y el tobillo.' },
  { id: 'lungs', layer: 'organs', en: 'Lungs', es: 'Pulmones', description: 'Órganos del tórax donde se intercambian oxígeno y dióxido de carbono.' },
  { id: 'heart', layer: 'organs', en: 'Heart', es: 'Corazón', description: 'Órgano muscular del tórax que impulsa la sangre por el cuerpo.' },
  { id: 'liver', layer: 'organs', en: 'Liver', es: 'Hígado', description: 'Órgano de la parte superior derecha del abdomen que procesa nutrientes y produce bilis.' },
  { id: 'stomach', layer: 'organs', en: 'Stomach', es: 'Estómago', description: 'Órgano de la parte superior izquierda del abdomen que mezcla los alimentos con jugos digestivos.' },
  { id: 'intestines', layer: 'organs', en: 'Intestines', es: 'Intestinos', description: 'Órganos abdominales que participan en la digestión, la absorción de nutrientes y la formación de heces.' },
];
function visible(p: BodyPoint | undefined): p is BodyPoint {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= -.1 && p.x <= 1.1 && p.y >= -.1 && p.y <= 1.1 && (p.visibility ?? 0) >= .6;
}
// SVG local units: trunk is 100 × 100, limbs run from (0,0) to (0,100).
// Camera and SVG share the exact video aspect ratio, with no cropping/mirroring.
export function torsoTransform(points: BodyPoint[]): Matrix | null {
  const left = points[12], right = points[11], hl = points[24], hr = points[23];
  if (![left, right, hl, hr].every(visible)) return null;
  const dx = right.x - left.x, dy = right.y - left.y;
  const vx = (hl.x + hr.x - left.x - right.x) / 2, vy = (hl.y + hr.y - left.y - right.y) / 2;
  if (Math.abs(dx * vy - dy * vx) < .003) return null;
  return [dx * 10, dy * 10, vx * 10, vy * 10, left.x * 1000, left.y * 1000];
}
export function segmentTransform(points: BodyPoint[], from: number, to: number): Matrix | null {
  const a = points[from], b = points[to];
  if (!visible(a) || !visible(b)) return null;
  const dx = (b.x - a.x) * 10, dy = (b.y - a.y) * 10;
  if (Math.hypot(dx, dy) < .15) return null;
  return [dy, -dx, dx, dy, a.x * 1000, a.y * 1000];
}
export const demoPose: BodyPoint[] = Array.from({ length: 33 }, () => ({ x: .5, y: .1, visibility: 0 }));
for (const [i, x, y] of [[0,.5,.12],[7,.55,.115],[8,.45,.115],[11,.62,.24],[12,.38,.24],[13,.7,.4],[14,.3,.4],[15,.75,.56],[16,.25,.56],[23,.58,.53],[24,.42,.53],[25,.6,.73],[26,.4,.73],[27,.62,.94],[28,.38,.94]]) demoPose[i] = { x, y, visibility: 1 };
