export interface BodyPoint { x: number; y: number; visibility?: number }
export type Matrix = [number, number, number, number, number, number];
export type AnatomyLayer = 'muscles' | 'bones' | 'organs';
export interface AnatomyPart { id: string; layer: AnatomyLayer; en: string; es: string; description: string }
export const anatomyParts: AnatomyPart[] = [
  { id: 'skull', layer: 'bones', en: 'Skull', es: 'Cráneo', description: 'The bones of the head protect the brain.' },
  { id: 'mandible', layer: 'bones', en: 'Mandible', es: 'Mandíbula', description: 'The movable lower jaw holds the lower teeth.' },
  { id: 'clavicle', layer: 'bones', en: 'Clavicle', es: 'Clavícula', description: 'This bone connects the breastbone to the shoulder.' },
  { id: 'sternum', layer: 'bones', en: 'Sternum', es: 'Esternón', description: 'The breastbone supports the front of the rib cage.' },
  { id: 'ribs', layer: 'bones', en: 'Ribs', es: 'Costillas', description: 'These curved bones protect the organs in the chest.' },
  { id: 'spine', layer: 'bones', en: 'Spine', es: 'Columna vertebral', description: 'The vertebrae support the trunk and surround the spinal cord.' },
  { id: 'pelvis', layer: 'bones', en: 'Pelvis', es: 'Pelvis', description: 'The bony ring helps transfer weight from the trunk to the legs.' },
  { id: 'humerus', layer: 'bones', en: 'Humerus', es: 'Húmero', description: 'The upper arm bone runs from the shoulder to the elbow.' },
  { id: 'radius', layer: 'bones', en: 'Radius', es: 'Radio', description: 'This forearm bone lies on the thumb side.' },
  { id: 'ulna', layer: 'bones', en: 'Ulna', es: 'Cúbito', description: 'This forearm bone lies on the little finger side.' },
  { id: 'femur', layer: 'bones', en: 'Femur', es: 'Fémur', description: 'The thigh bone connects the hip and knee.' },
  { id: 'patella', layer: 'bones', en: 'Patella', es: 'Rótula', description: 'The kneecap protects the front of the knee joint.' },
  { id: 'tibia', layer: 'bones', en: 'Tibia', es: 'Tibia', description: 'The shinbone carries most of the lower leg’s weight.' },
  { id: 'fibula', layer: 'bones', en: 'Fibula', es: 'Peroné', description: 'This thin lower leg bone helps stabilize the ankle.' },
  { id: 'pectoralis_major', layer: 'muscles', en: 'Pectoralis major', es: 'Pectoral mayor', description: 'This chest muscle moves the upper arm toward and across the body.' },
  { id: 'deltoid', layer: 'muscles', en: 'Deltoid', es: 'Deltoides', description: 'The shoulder muscle helps lift the arm out to the side.' },
  { id: 'biceps_brachii', layer: 'muscles', en: 'Biceps brachii', es: 'Bíceps braquial', description: 'The front upper arm muscle bends the elbow and turns the palm upward.' },
  { id: 'triceps_brachii', layer: 'muscles', en: 'Triceps brachii', es: 'Tríceps braquial', description: 'The rear upper arm muscle straightens the elbow.' },
  { id: 'rectus_abdominis', layer: 'muscles', en: 'Rectus abdominis', es: 'Recto abdominal', description: 'This paired abdominal muscle bends the trunk forward.' },
  { id: 'external_oblique', layer: 'muscles', en: 'External oblique', es: 'Oblicuo externo', description: 'This abdominal muscle helps rotate the trunk.' },
  { id: 'quadriceps_femoris', layer: 'muscles', en: 'Quadriceps femoris', es: 'Cuádriceps femoral', description: 'Four muscles at the front of the thigh work together to straighten the knee.' },
  { id: 'sartorius', layer: 'muscles', en: 'Sartorius', es: 'Sartorio', description: 'This long muscle crosses the thigh diagonally and helps move the hip and knee.' },
  { id: 'gastrocnemius', layer: 'muscles', en: 'Gastrocnemius', es: 'Gastrocnemio', description: 'This calf muscle helps lift the heel and bend the knee.' },
  { id: 'tibialis_anterior', layer: 'muscles', en: 'Tibialis anterior', es: 'Tibial anterior', description: 'This muscle at the front of the shin lifts the foot at the ankle.' },
  { id: 'brain', layer: 'organs', en: 'Brain', es: 'Cerebro', description: 'This organ processes information and coordinates movement and other functions.' },
  { id: 'lungs', layer: 'organs', en: 'Lungs', es: 'Pulmones', description: 'The lungs exchange oxygen and carbon dioxide with the blood.' },
  { id: 'heart', layer: 'organs', en: 'Heart', es: 'Corazón', description: 'This muscle pumps blood through the lungs and the rest of the body.' },
  { id: 'liver', layer: 'organs', en: 'Liver', es: 'Hígado', description: 'The liver processes nutrients and produces bile.' },
  { id: 'stomach', layer: 'organs', en: 'Stomach', es: 'Estómago', description: 'This hollow organ mixes food with digestive juices.' },
  { id: 'small_intestine', layer: 'organs', en: 'Small intestine', es: 'Intestino delgado', description: 'Most nutrients enter the body through this part of the digestive tract.' },
  { id: 'large_intestine', layer: 'organs', en: 'Large intestine', es: 'Intestino grueso', description: 'This part of the digestive tract absorbs water and forms stool.' },
  { id: 'kidneys', layer: 'organs', en: 'Kidneys', es: 'Riñones', description: 'The kidneys filter the blood and produce urine.' },
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
